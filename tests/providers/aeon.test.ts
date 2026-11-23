import { parseAeonScheduleJson, toTokyoDateTime } from "../../scripts/providers/aeon-tokoname";

const sourceUrl = "https://theater.aeoncinema.com/schedule/v2/data/tokoname/schedule.json";

function event(
  id: string,
  title: string,
  startDate: string,
  endDate: string,
  screenName = "スクリーン1",
) {
  return {
    id,
    name: { ja: title, en: "" },
    startDate,
    endDate,
    location: { name: { ja: screenName, en: "" } },
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
        movieB: [
          event(
            "b1",
            "作品B",
            "2026-07-31T01:00:00.000Z",
            "2026-07-31T03:00:00.000Z",
            "スクリーン2",
          ),
        ],
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
    expect(screenings[2]?.screenName).toBe("スクリーン2");
    expect(screenings.every((screening) => screening.reservationUrl === undefined)).toBe(true);
  });

  it("extracts only the requested three Tokyo dates", () => {
    const data = {
      "20260730": {
        previous: [
          event("previous", "前日の作品", "2026-07-30T01:00:00.000Z", "2026-07-30T03:00:00.000Z"),
        ],
      },
      "20260731": {
        first: [
          event("first", "初日の作品", "2026-07-31T01:00:00.000Z", "2026-07-31T03:00:00.000Z"),
        ],
      },
      "20260801": {
        second: [
          event("second", "2日目の作品", "2026-08-01T01:00:00.000Z", "2026-08-01T03:00:00.000Z"),
        ],
      },
      "20260802": {
        third: [
          event("third", "3日目の作品", "2026-08-02T01:00:00.000Z", "2026-08-02T03:00:00.000Z"),
        ],
      },
      "20260803": {
        following: [
          event("following", "翌日の作品", "2026-08-03T01:00:00.000Z", "2026-08-03T03:00:00.000Z"),
        ],
      },
    };
    const requestedDates = ["2026-07-31", "2026-08-01", "2026-08-02"];
    const screenings = parseAeonScheduleJson(data, requestedDates, sourceUrl);
    expect(screenings).toHaveLength(3);
    expect(screenings.map((screening) => screening.date)).toEqual(requestedDates);
  });

  it("detects missing dates and required fields", () => {
    expect(() => parseAeonScheduleJson({}, ["2026-07-31"], sourceUrl)).toThrow(/no parseable/u);
    expect(() =>
      parseAeonScheduleJson(
        {
          "20260701": {
            movieA: [
              event("old", "旧上映", "2026-07-01T01:00:00.000Z", "2026-07-01T03:00:00.000Z"),
            ],
          },
        },
        ["2026-07-31"],
        sourceUrl,
      ),
    ).toThrow(/requested dates: 20260731.*available date keys: 20260701/u);
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

  it("keeps published dates when another requested date is not yet present", () => {
    const screenings = parseAeonScheduleJson(
      {
        "20260731": {
          movieA: [event("a1", "作品A", "2026-07-31T01:00:00.000Z", "2026-07-31T03:00:00.000Z")],
        },
      },
      ["2026-07-31", "2026-08-01"],
      sourceUrl,
    );
    expect(screenings).toHaveLength(1);
    expect(screenings[0]?.date).toBe("2026-07-31");
  });
});
