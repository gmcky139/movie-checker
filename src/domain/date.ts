import type { Screening } from "./types";

export const TOKYO_TIMEZONE = "Asia/Tokyo";

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isValidDateString(value: string): boolean {
  const match = DATE_PATTERN.exec(value);
  if (!match) {
    return false;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}

export function getTokyoDate(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function addDays(date: string, days: number): string {
  if (!isValidDateString(date)) {
    return date;
  }

  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  const shifted = new Date(Date.UTC(year, month - 1, day + days));
  return [
    shifted.getUTCFullYear(),
    String(shifted.getUTCMonth() + 1).padStart(2, "0"),
    String(shifted.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function createDateRange(now: Date = new Date(), count = 4): string[] {
  const today = getTokyoDate(now);
  return Array.from({ length: count }, (_, index) => addDays(today, index));
}

export function formatDateLabel(date: string, today: string): string {
  if (!isValidDateString(date) || !isValidDateString(today)) {
    return "日付不明";
  }

  const [, month = "", day = ""] = date.split("-");
  const shortDate = `${Number(month)}/${Number(day)}`;

  if (date === today) {
    return `今日 ${shortDate}`;
  }
  if (date === addDays(today, 1)) {
    return `明日 ${shortDate}`;
  }

  const [year = 0, numericMonth = 1, numericDay = 1] = date.split("-").map(Number);
  const weekday = new Intl.DateTimeFormat("ja-JP", {
    weekday: "short",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, numericMonth - 1, numericDay)));
  return `${shortDate} (${weekday})`;
}

export function formatLongDate(date: string): string {
  if (!isValidDateString(date)) {
    return "日付不明";
  }

  const [year = 0, month = 1, day = 1] = date.split("-").map(Number);
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  if (hours === 0) {
    return `${remaining}分`;
  }
  if (remaining === 0) {
    return `${hours}時間`;
  }
  return `${hours}時間${remaining}分`;
}

export function screeningStart(screening: Screening): Date {
  const date = screening.startsNextDay ? addDays(screening.date, 1) : screening.date;
  return new Date(`${date}T${screening.startTime}:00+09:00`);
}

export function screeningEnd(screening: Screening): Date {
  const date = screening.endsNextDay ? addDays(screening.date, 1) : screening.date;
  return new Date(`${date}T${screening.endTime}:00+09:00`);
}

export function isScreeningFinished(screening: Screening, now: Date): boolean {
  return screeningEnd(screening).getTime() <= now.getTime();
}
