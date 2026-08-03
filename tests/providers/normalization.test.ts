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
  });

  it("creates a deterministic ID without fuzzy matching", () => {
    const first = deterministicMovieId("作品 A");
    expect(first).toBe(deterministicMovieId("作品　A"));
    expect(first).not.toBe(deterministicMovieId("作品 B"));
    expect(first).toMatch(/^movie-[a-f0-9]{16}$/u);
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
