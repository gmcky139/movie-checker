import { parseCinema109Html } from "../../scripts/providers/cinema109-nagoya";

const sourceUrl = "https://cinema.109cinemas.net/cgi-bin/pc/site/det.cgi?tsc=1149&ymd=2026-07-31";

function fixture(reservationUrl: string): string {
  return `<!doctype html><html><body><div class="com_schedule_body1">
    <div class="inner1">
      <div class="work_head1"><div class="content_ja">
        <h2 class="work_name1">作品A[SCREENX・字幕]</h2>
        <span class="com_screening_time1">115分</span>
        <a class="com_button10" href="https://109cinemas.net/movies/123.html">作品詳細</a>
      </div></div>
      <div class="work_head2"><h3 class="content_ja">シアター5</h3></div>
      <a class="com_select_screening_time_item1 status1" href="${reservationUrl}">
        <span class="time1">08:50<span>～11:00</span></span>
      </a>
      <a class="com_select_screening_time_item1 status4" href="">
        <span class="time1">24:30<span>～26:40</span></span>
      </a>
    </div>
  </div></body></html>`;
}

describe("109 Cinemas adapter", () => {
  it("parses multiple screenings, duration, screen, status, and overnight times", () => {
    const screenings = parseCinema109Html(
      fixture("https://cinema.109cinemas.net/cgi-bin/pc/resv/resv.cgi?movie=123&amp;time=0850"),
      "2026-07-31",
      sourceUrl,
    );
    expect(screenings).toHaveLength(2);
    expect(screenings[0]).toMatchObject({
      rawTitle: "作品A[SCREENX・字幕]",
      durationMinutes: 115,
      screenName: "シアター5",
      startTime: "08:50",
      endTime: "11:00",
      salesStatus: "空席あり",
    });
    expect(screenings[0]?.reservationUrl).toContain("cinema.109cinemas.net");
    expect(screenings[1]).toMatchObject({
      startTime: "00:30",
      endTime: "02:40",
      startsNextDay: true,
      endsNextDay: true,
      salesStatus: "販売終了または販売開始前",
    });
  });

  it("discards a reservation URL outside the allowlist without losing the screening", () => {
    const [screening] = parseCinema109Html(
      fixture("https://example.net/unsafe"),
      "2026-07-31",
      sourceUrl,
    );
    expect(screening).toBeDefined();
    expect(screening?.reservationUrl).toBeUndefined();
  });

  it("detects an empty or changed document structure", () => {
    expect(() => parseCinema109Html("<html></html>", "2026-07-31", sourceUrl)).toThrow(
      /structure/u,
    );
    expect(() =>
      parseCinema109Html('<div class="com_schedule_body1"></div>', "2026-07-31", sourceUrl),
    ).toThrow(/no parseable screenings/u);
  });
});
