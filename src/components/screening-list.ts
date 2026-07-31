import { isScreeningFinished } from "../domain/date";
import type { Screening } from "../domain/types";
import { isSafeExternalUrl } from "../domain/urls";
import { append, element } from "./dom";

export function createScreeningList(
  screenings: Screening[],
  now: Date,
  fallbackTicketUrl?: string,
): HTMLElement {
  const list = element("ul", {
    className: "screening-times",
    attributes: { "aria-label": "上映時刻" },
  });

  for (const screening of screenings) {
    const finished = isScreeningFinished(screening, now);
    const item = element("li");
    const ticketUrl = screening.ticketUrl ?? fallbackTicketUrl;
    const label = `${screening.startTime}–${screening.endTime}${finished ? "（終了）" : ""}`;
    if (isSafeExternalUrl(ticketUrl)) {
      item.append(
        element("a", {
          className: `screening-time${finished ? " screening-time--finished" : ""}`,
          text: label,
          attributes: {
            href: ticketUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-label": `${label}のデモ予約ページを外部サイトで開く`,
          },
        }),
      );
    } else {
      item.append(
        element("span", {
          className: `screening-time${finished ? " screening-time--finished" : ""}`,
          text: `${label}（予約リンクなし）`,
        }),
      );
    }
    append(list, item);
  }
  return list;
}
