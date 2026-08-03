import { resolve } from "node:path";
import { createSampleData } from "../scripts/generate-sample-data";
import { validateAppData } from "../scripts/validate-data";

const now = new Date("2026-07-31T00:00:00.000Z");

describe("sample data", () => {
  it("meets the schema and quantity constraints", async () => {
    const data = createSampleData(now);
    const errors = await validateAppData(data, {
      now,
      publicRoot: resolve(process.cwd(), "public"),
    });
    expect(errors).toEqual([]);
    expect(data.movies.length).toBeGreaterThanOrEqual(8);
    expect(data.theaters.length).toBeGreaterThanOrEqual(4);
    expect(data.dates).toHaveLength(4);
  });

  it("has unique IDs and valid references", () => {
    const data = createSampleData(now);
    expect(new Set(data.movies.map((movie) => movie.id)).size).toBe(data.movies.length);
    expect(new Set(data.theaters.map((theater) => theater.id)).size).toBe(data.theaters.length);
    expect(new Set(data.screenings.map((screening) => screening.id)).size).toBe(
      data.screenings.length,
    );

    const movieIds = new Set(data.movies.map((movie) => movie.id));
    const theaterIds = new Set(data.theaters.map((theater) => theater.id));
    expect(data.screenings.every((screening) => movieIds.has(screening.movieId))).toBe(true);
    expect(data.screenings.every((screening) => theaterIds.has(screening.theaterId))).toBe(true);
  });

  it("generates ordered start and end times", () => {
    const data = createSampleData(now);
    expect(data.screenings.every((screening) => screening.startTime < screening.endTime)).toBe(
      true,
    );
  });

  it("uses reachable example.com root paths for demo external links", () => {
    const data = createSampleData(now);
    const urls = [
      ...data.theaters.flatMap((theater) => [theater.officialUrl, theater.ticketUrl]),
      ...data.screenings.map((screening) => screening.ticketUrl ?? ""),
    ];
    expect(urls.every((value) => new URL(value).pathname === "/")).toBe(true);
  });

  it("reports broken references", async () => {
    const data = createSampleData(now);
    const first = data.screenings[0];
    expect(first).toBeDefined();
    if (!first) return;
    first.movieId = "missing-movie";
    const errors = await validateAppData(data, {
      now,
      checkPosters: false,
    });
    expect(errors.some((error) => error.includes("Unknown movie reference"))).toBe(true);
  });

  it("reports missing required fields without throwing", async () => {
    const data = createSampleData(now);
    const broken: unknown = {
      ...data,
      movies: [{ id: "broken-movie" }],
    };
    const errors = await validateAppData(broken, {
      now,
      checkPosters: false,
    });
    expect(errors.some((error) => error.includes("movies[0].title is required"))).toBe(true);
  });
});
