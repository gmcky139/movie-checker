import {
  parseMidlandDateList,
  parseMidlandScheduleHtml,
} from "../../scripts/providers/midland-square";

const sourceUrl = "https://ticket.midlandcinema.jp/schedule/schedule/pc/s0100_0201_20260731-1.html";

const scheduleFixture = `<!doctype html><html><body>
  <div class="scheduleBox">
    <div class="MovieTitle1"><h2>【日本語字幕付き】作品A<span>NEW</span></h2></div>
    <div class="totalTime">（本編：120分）</div>
    <table><tr>
      <td onclick="var win = window.open('https://ticket.midlandcinema.jp/ticket/f0100.do?mo=1', 'purchase');win.focus();">
        <p class="ScreenGroup1">スクリーン1</p>
        <table><tr><td><img alt="余裕あり"></td><td><span class="strong fontXL">9:05</span><br>～11:05</td></tr></table>
      </td>
      <td onclick="window.open('https://evil.example/ticket')">
        <p class="ScreenGroup2">スクリーン2</p>
        <table><tr><td><img alt="残りわずか"></td><td><span class="strong fontXL">23:50</span><br>～1:50</td></tr></table>
      </td>
    </tr></table>
  </div>
</body></html>`;

describe("Midland adapter", () => {
  it("reads only published dates from the date list", () => {
    expect(
      parseMidlandDateList(`
        <table><tr>
          <td class="scrollDate able" id="s0100_0201_20260731"></td>
          <td class="scrollDate nonactive" id="s0100_0201_20260801"></td>
        </tr></table>
      `),
    ).toEqual(["20260731"]);
  });

  it("parses multiple screenings and reads window.open without executing JavaScript", () => {
    const screenings = parseMidlandScheduleHtml(scheduleFixture, "2026-07-31", sourceUrl);
    expect(screenings).toHaveLength(2);
    expect(screenings[0]).toMatchObject({
      rawTitle: "【日本語字幕付き】作品A",
      durationMinutes: 120,
      screenName: "スクリーン1",
      startTime: "09:05",
      endTime: "11:05",
      salesStatus: "余裕あり",
    });
    expect(screenings[0]?.reservationUrl).toContain("ticket.midlandcinema.jp");
    expect(screenings[1]?.reservationUrl).toBeUndefined();
    expect(screenings[1]?.endsNextDay).toBe(true);
  });

  it("detects missing required schedule structure", () => {
    expect(() => parseMidlandScheduleHtml("<html></html>", "2026-07-31", sourceUrl)).toThrow(
      /structure/u,
    );
  });
});
