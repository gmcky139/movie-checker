import { createHash } from "node:crypto";
import type { AppData, Movie, Screening, Theater } from "../src/domain/types";
import type { RawScreening } from "./providers/types";

type MovieForPosterSearch = Movie & { alternateTitle?: string };

export type NormalizedRealData = Omit<AppData, "movies"> & {
  movies: MovieForPosterSearch[];
};

// Exact, reviewable aliases only. Do not add similarity-based matches here.
export const TITLE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  "Michael/マイケル": "Michael マイケル",
  "MICHAEL マイケル": "Michael マイケル",
  "SPIDER-MAN: BRAND NEW DAY": "Spider-Man: Brand New Day",
  "Spider-Man/Brand New Day": "Spider-Man: Brand New Day",
  "スパイダーマン ブランド・ニュー・デイ": "スパイダーマン: ブランド・ニュー・デイ",
  // Both theaters' entries for each of these titles matched the same TMDB movie.
  "GROTESQQQUE -グロテスク": "GROTESQQQUE グロテスク",
  "ヴェリティ 真実": "ヴェリティ/真実",
  "クリスマス・キャロル 3人のゴーストたち": "クリスマス・キャロル/3人のゴーストたち",
  "バッド・ルーテナント トウキョウ": "バッド・ルーテナント: トウキョウ",
  "劇場先行版「風を継ぐもの -はじまり-」": "劇場先行版『風を継ぐもの -はじまり-』",
  "4アウト ─もう一度、プレイボール─": "4アウト もう一度、プレイボール",
  // Official movie listings confirm the same release, including the restoration and part number.
  "『ブリジット・ジョーンズの日記』4Kレストア": "ブリジット・ジョーンズの日記 4Kレストア",
  "劇場アニメーション「魔法使いの夜」": "魔法使いの夜",
  "装甲騎兵ボトムズ 灰色の魔女": "装甲騎兵ボトムズ 灰色の魔女(ヘクセ)第1作",
  "映画クレヨンしんちゃん 奇々怪々!オラの妖怪バケ~ション":
    "映画クレヨンしんちゃん 奇々怪々!オラの妖怪バケーション",
  "スター・ウォーズ マンダロリアン・アンド・グローグー":
    "スター・ウォーズ/マンダロリアン・アンド・グローグー",
  "スター・ウォーズ: マンダロリアン・アンド・グローグー":
    "スター・ウォーズ/マンダロリアン・アンド・グローグー",
  "スター・ウォーズ/マンダロリアン・アンド・グローグー":
    "スター・ウォーズ/マンダロリアン・アンド・グローグー",
  "映画 仮面ライダーゼッツ&超宇宙刑事ギャバン インフィニティ":
    "映画『仮面ライダーゼッツ さよならのミッション』/映画『超宇宙刑事ギャバン インフィニティ 太陽が泣いた日』",
  "仮面ライダーゼッツ/超宇宙刑事ギャバン":
    "映画『仮面ライダーゼッツ さよならのミッション』/映画『超宇宙刑事ギャバン インフィニティ 太陽が泣いた日』",
});

// Known cutoffs from theater listings. Resolve against the full titles in the batch as well.
const TRUNCATED_TITLE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  "映画クレヨンしんちゃん 奇々怪々!オラの妖怪...":
    "映画クレヨンしんちゃん 奇々怪々!オラの妖怪バケーション",
  "スター・ウォーズ/マンダロリアン...": "スター・ウォーズ/マンダロリアン・アンド・グローグー",
  "ママがもうこの世界にいなくても...": "ママがもうこの世界にいなくても 私の命の日記",
  "劇場シリーズ【第一部】メイドインアビス...":
    "劇場シリーズ【第一部】メイドインアビス 目覚める神秘",
  "サッカー日本代表 FIFAワールドカップ2026...[ODS]":
    "サッカー日本代表 FIFAワールドカップ2026 「最高の景色」への挑戦 ONE CREATURE 2nd Leg",
});
const TRUNCATED_TITLE_END = /\.\.\.(?:\[ODS\])?$/u;

