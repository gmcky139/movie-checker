import {
  homeUrl,
  isSafeExternalUrl,
  isSafeRealExternalUrl,
  movieUrl,
  readId,
  readSearchState,
  theaterUrl,
} from "../src/domain/urls";

describe("URL utilities", () => {
  const dates = ["2026-07-31", "2026-08-01", "2026-08-02", "2026-08-03"];

  it("builds relative movie and theater URLs", () => {
    expect(movieUrl("movie-001", dates[0] ?? "")).toBe("movie.html?id=movie-001&date=2026-07-31");
    expect(theaterUrl("theater-001", dates[0] ?? "")).toBe(
      "theater.html?id=theater-001&date=2026-07-31",
    );
    expect(movieUrl("movie-001", dates[0] ?? "").startsWith("/")).toBe(false);
  });

  it("encodes Japanese search queries", () => {
    expect(homeUrl({ date: dates[0], query: " 青い 空 " })).toContain(
      "q=%E9%9D%92%E3%81%84+%E7%A9%BA",
    );
  });

  it("reads state and falls back from an invalid date", () => {
    expect(readSearchState("?date=invalid&q=%20%E7%A9%BA%20", dates)).toEqual({
      date: "2026-07-31",
      query: "空",
      usedFallback: true,
    });
  });

  it("reads encoded IDs", () => {
    expect(readId("?id=movie-001&date=2026-07-31")).toBe("movie-001");
  });

  it("accepts only HTTPS external URLs", () => {
    expect(isSafeExternalUrl("https://example.com")).toBe(true);
    expect(isSafeExternalUrl("http://example.com")).toBe(false);
    expect(isSafeExternalUrl("javascript:alert(1)")).toBe(false);
    expect(isSafeExternalUrl("https://user@example.com")).toBe(false);
    expect(isSafeExternalUrl("https://example.com:444/path")).toBe(false);
    expect(isSafeRealExternalUrl("https://109cinemas.net/nagoya/")).toBe(true);
    expect(isSafeRealExternalUrl("https://www.themoviedb.org/")).toBe(true);
    expect(isSafeRealExternalUrl("https://example.com/reserve")).toBe(false);
    expect(isSafeRealExternalUrl("https://user@109cinemas.net/nagoya/")).toBe(false);
  });
});
