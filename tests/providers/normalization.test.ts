import {
  deterministicMovieId,
  normalizeMovieTitle,
  normalizeRealData,
} from "../../scripts/normalize-movies";
import type { DataSourceStatus, Theater } from "../../src/domain/types";
import type { RawScreening } from "../../scripts/providers/types";
import { validateAppData } from "../../scripts/validate-data";

function normalizeListings(titles: string[], reverse = false, alternateTitles: string[] = []) {
  const date = "2026-07-31";
  const screenings = titles.map((rawTitle, index): RawScreening => ({
    rawTitle,
    alternateTitle: alternateTitles[index],
    providerId: `provider-${index}`,
    theaterId: `theater-${index}`,
    theaterName: `映画館${index + 1}`,
    date,
    startTime: "10:00",
    endTime: "12:00",
    sourceUrl: "https://example.com/",
  }));
  return normalizeRealData(
    reverse ? screenings.reverse() : screenings,
    [],
    [date],
    "2026-07-31T00:00:00.000Z",
    [],
  );
}

describe("real movie normalization", () => {
  it("uses a consistent official alternate title after removing screening prefixes", () => {
    const same = ["IMAX]FILM A", "JPN Film A"];
    const inputs = ["映画A[IMAX]", "吹替 映画A"];
    const forward = normalizeListings(inputs, false, same);
    expect(forward.movies[0]?.alternateTitle).toMatch(/^film a$/iu);
    expect(normalizeListings(inputs, true, same)).toEqual(forward);
    expect(normalizeListings(inputs, false, ["Film A", "Film B"]).movies[0]).not.toHaveProperty(
      "alternateTitle",
    );
  });

  it("normalizes spacing and separates known presentation formats", () => {
    expect(normalizeMovieTitle("【字幕】  モアナと伝説の海 ")).toEqual({
      title: "モアナと伝説の海",
      formatLabel: "字幕",
    });
    expect(normalizeMovieTitle("モアナと伝説の海[SCREENX・字幕]")).toEqual({
      title: "モアナと伝説の海",
      formatLabel: "SCREENX・字幕",
    });
    expect(normalizeMovieTitle("モアナと伝説の海（字幕版）")).toEqual({
      title: "モアナと伝説の海",
      formatLabel: "字幕",
    });
    expect(normalizeMovieTitle("『Michael マイケル』")).toEqual({
      title: "Michael マイケル",
    });
    expect(normalizeMovieTitle("3D・日本語吹替  Michael/マイケル")).toEqual({
      title: "Michael マイケル",
      formatLabel: "3D・吹替",
    });
    expect(normalizeMovieTitle("字幕 SPIDER-MAN： BRAND NEW DAY")).toEqual({
      title: "Spider-Man: Brand New Day",
      formatLabel: "字幕",
    });
    expect(normalizeMovieTitle("スター･ウォーズ／マンダロリアン･アンド･グローグー")).toEqual({
      title: "スター・ウォーズ/マンダロリアン・アンド・グローグー",
    });
    expect(normalizeMovieTitle("スター・ウォーズ／マンダロリアン...[字幕][応援上映]")).toEqual({
      title: "スター・ウォーズ/マンダロリアン...",
      formatLabel: "字幕・応援上映",
    });
    expect(
      normalizeMovieTitle(
        "映画館デビュー) 映画『仮面ライダーゼッツ さよならのミッション』／映画『超宇宙刑事ギャバン インフィニティ 太陽が泣いた日』",
      ),
    ).toEqual({
      title:
        "映画『仮面ライダーゼッツ さよならのミッション』/映画『超宇宙刑事ギャバン インフィニティ 太陽が泣いた日』",
      formatLabel: "映画館デビュー",
    });
    expect(normalizeMovieTitle("仮面ライダーゼッツ／超宇宙刑事ギャバン")).toEqual({
      title:
        "映画『仮面ライダーゼッツ さよならのミッション』/映画『超宇宙刑事ギャバン インフィニティ 太陽が泣いた日』",
    });
  });

  it.each([
    ["GROTESQQQUE -グロテスク", "GROTESQQQUE グロテスク"],
    ["ヴェリティ 真実", "ヴェリティ/真実"],
    ["クリスマス・キャロル 3人のゴーストたち", "クリスマス・キャロル/3人のゴーストたち"],
    ["バッド・ルーテナント トウキョウ", "バッド・ルーテナント: トウキョウ"],
    ["劇場先行版「風を継ぐもの -はじまり-」", "劇場先行版『風を継ぐもの -はじまり-』"],
    ["スパイダーマン ブランド・ニュー・デイ", "スパイダーマン: ブランド・ニュー・デイ"],
    ["4アウト ─もう一度、プレイボール─", "4アウト もう一度、プレイボール"],
    ["『ブリジット・ジョーンズの日記』4Kレストア", "ブリジット・ジョーンズの日記 4Kレストア"],
    ["劇場アニメーション「魔法使いの夜」", "魔法使いの夜"],
    ["装甲騎兵ボトムズ 灰色の魔女", "装甲騎兵ボトムズ 灰色の魔女(ヘクセ)第1作"],
  ])("groups both theaters' screenings for %s under %s", (alias, title) => {
    const inputs = [`【字幕】${alias}`, `${title}（吹替版）`];
    const data = normalizeListings(inputs);
    const id = deterministicMovieId(title);
    expect(data.movies.map((movie) => ({ id: movie.id, title: movie.title }))).toEqual([
      { id, title },
    ]);
    expect(
      data.screenings.map(({ theaterId, movieId, formatLabel }) => [
        theaterId,
        movieId,
        formatLabel,
      ]),
    ).toEqual([
      ["theater-0", id, "字幕"],
      ["theater-1", id, "吹替"],
    ]);
    expect(normalizeListings(inputs, true)).toEqual(data);
    expect(normalizeListings([alias]).movies[0]?.id).toBe(id);
  });

  it.each([
    [
      "映画クレヨンしんちゃん 奇々怪々！オラの妖怪...",
      "映画クレヨンしんちゃん 奇々怪々!オラの妖怪バケーション",
    ],
    [
      "スター・ウォーズ／マンダロリアン...[字幕][応援上映]",
      "スター・ウォーズ/マンダロリアン・アンド・グローグー",
    ],
    ["ママがもうこの世界にいなくても…", "ママがもうこの世界にいなくても 私の命の日記"],
    [
      "劇場シリーズ【第一部】メイドインアビス...",
      "劇場シリーズ【第一部】メイドインアビス 目覚める神秘",
    ],
    [
      "サッカー日本代表 FIFAワールドカップ2026…[ODS]",
      "サッカー日本代表 FIFAワールドカップ2026 「最高の景色」への挑戦 ONE CREATURE 2nd Leg",
    ],
  ])("groups the reviewed truncated title %s under %s", (short, full) => {
    const data = normalizeListings([short, full]);
    expect(data.movies.map((movie) => movie.title)).toEqual([full]);
    expect(data.screenings.map((screening) => screening.movieId)).toEqual([
      deterministicMovieId(full),
      deterministicMovieId(full),
    ]);
  });

  it("keeps unreviewed and ambiguous truncated listings separate", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const data = normalizeListings([
        "ママがもうこの世界にいなくても...",
        "ママがもうこの世界にいなくても 私の命の日記",
        "ママがもうこの世界にいなくても 別の映画",
        "別作品...",
        "別作品 長いタイトル",
      ]);
      expect(data.movies).toHaveLength(5);
      expect(warn).toHaveBeenCalledWith(
        expect.stringContaining("ママがもうこの世界にいなくても..."),
      );
      expect(warn).toHaveBeenCalledWith(expect.stringContaining("別作品..."));
    } finally {
      warn.mockRestore();
    }
  });

  it("preserves punctuation in similar titles without a reviewed alias", () => {
    const data = normalizeListings(["作品/副題", "作品 副題", "作品: 副題", "作品 副題2"]);
    expect(data.movies).toHaveLength(4);
    expect(new Set(data.screenings.map((screening) => screening.movieId)).size).toBe(4);
  });

  it("creates a deterministic ID without fuzzy matching", () => {
    const first = deterministicMovieId("作品 A");
    expect(first).toBe(deterministicMovieId("作品　A"));
    expect(first).not.toBe(deterministicMovieId("作品 B"));
    expect(first).toMatch(/^movie-[a-f0-9]{16}$/u);
    expect(deterministicMovieId("仮面ライダー 長編タイトル")).not.toBe(
      deterministicMovieId("仮面ライダー／ギャバン"),
    );
    expect(deterministicMovieId("星")).not.toBe(deterministicMovieId("星々"));
  });

  it("deduplicates normalized screenings and prefers a safely extracted reservation URL", () => {
    const theater: Theater = {
      id: "cinema109-nagoya",
      name: "109",
      area: "名古屋",
      description: "a",
      officialUrl: "https://109cinemas.net/nagoya/",
    };
    const base: RawScreening = {
      providerId: "cinema109-nagoya",
      theaterId: theater.id,
      theaterName: theater.name,
      rawTitle: "『Michael マイケル』",
      date: "2026-07-31",
      startTime: "10:00",
      endTime: "12:00",
      screenName: "シアター1",
      sourceUrl: theater.officialUrl,
    };
    const withTicket: RawScreening = {
      ...base,
      rawTitle: "字幕 Michael/マイケル",
      formatLabel: "字幕",
      reservationUrl: "https://cinema.109cinemas.net/reserve/1",
    };
    const withoutTicket: RawScreening = {
      ...base,
      rawTitle: "Michael マイケル（字幕版）",
    };
    const create = (raws: RawScreening[]) =>
      normalizeRealData(raws, [theater], ["2026-07-31"], "2026-07-31T00:00:00.000Z", []);
    const forward = create([withoutTicket, withTicket]);
    const reverse = create([withTicket, withoutTicket]);
    expect(forward.movies).toHaveLength(1);
    expect(forward.screenings).toHaveLength(1);
    expect(forward.screenings[0]?.ticketUrl).toBe(withTicket.reservationUrl);
    expect(reverse.screenings).toEqual(forward.screenings);
  });

  it("merges exact normalized titles from three providers into valid real data", async () => {
    const dates = ["2026-07-31", "2026-08-01", "2026-08-02"];
    const theaters: Theater[] = [
      {
        id: "cinema109-nagoya",
        name: "109",
        area: "名古屋",
        description: "a",
        officialUrl: "https://109cinemas.net/nagoya/",
      },
      {
        id: "midland-square-cinema",
        name: "Midland",
        area: "名古屋",
        description: "b",
        officialUrl: "https://www.midland-sq-cinema.jp/",
      },
      {
        id: "aeon-cinema-tokoname",
        name: "Aeon",
        area: "常滑",
        description: "c",
        officialUrl: "https://theater.aeoncinema.com/theaters/tokoname/",
      },
    ];
    const raws: RawScreening[] = [
      ["cinema109-nagoya", "cinema109-nagoya", "【字幕】作品A"],
      ["midland-square", "midland-square-cinema", "作品A[字幕版]"],
      ["aeon-tokoname", "aeon-cinema-tokoname", "作品A（字幕）"],
    ].map(([providerId = "", theaterId = "", rawTitle = ""], index) => ({
      providerId,
      theaterId,
      theaterName: theaters[index]?.name ?? "theater",
      rawTitle,
      date: dates[0] ?? "",
      startTime: `${String(index + 9).padStart(2, "0")}:00`,
      endTime: `${index + 11}:00`,
      sourceUrl: theaters[index]?.officialUrl ?? "https://example.com",
    }));
    const sources: DataSourceStatus[] = theaters.map((theater, index) => ({
      providerId: raws[index]?.providerId ?? "provider",
      theaterId: theater.id,
      theaterName: theater.name,
      sourceUrl: theater.officialUrl,
      fetchedAt: "2026-07-31T00:00:00.000Z",
      status: "success",
    }));
    const data = normalizeRealData(raws, theaters, dates, "2026-07-31T00:00:00.000Z", sources);
    expect(data.movies).toHaveLength(1);
    expect(new Set(data.screenings.map((screening) => screening.movieId)).size).toBe(1);
    expect(data.screenings.map((screening) => screening.formatLabel)).toEqual([
      "字幕",
      "字幕",
      "字幕",
    ]);
    await expect(
      validateAppData(data, {
        now: new Date("2026-07-31T00:00:00.000Z"),
        checkPosters: false,
      }),
    ).resolves.toEqual([]);
  });
});
