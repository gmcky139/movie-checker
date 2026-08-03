import {
  deterministicMovieId,
  normalizeMovieTitle,
  normalizeRealData,
} from "../../scripts/normalize-movies";
import type { DataSourceStatus, Theater } from "../../src/domain/types";
import type { RawScreening } from "../../scripts/providers/types";
import { validateAppData } from "../../scripts/validate-data";

describe("real movie normalization", () => {
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
    expect(normalizeMovieTitle("映画クレヨンしんちゃん 奇々怪々！オラの妖怪...")).toEqual({
      title: "映画クレヨンしんちゃん 奇々怪々!オラの妖怪バケーション",
    });
    expect(normalizeMovieTitle("スター・ウォーズ／マンダロリアン...[字幕][応援上映]")).toEqual({
      title: "スター・ウォーズ/マンダロリアン・アンド・グローグー",
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
    const dates = ["2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03"];
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
