import { load } from "cheerio";
import { decode } from "iconv-lite";
import type { Theater } from "../../src/domain/types";
import type { SafeHttpClient } from "./http-client";
import {
  sanitizeProviderUrl,
  parseScheduleClock,
  uniqueRawScreenings,
  type RawScreening,
  type ScheduleProvider,
} from "./types";

const PROVIDER_ID = "cinema109-nagoya";
const THEATER_ID = "cinema109-nagoya";
const THEATER_NAME = "109シネマズ名古屋";
const ENTRY_URL = "https://109cinemas.net/nagoya/";
const SCHEDULE_URL = "https://cinema.109cinemas.net/cgi-bin/pc/site/det.cgi?tsc=1149";
const ALLOWED_HOSTS = new Set(["cinema.109cinemas.net", "109cinemas.net"]);

const theater: Theater = {
  id: THEATER_ID,
  name: THEATER_NAME,
  area: "名古屋・ささしま",
  description: "マーケットスクエアささしま内の映画館です。",
  officialUrl: ENTRY_URL,
  ticketUrl: SCHEDULE_URL,
};

export function decodeCinema109Html(body: Uint8Array): string {
  return decode(Buffer.from(body), "euc-jp");
}

function salesStatus(className: string): string | undefined {
  if (/\bstatus1\b/u.test(className)) return "空席あり";
  if (/\bstatus2\b/u.test(className)) return "残席わずか";
  if (/\bstatus3\b/u.test(className)) return "満席";
  if (/\bstatus4\b/u.test(className)) return "販売終了または販売開始前";
  return undefined;
}

export function parseCinema109Html(html: string, date: string, sourceUrl: string): RawScreening[] {
  const $ = load(html);
  if ($(".com_schedule_body1").length === 0) {
    throw new Error("109 Cinemas schedule structure was not found");
  }

  const results: RawScreening[] = [];
  $(".com_schedule_body1 .inner1").each((_, element) => {
    const block = $(element);
    const title = block.find(".work_head1 .content_ja .work_name1").first().text().trim();
    if (!title) return;
    const durationText = block.find(".com_screening_time1").first().text();
    const duration = Number(/(\d+)\s*分/u.exec(durationText)?.[1]);
    const screenName = block.find(".work_head2 .content_ja").first().text().trim() || undefined;
    const detailUrl = sanitizeProviderUrl(
      block.find(".work_head1 .com_button10").first().attr("href"),
      sourceUrl,
      ALLOWED_HOSTS,
    );

    block.find(".com_select_screening_time_item1").each((__, item) => {
      const link = $(item);
      const timeText = link.find(".time1").first().text().replace(/\s+/gu, "");
      const match = /(\d{1,2}:\d{2})[～~-](\d{1,2}:\d{2})/u.exec(timeText);
      if (!match?.[1] || !match[2]) return;
      const start = parseScheduleClock(match[1]);
      const end = parseScheduleClock(match[2]);
      results.push({
        providerId: PROVIDER_ID,
        providerMovieId: detailUrl ? new URL(detailUrl).pathname : undefined,
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
        screenName,
        salesStatus: salesStatus(link.attr("class") ?? ""),
        reservationUrl: sanitizeProviderUrl(link.attr("href"), sourceUrl, ALLOWED_HOSTS),
        detailUrl,
        sourceUrl,
      });
    });
  });

  if (results.length === 0) {
    const notice = $(".com_schedule_body1").text().replace(/\s+/gu, " ");
    if (/上映.*(?:未定|ありません|公開前)|スケジュール.*(?:未定|ありません|公開前)/u.test(notice)) {
      return [];
    }
    throw new Error(`109 Cinemas returned no parseable screenings for ${date}`);
  }
  return uniqueRawScreenings(results);
}

export function createCinema109Provider(client: SafeHttpClient): ScheduleProvider {
  return {
    providerId: PROVIDER_ID,
    theaterName: THEATER_NAME,
    sourceUrl: ENTRY_URL,
    async fetch(dates, fetchedAt) {
      const dailyResults = await Promise.all(
        dates.map(async (date) => {
          const url = new URL(SCHEDULE_URL);
          url.searchParams.set("ymd", date);
          const response = await client.get(url.toString(), {
            allowedHosts: ALLOWED_HOSTS,
            expected: "html",
          });
          if (!response) throw new Error(`109 Cinemas schedule was not found: ${url.toString()}`);
          const html = decodeCinema109Html(response.body);
          return parseCinema109Html(html, date, response.url);
        }),
      );
      const screenings = uniqueRawScreenings(dailyResults.flat());
      if (screenings.length === 0) {
        throw new Error("109 Cinemas returned no screenings across the requested dates");
      }
      return {
        theater,
        source: {
          providerId: PROVIDER_ID,
          theaterId: THEATER_ID,
          theaterName: THEATER_NAME,
          sourceUrl: ENTRY_URL,
          fetchedAt,
          status: "success",
        },
        screenings,
      };
    },
  };
}
