import type { Movie } from "../src/domain/types";
import type { NormalizedRealData } from "../scripts/normalize-movies";
import type { TmdbApi } from "../scripts/tmdb-client";
import { TMDB_MATCH_RULES, TMDB_OVERRIDES, tmdbSearchTitle } from "../scripts/tmdb-overrides";
import {
  buildPosterUrl,
  choosePosterSize,
  enrichMoviesWithTmdb,
  selectCandidate,
} from "../scripts/tmdb-posters";

const configuration = {
  images: {
    secure_base_url: "https://image.tmdb.org/t/p/",
    poster_sizes: ["w342", "w500", "original"],
  },
};

function movie(title: string): Movie {
  return {
    id: `movie-${title.length}`,
    title,
    genres: [],
    posterPath: "images/posters/placeholder.svg",
    posterSource: "local",
    posterMatchStatus: "unmatched",
  };
}

function data(movies: NormalizedRealData["movies"]): NormalizedRealData {
  return {
    schemaVersion: 1,
    dataMode: "real",
    generatedAt: "2026-08-04T00:00:00.000Z",
    timezone: "Asia/Tokyo",
    sources: [],
    dates: [],
    movies,
    theaters: [],
    screenings: [],
  };
}

function candidate(
  id: number,
  title: string,
  releaseDate = "2026-01-01",
  originalTitle = title,
): Record<string, unknown> {
  return {
    id,
    title,
    original_title: originalTitle,
    release_date: releaseDate,
    poster_path: `/poster-${id}.jpg`,
    adult: false,
  };
}

class FakeApi implements TmdbApi {
  constructor(
    private readonly results: Record<string, unknown[]> = {},
    private readonly details: Record<number, unknown> = {},
    private readonly translations: Record<number, unknown[]> = {},
  ) {}

  async configuration(): Promise<unknown> {
    return configuration;
  }

  async searchMovie(query: string): Promise<unknown> {
    return { results: this.results[query] ?? [] };
  }

  async movie(id: number): Promise<unknown> {
    return this.details[id] ?? {};
  }

  async movieTranslations(id: number): Promise<unknown> {
    return { id, translations: this.translations[id] ?? [] };
  }
}

