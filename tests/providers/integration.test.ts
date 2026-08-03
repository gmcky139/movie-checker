import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aggregateProviderData } from "../../scripts/fetch-real-data";
import { generateData } from "../../scripts/generate-data";
import type { ScheduleProvider } from "../../scripts/providers/types";
import { validateAppData } from "../../scripts/validate-data";

const dates = ["2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06"];
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
  return {
    providerId: definition.providerId,
    theaterName: definition.theaterName,
    sourceUrl: definition.sourceUrl,
    async fetch() {
      if (fail) throw new Error("synthetic parse failure");
      return {
        theater: {
          id: definition.theaterId,
          name: definition.theaterName,
          area: "愛知県",
          description: "公式映画館",
          officialUrl: definition.sourceUrl,
        },
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

describe("three-provider aggregation and atomic generation", () => {
  beforeEach(() => {
    vi.spyOn(console, "log").mockImplementation(() => undefined);
    vi.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates one complete real dataset only after all three providers succeed", async () => {
    const data = await aggregateProviderData(
      [provider(0), provider(1), provider(2)],
      dates,
      generatedAt,
    );
    expect(data.dataMode).toBe("real");
    expect(data.theaters).toHaveLength(3);
    expect(data.sources).toHaveLength(3);
    expect(data.movies).toHaveLength(1);
    await expect(
      validateAppData(data, {
        now: new Date(generatedAt),
        checkPosters: false,
      }),
    ).resolves.toEqual([]);
  });

  it("rejects partial provider data and leaves the previous JSON untouched", async () => {
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
              [provider(0), provider(1, true), provider(2)],
              dates,
              generatedAt,
            ),
        }),
      ).rejects.toThrow(/not replaced/u);
      await expect(readFile(outputPath, "utf8")).resolves.toBe(previous);
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
