import {
  homeScheduleLabel,
  posterAlt,
  reservationLinkAriaLabel,
  scheduleLinkNotice,
} from "../src/domain/presentation";

describe("data-mode presentation wording", () => {
  it("contains no demo-specific wording in real mode", () => {
    const realCopy = [
      homeScheduleLabel("real"),
      posterAlt("作品A", "real"),
      reservationLinkAriaLabel("10:00–12:00", "real"),
      scheduleLinkNotice("real"),
    ].join(" ");
    expect(realCopy).not.toMatch(/デモ|サンプル|DEMO/u);
    expect(realCopy).toMatch(/公式/u);
  });

  it("clearly identifies sample-mode content and links as demonstrations", () => {
    const sampleCopy = [
      homeScheduleLabel("sample"),
      posterAlt("作品A", "sample"),
      reservationLinkAriaLabel("10:00–12:00", "sample"),
      scheduleLinkNotice("sample"),
    ].join(" ");
    expect(sampleCopy).toMatch(/デモ|DEMO/u);
  });
});