const FORMAT_PATTERNS: Array<[RegExp, string]> = [
  [/日本語字幕(?:付き)?/giu, "日本語字幕"],
  [/IMAXレーザー/giu, "IMAXレーザー"],
  [/SCREENX/giu, "SCREENX"],
  [/4DX/giu, "4DX"],
  [/Dolby\s*Cinema/giu, "Dolby Cinema"],
  [/Dolby\s*Atmos/giu, "Dolby Atmos"],
  [/IMAX/giu, "IMAX"],
  [/2D/giu, "2D"],
  [/3D/giu, "3D"],
  [/日本語吹替(?:版)?/gu, "吹替"],
  [/字幕(?:版)?/gu, "字幕"],
  [/吹替(?:版)?/gu, "吹替"],
  [/応援上映/gu, "応援上映"],
  [/映画館デビュー/gu, "映画館デビュー"],
];

function normalizeSpacing(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/\u3000/gu, " ")
    .replace(/[‐‑‒–—―]/gu, "-")
    .replace(/[〜～]/gu, "~")
    .replace(/[･·]/gu, "・")
    .replace(/[∕⁄]/gu, "/")
    .replace(/\s+/gu, " ")
    .replace(/\s*([・/|~])\s*/gu, "$1")
    .replace(/\s*:\s*/gu, ": ")
    .trim();
}

