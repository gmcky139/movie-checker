import { isScreeningFinished } from "../domain/date";
import { reservationLinkAriaLabel } from "../domain/presentation";
import type { DataMode, Screening } from "../domain/types";
import { isSafeExternalUrl, isSafeRealExternalUrl } from "../domain/urls";
import { append, element } from "./dom";

export function createScreeningList(
  screenings: Screening[],
  now: Date,
  mode: DataMode,
  fallbackTicketUrl?: string,
): HTMLElement {
  const list = element("ul", {
    className: "screening-times",
    attributes: { "aria-label": "上映時刻" },
  });

  for (const screening of screenings) {
    const finished = isScreeningFinished(screening, now);
    const item = element("li");
    const ticketUrl = screening.ticketUrl ?? (mode === "sample" ? fallbackTicketUrl : undefined);
    const details = [screening.formatLabel, screening.screenName, screening.salesStatus].filter(
      (value): value is string => Boolean(value),
    );
    const dayLabel = screening.startsNextDay
      ? "（翌日）"
      : screening.endsNextDay
        ? "（終了は翌日）"
        : "";
    const label = `${screening.startTime}–${screening.endTime}${dayLabel}${details.length > 0 ? `（${details.join(" / ")}）` : ""}${finished ? "（終了）" : ""}`;
    const safeTicketUrl =
      mode === "real" && isSafeRealExternalUrl(ticketUrl)
        ? ticketUrl
        : mode === "sample" && isSafeExternalUrl(ticketUrl)
          ? ticketUrl
          : undefined;
    if (safeTicketUrl) {
      item.append(
        element("a", {
          className: `screening-time${finished ? " screening-time--finished" : ""}`,
          text: label,
          attributes: {
            href: safeTicketUrl,
            target: "_blank",
            rel: "noopener noreferrer",
            "aria-label": reservationLinkAriaLabel(label, mode),
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
