import {
  addDays,
  createDateRange,
  formatDateLabel,
  formatMinutes,
  getTokyoDate,
  isScreeningFinished,
  isValidDateString,
} from "../src/domain/date";
import type { Screening } from "../src/domain/types";

describe("date utilities", () => {
  it("uses the Tokyo calendar date", () => {
    expect(getTokyoDate(new Date("2026-07-30T15:30:00.000Z"))).toBe("2026-07-31");
  });

  it("creates today and the following three dates", () => {
    expect(createDateRange(new Date("2026-07-30T15:30:00.000Z"))).toEqual([
      "2026-07-31",
      "2026-08-01",
      "2026-08-02",
      "2026-08-03",
    ]);
  });

  it("handles month boundaries when adding days", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("formats today, tomorrow, and later dates", () => {
    expect(formatDateLabel("2026-07-31", "2026-07-31")).toBe("今日 7/31");
    expect(formatDateLabel("2026-08-01", "2026-07-31")).toBe("明日 8/1");
    expect(formatDateLabel("2026-08-02", "2026-07-31")).toMatch(/^8\/2 \(.\)$/);
  });

  it("handles invalid dates safely", () => {
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(formatDateLabel("not-a-date", "2026-07-31")).toBe("日付不明");
  });

  it("formats durations", () => {
    expect(formatMinutes(45)).toBe("45分");
    expect(formatMinutes(120)).toBe("2時間");
    expect(formatMinutes(135)).toBe("2時間15分");
  });

  it("marks a screening finished using its Tokyo end time", () => {
    const screening: Screening = {
      id: "screening-1",
      movieId: "movie-1",
      theaterId: "theater-1",
      date: "2026-07-31",
      startTime: "10:00",
      endTime: "12:00",
    };
    expect(isScreeningFinished(screening, new Date("2026-07-31T03:00:00.000Z"))).toBe(true);
    expect(isScreeningFinished(screening, new Date("2026-07-31T02:59:00.000Z"))).toBe(false);
  });
});