describe("conservative TMDB poster matching", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });
  afterEach(() => vi.restoreAllMocks());

  it("accepts one exact normalized title or original-title match with the requested year", () => {
    const selected = selectCandidate({ ...movie("作品A"), releaseDate: "2026-04-01" }, [
      {
        id: 1,
        title: "別作品",
        originalTitle: "作品Ａ",
        posterPath: "/a.jpg",
        releaseYear: 2026,
        adult: false,
      },
    ]);
    expect(selected?.id).toBe(1);
  });

  it("rejects ambiguous, year-mismatched, posterless, and fuzzy-only candidates", () => {
    const source = { ...movie("作品A"), releaseDate: "2026-04-01" };
    const exact = {
      id: 1,
      title: "作品A",
      originalTitle: "",
      posterPath: "/a.jpg",
      releaseYear: 2026,
      adult: false,
    };
    expect(selectCandidate(source, [exact, { ...exact, id: 2 }])).toBeUndefined();
    expect(selectCandidate(source, [exact, { ...exact, id: 2, posterPath: null }])).toBeUndefined();
    expect(selectCandidate(source, [{ ...exact, releaseYear: 2025 }])).toBeUndefined();
    expect(selectCandidate(source, [{ ...exact, posterPath: null }])).toBeUndefined();
    expect(selectCandidate(source, [{ ...exact, title: "作品AB" }])).toBeUndefined();
  });

  it("uses the shared poster for equivalent records regardless of search result order", async () => {
    const title = "作品A 第七章";
    const duplicate = {
      ...candidate(2, "作品A　第七章", "2026-10-30"),
      poster_path: "/poster-1.jpg",
    };
    const first = candidate(1, title, "2026-10-30");
    for (const results of [
      [duplicate, first],
      [first, duplicate],
    ]) {
      const result = await enrichMoviesWithTmdb(data([movie(title)]), {
        api: new FakeApi({ [title]: results }),
      });
      expect(result.movies[0]).toMatchObject({
        tmdbId: 1,
        posterPath: "https://image.tmdb.org/t/p/w500/poster-1.jpg",
        posterMatchStatus: "matched",
      });
    }
  });

  it("keeps matches separate when duplicate evidence is missing or differs", () => {
    const source = movie("作品A");
    const exact = {
      id: 1,
      title: "作品A",
      originalTitle: "Work A",
      posterPath: "/a.jpg",
      releaseDate: "2026-10-30",
      releaseYear: 2026,
      adult: false,
    };
    for (const change of [
      { releaseDate: undefined },
      { releaseDate: "2026-10-31" },
      { posterPath: "/b.jpg" },
      { originalTitle: "Work B" },
      { title: "作品A!" },
    ]) {
      expect(selectCandidate(source, [exact, { ...exact, ...change, id: 2 }])).toBeUndefined();
    }
  });

  it("tries a verified alternate query once when the Japanese search fails and corroborates both titles", async () => {
    const api = new FakeApi({
      "Wide Sky": [
        candidate(1, "別の空", "2026-01-01", "Wide Sky"),
        candidate(2, "大空", "2026-01-01", "Wide Sky"),
        candidate(3, "大空", "2026-01-01", "Other Sky"),
      ],
      別の作品: [candidate(4, "別の作品")],
    });
    const search = vi.spyOn(api, "searchMovie");
    const result = await enrichMoviesWithTmdb(
      data([
        { ...movie("大空"), alternateTitle: "Wide Sky" },
        { ...movie("別の作品"), alternateTitle: "Another Work" },
      ]),
      { api },
    );
    expect(result.movies.map((item) => item.tmdbId)).toEqual([2, 4]);
    expect(result.movies[0]).not.toHaveProperty("alternateTitle");
    expect(search).toHaveBeenCalledTimes(3);
    expect(search).toHaveBeenCalledWith("大空");
    expect(search).toHaveBeenCalledWith("Wide Sky");
    expect(search).not.toHaveBeenCalledWith("Another Work");
  });

  it("keeps the placeholder when a shortened alternate title only matches a different release", async () => {
    const api = new FakeApi({
      "First Story": [candidate(1, "最初の物語", "2026-01-01", "First Story")],
      別の作品: [candidate(2, "別の作品")],
    });
    const result = await enrichMoviesWithTmdb(
      data([{ ...movie("最初の物語 第2章"), alternateTitle: "First Story" }, movie("別の作品")]),
      { api },
    );
    expect(result.movies[0]).toMatchObject({
      posterMatchStatus: "unmatched",
      posterSource: "local",
    });
  });

  it("publishes nonempty Japanese overviews only for confirmed TMDB IDs", async () => {
    const api = new FakeApi(
      { A: [{ ...candidate(1, "A"), overview: "検索結果の本文" }], B: [candidate(2, "B")] },
      { 3: candidate(3, "C") },
      {
        1: [
          { iso_639_1: "en", iso_3166_1: "US", data: { overview: "English summary" } },
          { iso_639_1: "ja", iso_3166_1: "US", data: { overview: "日本語の別地域版" } },
          { iso_639_1: "ja", iso_3166_1: "JP", data: { overview: "  日本向けのあらすじ。  " } },
        ],
        2: [
          { iso_639_1: "en", iso_3166_1: "US", data: { overview: "English only" } },
          { iso_639_1: "ja", iso_3166_1: "JP", data: { overview: "  " } },
        ],
        3: [{ iso_639_1: "ja", iso_3166_1: "US", data: { overview: "日本語のあらすじ。" } }],
      },
    );
    const translations = vi.spyOn(api, "movieTranslations");
    const result = await enrichMoviesWithTmdb(
      data([movie("A"), movie("B"), movie("C"), movie("D")]),
      {
        api,
        overrides: { C: 3 },
      },
    );

    expect(result.movies.map((item) => item.synopsis)).toEqual([
      "日本向けのあらすじ。",
      undefined,
      "日本語のあらすじ。",
      undefined,
    ]);
    expect(result.movies[1]?.posterMatchStatus).toBe("matched");
    expect(translations.mock.calls.map(([id]) => id).sort()).toEqual([1, 2, 3]);
  });

  it("rejects translation responses for a different movie ID", async () => {
    const api = new FakeApi({ A: [candidate(1, "A")] });
    vi.spyOn(api, "movieTranslations").mockResolvedValue({ id: 2, translations: [] });
    await expect(enrichMoviesWithTmdb(data([movie("A")]), { api })).rejects.toThrow(
      /Invalid TMDB movie translations for ID 1/u,
    );
  });

  it("uses managed aliases, numeric overrides, null exclusions, and local fallback", async () => {
    const api = new FakeApi(
      { alias: [candidate(10, "正式作品名")] },
      { 20: candidate(20, "人間確認済み作品") },
    );
    const result = await enrichMoviesWithTmdb(
      data([movie("別名"), movie("確認済み"), movie("中継")]),
      {
        api,
        rules: { 別名: { query: "alias", acceptedTitles: ["正式作品名"] } },
        overrides: { 確認済み: 20, 中継: null },
        minimumCoverage: 100,
      },
    );
    expect(result.movies.map((item) => item.posterMatchStatus)).toEqual([
      "matched",
      "matched",
      "not-applicable",
    ]);
    expect(result.movies[0]?.posterPath).toBe("https://image.tmdb.org/t/p/w500/poster-10.jpg");
    expect(result.movies[2]).toMatchObject({
      posterPath: "images/posters/placeholder.svg",
      posterSource: "local",
    });
    expect(result.posterCoverage).toEqual({
      eligibleCount: 2,
      matchedCount: 2,
      notApplicableCount: 1,
      coveragePercent: 100,
      unmatchedTitles: [],
    });
  });

  it("removes reviewed screening decorations without expanding truncated titles", () => {
    expect(tmdbSearchTitle("『だぁれかさんとアソぼ?』絶叫上映")).toBe("だぁれかさんとアソぼ?");
    expect(tmdbSearchTitle("パプリカ 4Kリマスター版")).toBe("パプリカ");
    expect(tmdbSearchTitle("『ブリジット・ジョーンズの日記』4Kレストア")).toBe(
      "ブリジット・ジョーンズの日記",
    );
    expect(tmdbSearchTitle("ラブ・アクチュアリー 4K(午前十時の映画祭16)")).toBe(
      "ラブ・アクチュアリー",
    );
    expect(tmdbSearchTitle("超かぐや姫![SCREENX][ODS]")).toBe("超かぐや姫!");
    expect(tmdbSearchTitle("作品A 再上映")).toBe("作品A");
    expect(tmdbSearchTitle("作品A[字幕・SCREENX]")).toBe("作品A");
    expect(tmdbSearchTitle("作品A 舞台挨拶中継")).toBe("作品A");
    expect(tmdbSearchTitle("怪談(午前十時の映画祭16)")).toBe("怪談");
    expect(tmdbSearchTitle("月イチ35mmフィルム上映 『魔性の夏 四谷怪談より』")).toBe(
      "魔性の夏 四谷怪談より",
    );
    expect(tmdbSearchTitle("スパイダーマン...[SCREENX・吹替][グリーティング付]")).toBe(
      "スパイダーマン...",
    );
  });

  it("matches current restorations, abbreviated official titles, and reviewed alternate names", async () => {
    const api = new FakeApi(
      {
        "ブリジット・ジョーンズの日記": [
          candidate(1272149, "ブリジット・ジョーンズの日記 サイテー最高な私の今", "2025-02-14"),
          candidate(634, "ブリジット・ジョーンズの日記", "2001-09-22"),
        ],
        "ラブ・アクチュアリー": [candidate(508, "ラブ・アクチュアリー", "2004-02-07")],
        "超かぐや姫!": [candidate(1575337, "超かぐや姫！")],
        "仮面ライダーカブト20th 天を継ぐもの": [
          candidate(1567149, "仮面ライダーカブト20th 天を継ぐもの"),
        ],
        하이재킹: [candidate(1147710, "하이재킹", "2026-10-23")],
      },
      { 1575872: candidate(1575872, "Mentor", "2026-10-16") },
    );
    const result = await enrichMoviesWithTmdb(
      data([
        movie("ブリジット・ジョーンズの日記 4Kレストア"),
        movie("ラブ・アクチュアリー 4K(午前十時の映画祭16)"),
        movie("超かぐや姫![SCREENX][ODS]"),
        {
          ...movie("Vシネクスト「仮面ライダーカブト20th 天を...[ODS]"),
          officialUrl: "https://109cinemas.net/movies/5754.html",
        },
        movie("1971、ハイジャック事件"),
        movie("mentor"),
      ]),
      { api },
    );
    expect(result.movies.map((item) => item.tmdbId)).toEqual([
      634, 508, 1575337, 1567149, 1147710, 1575872,
    ]);
  });

  it("matches ジャイアント to the 2026 filmed play among similarly named works", async () => {
    const result = await enrichMoviesWithTmdb(data([movie("ジャイアント")]), {
      api: new FakeApi({
        "Giant - The Play": [
          candidate(1078581, "Giant", "2026-01-09"),
          candidate(1694097, "Giant - The Play", "2026-11-19"),
          candidate(1712, "ジャイアンツ", "1956-12-22", "Giant"),
        ],
      }),
    });
    expect(result.movies[0]).toMatchObject({
      title: "ジャイアント",
      tmdbId: 1694097,
      posterPath: "https://image.tmdb.org/t/p/w500/poster-1694097.jpg",
      posterMatchStatus: "matched",
    });
  });

  it("requires the verified official work link before assigning the 2026 Resident Evil poster", async () => {
    const source = movie("バイオハザード");
    const result = await enrichMoviesWithTmdb(
      data([
        { ...source, officialUrl: "https://109cinemas.net/movies/5682.html" },
        { ...source, officialUrl: "https://109cinemas.net/movies/1234.html" },
        source,
      ]),
      {
        api: new FakeApi({
          バイオハザード: [
            candidate(1576, "バイオハザード", "2002-08-31", "Resident Evil"),
            candidate(1423191, "バイオハザード", "2026-10-09", "Resident Evil"),
          ],
        }),
      },
    );
    expect(result.movies.map((item) => item.tmdbId)).toEqual([1423191, undefined, undefined]);
    expect(result.movies.slice(1).map((item) => item.posterMatchStatus)).toEqual([
      "unmatched",
      "unmatched",
    ]);
  });

  it("matches the reviewed movie IDs and excludes only a confirmed non-movie event", async () => {
    const api = new FakeApi(
      {
        パプリカ: [candidate(4977, "パプリカ", "2006-10-21")],
        "パウ・パトロール ザ・ダイノ・ムービー": [
          candidate(1185806, "パウ・パトロール ザ・ダイノ・ムービー", "2026-07-31"),
        ],
        "クレヨンしんちゃん 奇々怪々": [
          candidate(1598766, "クレヨンしんちゃん 奇々怪々!オラの妖怪バケ~ション", "2026-07-31"),
        ],
        怪談: [candidate(30959, "怪談", "1965-01-06"), candidate(73043, "怪談", "2007-08-04")],
        "魔性の夏 四谷怪談より": [candidate(299802, "魔性の夏 四谷怪談より", "1981-05-23")],
      },
      { 277834: candidate(277834, "モアナと伝説の海", "2016-11-23", "Moana") },
    );
    const result = await enrichMoviesWithTmdb(
      data([
        movie("パプリカ 4Kリマスター版"),
        movie("モアナと伝説の海"),
        movie("パウ・パトロール ザ・ダイノ・ムービー <ファミリーシアター>"),
        movie("映画クレヨンしんちゃん 奇々怪々!オラの妖怪バケーション"),
        movie("怪談(午前十時の映画祭16)"),
        movie("月イチ35mmフィルム上映 『魔性の夏 四谷怪談より』"),
        movie("NMIXX 1ST WORLD TOUR IN JAPAN LIVE VIEWING"),
      ]),
      { api, minimumCoverage: 100 },
    );
    expect(result.movies.map((item) => item.tmdbId)).toEqual([
      4977,
      277834,
      1185806,
      1598766,
      30959,
      299802,
      undefined,
    ]);
    expect(result.movies.at(-1)?.posterMatchStatus).toBe("not-applicable");
    expect(result.posterCoverage).toMatchObject({
      eligibleCount: 6,
      matchedCount: 6,
      notApplicableCount: 1,
      coveragePercent: 100,
    });
    expect(TMDB_OVERRIDES["モアナと伝説の海"]).toBe(277834);
    expect(TMDB_OVERRIDES["NMIXX 1ST WORLD TOUR IN JAPAN LIVE VIEWING"]).toBeNull();
    expect(
      TMDB_MATCH_RULES[
        "映画『仮面ライダーゼッツ さよならのミッション』/映画『超宇宙刑事ギャバン インフィニティ 太陽が泣いた日』"
      ],
    ).toBeUndefined();
  });

  it("warns below 70% and keeps unmatched titles on the local placeholder", async () => {
    const api = new FakeApi({ A: [candidate(1, "A")], B: [], C: [] });
    const reported = await enrichMoviesWithTmdb(data([movie("A"), movie("B"), movie("C")]), {
      api,
      overrides: {},
    });
    expect(reported.posterCoverage).toMatchObject({
      eligibleCount: 3,
      matchedCount: 1,
      coveragePercent: 33.3,
      unmatchedTitles: ["B", "C"],
    });
    expect(reported.movies.slice(1)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ posterPath: "images/posters/placeholder.svg" }),
      ]),
    );
    expect(console.warn).toHaveBeenCalledWith(expect.stringMatching(/WARNING.*33\.3%.*70%/u));
  });

  it("still fails when TMDB poster matching returns zero matches", async () => {
    await expect(
      enrichMoviesWithTmdb(data([movie("A"), movie("B")]), {
        api: new FakeApi({ A: [], B: [] }),
        overrides: {},
      }),
    ).rejects.toThrow(/zero matches/u);
  });

  it("selects w500 and rejects unsafe image settings", () => {
    expect(choosePosterSize(["w342", "w780"])).toBe("w342");
    expect(buildPosterUrl("https://image.tmdb.org/t/p/", "w500", "/safe.jpg")).toBe(
      "https://image.tmdb.org/t/p/w500/safe.jpg",
    );
    expect(() => buildPosterUrl("https://example.com/", "w500", "/safe.jpg")).toThrow(/allowlist/u);
    expect(() => buildPosterUrl("https://image.tmdb.org/t/p/", "w500", "/../x.jpg")).toThrow(
      /invalid/u,
    );
  });
});
