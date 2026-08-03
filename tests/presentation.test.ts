import {
  homeScheduleLabel,
  posterAlt,
  reservationLinkAriaLabel,
  scheduleLinkNotice,
  TMDB_ATTRIBUTION_NOTICE,
  TMDB_ATTRIBUTION_URL,
  TMDB_LOGO_PATH,
  usesLocalPosterFallback,
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

  it("keeps the required TMDB attribution and approved local logo reference", () => {
    expect(TMDB_ATTRIBUTION_NOTICE).toBe(
      "This product uses the TMDB API but is not endorsed or certified by TMDB.",
    );
    expect(TMDB_ATTRIBUTION_URL).toBe("https://www.themoviedb.org/");
    expect(TMDB_LOGO_PATH).toBe("images/tmdb-logo.svg");
  });

  it("distinguishes a matched TMDB poster from a title-bearing local fallback", () => {
    const matched = {
      id: "movie-a",
      title: "作品A",
      genres: [],
      posterPath: "https://image.tmdb.org/t/p/w500/a.jpg",
      posterSource: "tmdb" as const,
      posterMatchStatus: "matched" as const,
    };
    expect(usesLocalPosterFallback(matched, "real")).toBe(false);
    expect(posterAlt(matched.title, "real", matched.posterMatchStatus)).toMatch(/TMDB/u);
    expect(
      usesLocalPosterFallback(
        {
          ...matched,
          posterPath: "images/posters/placeholder.svg",
          posterSource: "local",
          posterMatchStatus: "unmatched",
        },
        "real",
      ),
    ).toBe(true);
  });
});
