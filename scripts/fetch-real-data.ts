import { createDateRange } from "../src/domain/date";
import type { AppData } from "../src/domain/types";
import { normalizeRealData } from "./normalize-movies";
import { createAeonTokonameProvider } from "./providers/aeon-tokoname";
import { createCinema109Provider } from "./providers/cinema109-nagoya";
import { HttpStatusError, SafeHttpClient } from "./providers/http-client";
import { createMidlandProvider } from "./providers/midland-square";
import type { ScheduleProvider } from "./providers/types";
import { TmdbClient } from "./tmdb-client";
import { enrichMoviesWithTmdb } from "./tmdb-posters";

function safeErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function failureStage(error: unknown): "fetch" | "parse" {
  if (
    error instanceof HttpStatusError ||
    error instanceof TypeError ||
    error instanceof DOMException ||
    (error instanceof Error && /URL is outside|redirect|response exceeds/iu.test(error.message))
  ) {
    return "fetch";
  }
  return "parse";
}

export async function aggregateProviderData(
  providers: ScheduleProvider[],
  dates: string[],
  generatedAt: string,
): Promise<AppData> {
  if (providers.length !== 3) throw new Error("Exactly three real-data providers are required");
  const settled = await Promise.allSettled(
    providers.map((provider) => provider.fetch(dates, generatedAt)),
  );
  const successful = [];
  let failed = false;

  for (const [index, result] of settled.entries()) {
    const provider = providers[index];
    if (!provider) continue;
    if (result.status === "fulfilled") {
      successful.push(result.value);
      console.log(
        `[real-data] ${provider.theaterName}: ${result.value.screenings.length} screenings`,
      );
      continue;
    }
    failed = true;
    console.error(
      `[real-data] theater=${provider.theaterName} url=${provider.sourceUrl} stage=${failureStage(result.reason)} error=${safeErrorMessage(result.reason)}`,
    );
  }

  if (failed || successful.length !== providers.length) {
    throw new Error("Real-data update failed; the existing generated JSON was not replaced");
  }
  return normalizeRealData(
    successful.flatMap((result) => result.screenings),
    successful.map((result) => result.theater),
    dates,
    generatedAt,
    successful.map((result) => result.source),
  );
}

export async function fetchRealData(now: Date = new Date()): Promise<AppData> {
  const dates = createDateRange(now);
  const generatedAt = now.toISOString();
  const client = new SafeHttpClient();
  const providers = [
    createCinema109Provider(client),
    createMidlandProvider(client),
    createAeonTokonameProvider(client),
  ];
  const scheduleData = await aggregateProviderData(providers, dates, generatedAt);
  const token = process.env.TMDB_API_READ_TOKEN?.trim();
  if (!token) throw new Error("TMDB_API_READ_TOKEN is required in real mode");
  return enrichMoviesWithTmdb(scheduleData, { api: new TmdbClient(token) });
}
