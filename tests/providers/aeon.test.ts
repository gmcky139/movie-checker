import { parseAeonScheduleJson, toTokyoDateTime } from "../../scripts/providers/aeon-tokoname";

const sourceUrl = "https://theater.aeoncinema.com/schedule/v2/data/tokoname/schedule.json";

function event(id: string, title: string, startDate: string, endDate: string) {
  return {
    id,
    name: { ja: title, en: "" },
    startDate,
    endDate,
    location: { name: { ja: "スクリーン1", en: "" } },
    superEvent: {
      name: { ja: title, en: "" },
      location: { name: { ja: "イオンシネマ常滑", en: "" } },
      workPerformed: { id: `work-${id}`, identifier: `movie-${id}` },
    },
  };
}

describe("Aeon Cinema adapter", () => {
  it("converts UTC instants to Tokyo dates and times", () => {
    expect(toTokyoDateTime("2026-07-30T15:30:00.000Z")).toMatchObject({
      date: "2026-07-31",
      time: "00:30",
    });
    expect(() => toTokyoDateTime("2026-07-31T00:30:00")).toThrow(/timezone/u);
  });

  it("parses multiple movies and preserves an overnight screening", () => {
    const data = {
      "20260731": {
        movieA: [
          event("a1", "作品A(吹替版)", "2026-07-30T15:30:00.000Z", "2026-07-30T17:30:00.000Z"),
          event("a2", "作品A(吹替版)", "2026-07-31T14:30:00.000Z", "2026-07-31T16:30:00.000Z"),
        ],
        movieB: [event("b1", "作品B", "2026-07-31T01:00:00.000Z", "2026-07-31T03:00:00.000Z")],
      },
    };
    const screenings = parseAeonScheduleJson(data, ["2026-07-31"], sourceUrl);
    expect(screenings).toHaveLength(3);
    expect(screenings[0]).toMatchObject({
      rawTitle: "作品A(吹替版)",
      startTime: "00:30",
      endTime: "02:30",
      durationMinutes: 120,
    });
    expect(screenings[1]).toMatchObject({
      startTime: "23:30",
      endTime: "01:30",
      endsNextDay: true,
    });
    expect(screenings.every((screening) => screening.reservationUrl === undefined)).toBe(true);
  });

  it("detects missing dates and required fields", () => {
    expect(() => parseAeonScheduleJson({}, ["2026-07-31"], sourceUrl)).toThrow(/not published/u);
    expect(() =>
      parseAeonScheduleJson(
        {
          "20260731": {
            broken: [{ name: { ja: "作品A" } }],
          },
        },
        ["2026-07-31"],
        sourceUrl,
      ),
    ).toThrow(/required fields/u);
  });
});
