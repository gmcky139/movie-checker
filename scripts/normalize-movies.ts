import { createHash } from "node:crypto";
import type { AppData, Movie, Screening, Theater } from "../src/domain/types";
import type { RawScreening } from "./providers/types";

export const TITLE_ALIASES: Readonly<Record<string, string>> = Object.freeze({});

const FORMAT_PATTERNS: Array<[RegExp, string]> = [
  [/日本語字幕(?:付き)?/giu, "日本語字幕"],
  [/IMAXレーザー/giu, "IMAXレーザー"],
  [/SCREENX/giu, "SCREENX"],
  [/4DX/giu, "4DX"],
  [/Dolby\s*Cinema/giu, "Dolby Cinema"],
  [/Dolby\s*Atmos/giu, "Dolby Atmos"],
  [/IMAX/giu, "IMAX"],
  [/字幕(?:版)?/gu, "字幕"],
  [/吹替(?:版)?/gu, "吹替"],
];

function normalizeSpacing(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\u3000/gu, " ")
    .replace(/[‐‑‒–—―]/gu, "-")
    .replace(/\s+/gu, " ")
    .replace(/\s*([・/／|])\s*/gu, "$1")
    .trim();
}

function parseFormatGroup(value: string): string[] | null {
  let remainder = normalizeSpacing(value);
  const labels: string[] = [];
  for (const [pattern, label] of FORMAT_PATTERNS) {
    pattern.lastIndex = 0;
    if (pattern.test(remainder)) {
      labels.push(label);
      pattern.lastIndex = 0;
      remainder = remainder.replace(pattern, "");
    }
  }
  remainder = remainder.replace(/[\s・/／|,+・版付きレーザー]+/gu, "");
  return labels.length > 0 && remainder === "" ? labels : null;
}

function mergeFormats(values: Array<string | undefined>): string | undefined {
  const labels: string[] = [];
  for (const value of values) {
    if (!value) continue;
    const parsed = parseFormatGroup(value);
    const candidates = parsed ?? [normalizeSpacing(value)];
    for (const candidate of candidates) {
      if (candidate && !labels.includes(candidate)) labels.push(candidate);
    }
  }
  return labels.length > 0 ? labels.join("・") : undefined;
}

export function normalizeMovieTitle(
  rawTitle: string,
  suppliedFormat?: string,
): { title: string; formatLabel?: string } {
  let title = normalizeSpacing(rawTitle);
  const formats: string[] = [];
  const prefix = /^\s*[[【(]([^\]】)]+)[\]】)]\s*/u;
  const suffix = /\s*[[【(]([^\]】)]+)[\]】)]\s*$/u;

  while (true) {
    const match = prefix.exec(title);
    const parsed = match?.[1] ? parseFormatGroup(match[1]) : null;
    if (!match || !parsed) break;
    formats.push(...parsed);
    title = title.slice(match[0].length).trim();
  }
  while (true) {
    const match = suffix.exec(title);
    const parsed = match?.[1] ? parseFormatGroup(match[1]) : null;
    if (!match || !parsed) break;
    formats.push(...parsed);
    title = title.slice(0, match.index).trim();
  }

  title = normalizeSpacing(title);
  const canonicalTitle = TITLE_ALIASES[title] ?? title;
  if (!canonicalTitle) throw new Error(`Movie title became empty after normalization: ${rawTitle}`);
  return {
    title: canonicalTitle,
    formatLabel: mergeFormats([suppliedFormat, formats.join("・")]),
  };
}

export function deterministicMovieId(title: string): string {
  const normalized = normalizeSpacing(title).toLocaleLowerCase("ja-JP");
  return `movie-${createHash("sha256").update(normalized).digest("hex").slice(0, 16)}`;
}

function stableId(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 20);
}

function selectDuration(values: Array<number | undefined>): number | undefined {
  const counts = new Map<number, number>();
  for (const value of values) {
    if (value && Number.isInteger(value) && value > 0) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }
  return [...counts.entries()].sort(
    ([leftValue, leftCount], [rightValue, rightCount]) =>
      rightCount - leftCount || leftValue - rightValue,
  )[0]?.[0];
}

export function normalizeRealData(
  rawScreenings: RawScreening[],
  theaters: Theater[],
  dates: string[],
  generatedAt: string,
  sources: AppData["sources"],
): AppData {
  const normalized = rawScreenings.map((raw) => ({
    raw,
    ...normalizeMovieTitle(raw.rawTitle, raw.formatLabel),
  }));
  const groups = new Map<string, typeof normalized>();
  for (const item of normalized) {
    const group = groups.get(item.title) ?? [];
    group.push(item);
    groups.set(item.title, group);
  }

  const movies: Movie[] = [...groups.entries()]
    .map(([title, items]) => {
      const officialUrl = items.find((item) => item.raw.detailUrl)?.raw.detailUrl;
      return {
        id: deterministicMovieId(title),
        title,
        durationMinutes: selectDuration(items.map((item) => item.raw.durationMinutes)),
        genres: [],
        posterPath: "images/posters/placeholder.svg",
        ...(officialUrl ? { officialUrl } : {}),
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title, "ja"));
  const movieIds = new Map(movies.map((movie) => [movie.title, movie.id]));

  const screenings: Screening[] = normalized.map(({ raw, title, formatLabel }) => {
    const movieId = movieIds.get(title);
    if (!movieId || !raw.endTime) {
      throw new Error(`Normalized screening is missing required data: ${raw.theaterName}/${title}`);
    }
    const id = `screening-${stableId([
      raw.providerId,
      raw.theaterId,
      movieId,
      raw.date,
      raw.startTime,
      raw.endTime,
      raw.screenName ?? "",
      formatLabel ?? "",
    ])}`;
    return {
      id,
      movieId,
      theaterId: raw.theaterId,
      date: raw.date,
      startTime: raw.startTime,
      endTime: raw.endTime,
      sourceUrl: raw.sourceUrl,
      ...(raw.startsNextDay ? { startsNextDay: true } : {}),
      ...(raw.endsNextDay ? { endsNextDay: true } : {}),
      ...(formatLabel ? { formatLabel } : {}),
      ...(raw.screenName ? { screenName: raw.screenName } : {}),
      ...(raw.salesStatus ? { salesStatus: raw.salesStatus } : {}),
      ...(raw.reservationUrl ? { ticketUrl: raw.reservationUrl } : {}),
    };
  });

  return {
    schemaVersion: 1,
    dataMode: "real",
    generatedAt,
    timezone: "Asia/Tokyo",
    sources,
    dates,
    movies,
    theaters,
    screenings,
  };
}
