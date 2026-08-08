import type { Theater } from "../../src/domain/types";
import type { SafeHttpClient } from "./http-client";
import { uniqueRawScreenings, type RawScreening, type ScheduleProvider } from "./types";

const PROVIDER_ID = "aeon-tokoname";
const THEATER_ID = "aeon-cinema-tokoname";
const THEATER_NAME = "イオンシネマ常滑";
const SCHEDULE_URL = "https://theater.aeoncinema.com/schedule/v2/data/tokoname/schedule.json";
const ENTRY_URL = "https://theater.aeoncinema.com/theaters/tokoname/";
const ALLOWED_HOSTS = new Set(["theater.aeoncinema.com", "www.aeoncinema.com", "aeoncinema.com"]);

const theater: Theater = {
  id: THEATER_ID,
  name: THEATER_NAME,
  area: "常滑",
  description: "イオンモール常滑内の映画館です。",
  officialUrl: ENTRY_URL,
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readRecord(value: unknown, key: string): Record<string, unknown> | undefined {
  if (!isRecord(value)) return undefined;
  const nested = value[key];
  return isRecord(nested) ? nested : undefined;
}

function readString(value: unknown, key: string): string | undefined {
  if (!isRecord(value)) return undefined;
  const nested = value[key];
  return typeof nested === "string" && nested.trim() ? nested.trim() : undefined;
}

function readLocalizedJapanese(value: unknown): string | undefined {
  return readString(value, "ja");
}

export function toTokyoDateTime(value: string): { date: string; time: string; instant: Date } {
  if (!/(?:Z|[+-]\d{2}:\d{2})$/u.test(value)) {
    throw new Error(`Aeon date has no timezone offset: ${value}`);
  }
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) throw new Error(`Aeon date is invalid: ${value}`);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? "";
  return {
    date: `${part("year")}-${part("month")}-${part("day")}`,
    time: `${part("hour")}:${part("minute")}`,
    instant,
  };
}

export function parseAeonScheduleJson(
  input: unknown,
  dates: string[],
  sourceUrl: string,
): RawScreening[] {
  if (!isRecord(input)) throw new Error("Aeon schedule root is not an object");
  const results: RawScreening[] = [];

  for (const date of dates) {
    const compactDate = date.replaceAll("-", "");
    const dateValue = input[compactDate];
    if (dateValue === undefined) continue;
    if (!isRecord(dateValue)) throw new Error(`Aeon schedule date is invalid for ${date}`);

    for (const [groupId, groupValue] of Object.entries(dateValue)) {
      if (!Array.isArray(groupValue)) throw new Error(`Aeon movie group is invalid: ${groupId}`);
      for (const item of groupValue) {
        if (!isRecord(item)) throw new Error(`Aeon screening is invalid: ${groupId}`);
        const superEvent = readRecord(item, "superEvent");
        const workPerformed = readRecord(superEvent, "workPerformed");
        const eventName = readRecord(item, "name") ?? readRecord(superEvent, "name");
        const rawTitle = readLocalizedJapanese(eventName);
        const startValue = readString(item, "startDate");
        const endValue = readString(item, "endDate");
        const location = readRecord(item, "location");
        const theaterLocation = readRecord(superEvent, "location");
        const reportedTheaterName = readLocalizedJapanese(readRecord(theaterLocation, "name"));
        if (!rawTitle || !startValue || !endValue || reportedTheaterName !== THEATER_NAME) {
          throw new Error(`Aeon screening is missing required fields: ${groupId}`);
        }

        const start = toTokyoDateTime(startValue);
        const end = toTokyoDateTime(endValue);
        if (start.date !== date || end.instant.getTime() <= start.instant.getTime()) {
          throw new Error(`Aeon screening has inconsistent dates: ${groupId}/${startValue}`);
        }
        const durationMinutes = Math.round(
          (end.instant.getTime() - start.instant.getTime()) / 60_000,
        );
        results.push({
          providerId: PROVIDER_ID,
          providerMovieId:
            readString(workPerformed, "identifier") ?? readString(workPerformed, "id") ?? groupId,
          theaterId: THEATER_ID,
          theaterName: THEATER_NAME,
          rawTitle,
          durationMinutes,
          date,
          startTime: start.time,
          endTime: end.time,
          endsNextDay: end.date !== start.date || undefined,
          screenName: readLocalizedJapanese(readRecord(location, "name")),
          sourceUrl,
        });
      }
    }
  }

  if (results.length === 0) throw new Error("Aeon returned no parseable screenings");
  return uniqueRawScreenings(results);
}

export function createAeonTokonameProvider(client: SafeHttpClient): ScheduleProvider {
  return {
    providerId: PROVIDER_ID,
    theater,
    theaterName: THEATER_NAME,
    sourceUrl: SCHEDULE_URL,
    async fetch(dates, fetchedAt) {
      const response = await client.get(SCHEDULE_URL, {
        allowedHosts: ALLOWED_HOSTS,
        expected: "json",
      });
      if (!response) throw new Error("Aeon schedule was not found");
      const parsed: unknown = JSON.parse(new TextDecoder().decode(response.body));
      return {
        theater,
        source: {
          providerId: PROVIDER_ID,
          theaterId: THEATER_ID,
          theaterName: THEATER_NAME,
          sourceUrl: SCHEDULE_URL,
          fetchedAt,
          status: "success",
        },
        screenings: parseAeonScheduleJson(parsed, dates, response.url),
      };
    },
  };
}
