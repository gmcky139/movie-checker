import { load } from "cheerio";
import type { Theater } from "../../src/domain/types";
import type { SafeHttpClient } from "./http-client";
import {
  sanitizeProviderUrl,
  parseScheduleClock,
  uniqueRawScreenings,
  type RawScreening,
  type ScheduleProvider,
} from "./types";

const PROVIDER_ID = "midland-square";
const THEATER_ID = "midland-square-cinema";
const THEATER_NAME = "ミッドランドスクエアシネマ";
const ENTRY_URL = "https://ticket.midlandcinema.jp/schedule/ticket/0201/index.html";
const LIST_URL = "https://ticket.midlandcinema.jp/schedule/schedule/pc/s0100_0201_DateList.html";
const SCHEDULE_DIRECTORY = "https://ticket.midlandcinema.jp/schedule/schedule/pc/";
const ALLOWED_HOSTS = new Set([
  "ticket.midlandcinema.jp",
  "www.midland-sq-cinema.jp",
  "midland-sq-cinema.jp",
]);

const theater: Theater = {
  id: THEATER_ID,
  name: THEATER_NAME,
  area: "名古屋駅",
  description: "ミッドランドスクエア内の映画館です。",
  officialUrl: "https://www.midland-sq-cinema.jp/",
  ticketUrl: ENTRY_URL,
};

function compactDate(date: string): string {
  return date.replaceAll("-", "");
}

function parseWindowOpen(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return /window\.open\(\s*(['"])(https:[^'"]+)\1/u.exec(value)?.[2];
}

export function parseMidlandDateList(html: string): string[] {
  const $ = load(html);
  return $(".scrollDate.able[id^='s0100_0201_']")
    .map((_, element) => ($(element).attr("id") ?? "").replace("s0100_0201_", ""))
    .get()
    .filter((value) => /^\d{8}$/u.test(value));
}

export function parseMidlandScheduleHtml(
  html: string,
  date: string,
  sourceUrl: string,
): RawScreening[] {
  const $ = load(html);
  if ($(".scheduleBox").length === 0) {
    throw new Error("Midland schedule structure was not found");
  }
  const results: RawScreening[] = [];

  $(".scheduleBox").each((_, element) => {
    const box = $(element);
    const heading = box.find(".MovieTitle1 h2").first().clone();
    heading.find("span").remove();
    const title = heading.text().trim();
    if (!title) return;
    const duration = Number(/(\d+)\s*分/u.exec(box.find(".totalTime").first().text())?.[1]);

    box.find("span.strong.fontXL").each((__, timeElement) => {
      const timeCell = $(timeElement).closest("td");
      const screeningCell = timeCell.closest("table").parent("td");
      if (screeningCell.length === 0) return;
      const timeText = timeCell.text().replace(/\s+/gu, "");
      const match = /(\d{1,2}:\d{2})[～~-](\d{1,2}:\d{2})/u.exec(timeText);
      if (!match?.[1] || !match[2]) return;
      const start = parseScheduleClock(match[1]);
      const end = parseScheduleClock(match[2]);
      const rawReservationUrl = parseWindowOpen(screeningCell.attr("onclick"));
      results.push({
        providerId: PROVIDER_ID,
        theaterId: THEATER_ID,
        theaterName: THEATER_NAME,
        rawTitle: title,
        durationMinutes: Number.isInteger(duration) && duration > 0 ? duration : undefined,
        date,
        startTime: start.time,
        endTime: end.time,
        startsNextDay: start.nextDay || undefined,
        endsNextDay:
          end.nextDay || (!end.nextDay && (start.nextDay || end.time <= start.time)) || undefined,
        screenName: screeningCell.children("p").first().text().trim() || undefined,
        salesStatus: screeningCell.find("img[alt]").first().attr("alt")?.trim() || undefined,
        reservationUrl: sanitizeProviderUrl(rawReservationUrl, sourceUrl, ALLOWED_HOSTS),
        sourceUrl,
      });
    });
  });

  if (results.length === 0) {
    throw new Error(`Midland returned no parseable screenings for ${date}`);
  }
  return uniqueRawScreenings(results);
}

export function createMidlandProvider(client: SafeHttpClient): ScheduleProvider {
  return {
    providerId: PROVIDER_ID,
    theaterName: THEATER_NAME,
    sourceUrl: LIST_URL,
    async fetch(dates, fetchedAt) {
      const listResponse = await client.get(LIST_URL, {
        allowedHosts: ALLOWED_HOSTS,
        expected: "html",
      });
      if (!listResponse) throw new Error("Midland date list was not found");
      const listHtml = new TextDecoder().decode(listResponse.body);
      const publishedDates = new Set(parseMidlandDateList(listHtml));
      for (const date of dates) {
        if (!publishedDates.has(compactDate(date))) {
          throw new Error(`Midland schedule is not published for ${date}`);
        }
      }

      const dailyResults = await Promise.all(
        dates.map(async (date) => {
          const prefix = `s0100_0201_${compactDate(date)}`;
          const primaryUrl = new URL(`${prefix}-1.html`, SCHEDULE_DIRECTORY).toString();
          const secondaryUrl = new URL(`${prefix}-2.html`, SCHEDULE_DIRECTORY).toString();
          const [primary, secondary] = await Promise.all([
            client.get(primaryUrl, { allowedHosts: ALLOWED_HOSTS, expected: "html" }),
            client.get(secondaryUrl, {
              allowedHosts: ALLOWED_HOSTS,
              expected: "html",
              allowNotFound: true,
            }),
          ]);
          if (!primary) throw new Error(`Midland primary schedule was not found for ${date}`);
          const parsed = [
            ...parseMidlandScheduleHtml(new TextDecoder().decode(primary.body), date, primary.url),
          ];
          if (secondary) {
            parsed.push(
              ...parseMidlandScheduleHtml(
                new TextDecoder().decode(secondary.body),
                date,
                secondary.url,
              ),
            );
          }
          return uniqueRawScreenings(parsed);
        }),
      );

      return {
        theater,
        source: {
          providerId: PROVIDER_ID,
          theaterId: THEATER_ID,
          theaterName: THEATER_NAME,
          sourceUrl: LIST_URL,
          fetchedAt,
          status: "success",
        },
        screenings: uniqueRawScreenings(dailyResults.flat()),
      };
    },
  };
}
