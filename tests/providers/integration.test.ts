import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aggregateProviderData } from "../../scripts/fetch-real-data";
import { generateData } from "../../scripts/generate-data";
import type { ScheduleProvider } from "../../scripts/providers/types";
import { validateAppData } from "../../scripts/validate-data";
import { enrichMoviesWithTmdb } from "../../scripts/tmdb-posters";

const dates = ["2026-08-03", "2026-08-04", "2026-08-05"];
const generatedAt = "2026-08-03T00:00:00.000Z";

const definitions = [
  {
    providerId: "cinema109-nagoya",
    theaterId: "cinema109-nagoya",
    theaterName: "109シネマズ名古屋",
    sourceUrl: "https://109cinemas.net/nagoya/",
  },
  {
    providerId: "midland-square",
    theaterId: "midland-square-cinema",
    theaterName: "ミッドランドスクエアシネマ",
    sourceUrl: "https://ticket.midlandcinema.jp/schedule/ticket/0201/index.html",
  },
  {
    providerId: "aeon-tokoname",
    theaterId: "aeon-cinema-tokoname",
    theaterName: "イオンシネマ常滑",
    sourceUrl: "https://theater.aeoncinema.com/theaters/tokoname/",
  },
] as const;

function provider(index: number, fail = false): ScheduleProvider {
  const definition = definitions[index];
  if (!definition) throw new Error(`Unknown provider fixture: ${index}`);
  const theater = {
    id: definition.theaterId,
    name: definition.theaterName,
    area: "愛知県",
    description: "公式映画館",
    officialUrl: definition.sourceUrl,
  };
  return {
    providerId: definition.providerId,
    theater,
    theaterName: definition.theaterName,
    sourceUrl: definition.sourceUrl,
    async fetch() {
      if (fail) throw new Error("synthetic parse failure");
      return {
        theater,
        source: {
          providerId: definition.providerId,
          theaterId: definition.theaterId,
          theaterName: definition.theaterName,
          sourceUrl: definition.sourceUrl,
          fetchedAt: generatedAt,
          status: "success" as const,
        },
        screenings: [
          {
            providerId: definition.providerId,
            theaterId: definition.theaterId,
            theaterName: definition.theaterName,
            sourceUrl: definition.sourceUrl,
            rawTitle: index === 0 ? "『Michael マイケル』" : "Michael/マイケル",
            date: dates[0] ?? "",
            startTime: `${10 + index}:00`,
            endTime: `${12 + index}:00`,
          },
        ],
      };
    },
  };
}

function withPosterMetadata(data: Awaited<ReturnType<typeof aggregateProviderData>>) {
  return {
    ...data,
    movies: data.movies.map((movie) => ({
      ...movie,
      posterPath: "https://image.tmdb.org/t/p/w500/michael.jpg",
      posterSource: "tmdb" as const,
      posterMatchStatus: "matched" as const,
      tmdbId: 123,
    })),
    posterCoverage: {
      eligibleCount: data.movies.length,
      matchedCount: data.movies.length,
      notApplicableCount: 0,
      coveragePercent: 100,
      unmatchedTitles: [],
    },
  };
}

describe("three-provider aggregation and atomic generation", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps the existing complete dataset behavior when all three providers succeed", async () => {
    const schedules = await aggregateProviderData(
      [provider(0), provider(1), provider(2)],
      dates,
      generatedAt,
    );
    const data = await enrichMoviesWithTmdb(schedules, {
      api: {
        async configuration() {
          return {
            images: {
              secure_base_url: "https://image.tmdb.org/t/p/",
              poster_sizes: ["w500"],
            },
          };
        },
        async searchMovie() {
          return {
            results: [
              {
                id: 123,
                title: "Michael マイケル",
                original_title: "Michael マイケル",
                poster_path: "/michael.jpg",
                release_date: "2026-01-01",
                adult: false,
              },
            ],
          };
        },
        async movie() {
          throw new Error("not used");
        },
      },
    });
    expect(data.dataMode).toBe("real");
    expect(data.theaters).toHaveLength(3);
    expect(data.sources).toHaveLength(3);
    expect(data.movies).toHaveLength(1);
    await expect(
      validateAppData(data, {
        now: new Date(generatedAt),
        checkPosters: true,
      }),
    ).resolves.toEqual([]);
    expect(data.posterCoverage?.coveragePercent).toBe(100);
  });

  it("generates partial data when two providers succeed and one fails", async () => {
    const directory = await mkdtemp(join(tmpdir(), "movie-checker-atomic-"));
    const outputPath = join(directory, "generated.json");
    try {
      const partial = await aggregateProviderData(
        [provider(0), provider(1), provider(2, true)],
        dates,
        generatedAt,
      );
      expect(partial.theaters).toHaveLength(3);
      expect(partial.sources).toHaveLength(3);
      expect(partial.sources.find((source) => source.providerId === "aeon-tokoname")).toMatchObject(
        {
          theaterId: "aeon-cinema-tokoname",
          sourceUrl: "https://theater.aeoncinema.com/theaters/tokoname/",
          status: "failed",
        },
      );
      expect(
        partial.screenings.filter((screening) => screening.theaterId === "aeon-cinema-tokoname"),
      ).toHaveLength(0);
      await expect(
        validateAppData(partial, { now: new Date(generatedAt), checkPosters: false }),
      ).resolves.toEqual([]);

      await generateData("real", {
        outputPath,
        now: new Date(generatedAt),
        fetchReal: async () => withPosterMetadata(partial),
      });
      const written = JSON.parse(await readFile(outputPath, "utf8")) as typeof partial;
      expect(written.sources.find((source) => source.providerId === "aeon-tokoname")?.status).toBe(
        "failed",
      );
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects all-provider failure and leaves the previous JSON untouched", async () => {
    const directory = await mkdtemp(join(tmpdir(), "movie-checker-atomic-"));
    const outputPath = join(directory, "generated.json");
    const previous = '{"preserved":true}\n';
    await writeFile(outputPath, previous, "utf8");
    try {
      await expect(
        generateData("real", {
          outputPath,
          now: new Date(generatedAt),
          fetchReal: () =>
            aggregateProviderData(
              [provider(0, true), provider(1, true), provider(2, true)],
              dates,
              generatedAt,
            ),
        }),
      ).rejects.toThrow(/All real-data providers failed/u);
      await expect(readFile(outputPath, "utf8")).resolves.toBe(previous);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("rejects real-data validation when every source is failed", async () => {
    const partial = await aggregateProviderData(
      [provider(0), provider(1), provider(2, true)],
      dates,
      generatedAt,
    );
    const errors = await validateAppData(
      {
        ...partial,
        sources: partial.sources.map((source) => ({ ...source, status: "failed" as const })),
      },
      { now: new Date(generatedAt), checkPosters: false },
    );
    expect(errors).toContain("At least one real-data source must be successful");
  });
});
