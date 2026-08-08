import type { DataSourceStatus, Theater } from "../../src/domain/types";

export type RawScreening = {
  providerId: string;
  providerMovieId?: string;
  theaterId: string;
  theaterName: string;
  rawTitle: string;
  durationMinutes?: number;
  formatLabel?: string;
  date: string;
  startTime: string;
  endTime?: string;
  startsNextDay?: boolean;
  endsNextDay?: boolean;
  screenName?: string;
  salesStatus?: string;
  reservationUrl?: string;
  detailUrl?: string;
  sourceUrl: string;
};

export type ProviderResult = {
  theater: Theater;
  source: DataSourceStatus;
  screenings: RawScreening[];
};

export type ScheduleProvider = {
  providerId: string;
  theater: Theater;
  theaterName: string;
  sourceUrl: string;
  fetch: (dates: string[], fetchedAt: string) => Promise<ProviderResult>;
};

export function sanitizeProviderUrl(
  value: string | undefined,
  baseUrl: string,
  allowedHosts: ReadonlySet<string>,
): string | undefined {
  if (!value) return undefined;
  const cleaned = value.trim().replace(/^["']+|["']+$/g, "");
  if (!cleaned) return undefined;
  try {
    const url = new URL(cleaned, baseUrl);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      (url.port !== "" && url.port !== "443") ||
      !allowedHosts.has(url.hostname)
    ) {
      return undefined;
    }
    return url.toString();
  } catch {
    return undefined;
  }
}

export function uniqueRawScreenings(screenings: RawScreening[]): RawScreening[] {
  const seen = new Set<string>();
  return screenings.filter((screening) => {
    const key = [
      screening.providerId,
      screening.theaterId,
      screening.rawTitle,
      screening.date,
      screening.startTime,
      screening.endTime ?? "",
      screening.screenName ?? "",
    ].join("|");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function parseScheduleClock(value: string): { time: string; nextDay: boolean } {
  const match = /^(\d{1,2}):([0-5]\d)$/u.exec(value.trim());
  const hour = Number(match?.[1]);
  const minute = match?.[2];
  if (!match || !Number.isInteger(hour) || hour < 0 || hour >= 48 || !minute) {
    throw new Error(`Invalid schedule clock: ${value}`);
  }
  return {
    time: `${String(hour % 24).padStart(2, "0")}:${minute}`,
    nextDay: hour >= 24,
  };
}