function stripOuterDecoration(value: string): string {
  const pairs: Array<[string, string]> = [
    ["『", "』"],
    ["「", "」"],
    ["“", "”"],
    ["‘", "’"],
    ['"', '"'],
    ["'", "'"],
  ];
  let result = value.trim();
  while (true) {
    const pair = pairs.find(([open, close]) => result.startsWith(open) && result.endsWith(close));
    if (!pair || result.length <= pair[0].length + pair[1].length) return result;
    result = result.slice(pair[0].length, -pair[1].length).trim();
  }
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

function extractBareFormat(
  title: string,
  side: "prefix" | "suffix",
): { title: string; formats: string[] } | null {
  const token =
    "日本語字幕(?:付き)?|日本語吹替(?:版)?|字幕(?:版)?|吹替(?:版)?|IMAXレーザー|IMAX|SCREENX|4DX|Dolby\\s*Cinema|Dolby\\s*Atmos|2D|3D|応援上映|映画館デビュー";
  const pattern =
    side === "prefix"
      ? new RegExp(`^(${token})(?:\\s+|[)】・/|:~-]+\\s*)`, "iu")
      : new RegExp(`(?:\\s+|[・/|:~-]+\\s*)(${token})$`, "iu");
  const match = pattern.exec(title);
  if (!match?.[1]) return null;
  const formats = parseFormatGroup(match[1]);
  if (!formats) return null;
  return {
    title:
      side === "prefix" ? title.slice(match[0].length).trim() : title.slice(0, match.index).trim(),
    formats,
  };
}

export function normalizeMovieTitle(
  rawTitle: string,
  suppliedFormat?: string,
): { title: string; formatLabel?: string } {
  let title = stripOuterDecoration(normalizeSpacing(rawTitle));
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

  while (true) {
    const extracted = extractBareFormat(title, "prefix");
    if (!extracted) break;
    formats.push(...extracted.formats);
    title = extracted.title;
  }
  while (true) {
    const extracted = extractBareFormat(title, "suffix");
    if (!extracted) break;
    formats.push(...extracted.formats);
    title = extracted.title;
  }

  title = stripOuterDecoration(normalizeSpacing(title)).replace(
    /^[\s:・/|~_-]+|[\s:・/|~_-]+$/gu,
    "",
  );
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

function resolveTruncatedTitles(titles: ReadonlySet<string>): Map<string, string> {
  const resolved = new Map<string, string>();
  const fullTitles = [...titles].filter((title) => !TRUNCATED_TITLE_END.test(title));
  for (const title of titles) {
    if (!TRUNCATED_TITLE_END.test(title)) continue;
    const expected = TRUNCATED_TITLE_ALIASES[title];
    const prefix = title.replace(TRUNCATED_TITLE_END, "").trimEnd();
    if (expected && !fullTitles.some((other) => other !== expected && other.startsWith(prefix))) {
      resolved.set(title, expected);
    } else {
      console.warn(`[real-data] kept unresolved truncated movie title: ${title}`);
    }
  }
  return resolved;
}

function selectAlternateTitle(screenings: RawScreening[]): string | undefined {
  const titles = new Map<string, string>();
  for (const { alternateTitle } of screenings) {
    if (!alternateTitle) continue;
    const title = normalizeSpacing(alternateTitle).replace(
      /^(?:(?:SUB|IMAX)\]\s*|(?:SUB|JPN)\s+)/u,
      "",
    );
    if (title && !TRUNCATED_TITLE_END.test(title)) {
      const key = title.toLowerCase().replace(/\s+/gu, "");
      titles.set(key, title);
    }
  }
  return titles.size === 1 ? titles.values().next().value : undefined;
}

export function normalizeRealData(
  rawScreenings: RawScreening[],
  theaters: Theater[],
  dates: string[],
  generatedAt: string,
  sources: AppData["sources"],
): NormalizedRealData {
  const parsed = rawScreenings.map((raw) => ({
    raw,
    ...normalizeMovieTitle(raw.rawTitle, raw.formatLabel),
  }));
  const truncatedTitles = resolveTruncatedTitles(new Set(parsed.map((item) => item.title)));
  const normalized = parsed
    .map((item) => ({ ...item, title: truncatedTitles.get(item.title) ?? item.title }))
    .sort(
      (left, right) =>
        left.title.localeCompare(right.title, "ja") ||
        left.raw.theaterId.localeCompare(right.raw.theaterId) ||
        left.raw.date.localeCompare(right.raw.date) ||
        left.raw.startTime.localeCompare(right.raw.startTime) ||
        (left.raw.screenName ?? "").localeCompare(right.raw.screenName ?? "") ||
        (left.formatLabel ?? "").localeCompare(right.formatLabel ?? "") ||
        left.raw.providerId.localeCompare(right.raw.providerId),
    );
  const groups = new Map<string, typeof normalized>();
  for (const item of normalized) {
    const group = groups.get(item.title) ?? [];
    group.push(item);
    groups.set(item.title, group);
  }

  const movies: MovieForPosterSearch[] = [...groups.entries()]
    .map(([title, items]) => {
      const officialUrl = items.find((item) => item.raw.detailUrl)?.raw.detailUrl;
      const alternateTitle = selectAlternateTitle(items.map((item) => item.raw));
      return {
        id: deterministicMovieId(title),
        title,
        ...(alternateTitle ? { alternateTitle } : {}),
        durationMinutes: selectDuration(items.map((item) => item.raw.durationMinutes)),
        genres: [],
        posterPath: "images/posters/placeholder.svg",
        posterSource: "local" as const,
        posterMatchStatus: "unmatched" as const,
        ...(officialUrl ? { officialUrl } : {}),
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title, "ja"));
  const movieIds = new Map(movies.map((movie) => [movie.title, movie.id]));

  const screeningsByKey = new Map<string, Screening>();
  for (const { raw, title, formatLabel } of normalized) {
    const movieId = movieIds.get(title);
    if (!movieId || !raw.endTime) {
      throw new Error(`Normalized screening is missing required data: ${raw.theaterName}/${title}`);
    }
    const scheduleKey = [
      raw.theaterId,
      movieId,
      raw.date,
      raw.startTime,
      raw.screenName ?? "",
      formatLabel ?? "",
    ];
    const id = `screening-${stableId(scheduleKey)}`;
    const candidate: Screening = {
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
    const key = scheduleKey.join("|");
    const existing = screeningsByKey.get(key);
    if (!existing) {
      screeningsByKey.set(key, candidate);
      continue;
    }
    if (!existing.ticketUrl && candidate.ticketUrl) existing.ticketUrl = candidate.ticketUrl;
    if (!existing.salesStatus && candidate.salesStatus)
      existing.salesStatus = candidate.salesStatus;
  }
  const screenings = [...screeningsByKey.values()].sort(
    (left, right) =>
      left.date.localeCompare(right.date) ||
      left.startTime.localeCompare(right.startTime) ||
      left.theaterId.localeCompare(right.theaterId) ||
      left.movieId.localeCompare(right.movieId) ||
      (left.screenName ?? "").localeCompare(right.screenName ?? "") ||
      (left.formatLabel ?? "").localeCompare(right.formatLabel ?? ""),
  );

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
