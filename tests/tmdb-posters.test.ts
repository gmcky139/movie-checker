import type { AppData, Movie } from "../src/domain/types";
import type { TmdbApi } from "../scripts/tmdb-client";
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

function data(movies: Movie[]): AppData {
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
}

describe("conservative TMDB poster matching", () => {
  beforeEach(() => vi.spyOn(console, "log").mockImplementation(() => undefined));
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
    expect(selectCandidate(source, [{ ...exact, releaseYear: 2025 }])).toBeUndefined();
    expect(selectCandidate(source, [{ ...exact, posterPath: null }])).toBeUndefined();
    expect(selectCandidate(source, [{ ...exact, title: "作品AB" }])).toBeUndefined();
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

  it("reports unmatched titles and fails below 70% without choosing a wrong poster", async () => {
    const api = new FakeApi({ A: [candidate(1, "A")], B: [], C: [] });
    const reported = await enrichMoviesWithTmdb(data([movie("A"), movie("B"), movie("C")]), {
      api,
      overrides: {},
      minimumCoverage: 0,
    });
    expect(reported.posterCoverage).toMatchObject({
      eligibleCount: 3,
      matchedCount: 1,
      coveragePercent: 33.3,
      unmatchedTitles: ["B", "C"],
    });
    await expect(
      enrichMoviesWithTmdb(data([movie("A"), movie("B"), movie("C")]), {
        api: new FakeApi({ A: [candidate(1, "A")], B: [], C: [] }),
        overrides: {},
      }),
    ).rejects.toThrow(/33.3%.*70%/u);
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
