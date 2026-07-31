import { formatDateLabel } from "../domain/date";
import { append, element } from "./dom";

type DateTabsOptions = {
  dates: string[];
  selectedDate: string;
  today: string;
  makeUrl: (date: string) => string;
};

export function createDateTabs({
  dates,
  selectedDate,
  today,
  makeUrl,
}: DateTabsOptions): HTMLElement {
  const nav = element("nav", {
    className: "date-tabs",
    attributes: { "aria-label": "上映日を選択" },
  });
  const list = element("div", { className: "date-tabs__list" });

  for (const date of dates) {
    const isSelected = date === selectedDate;
    const link = element("a", {
      className: `date-tab${isSelected ? " date-tab--active" : ""}`,
      text: formatDateLabel(date, today),
      attributes: {
        href: makeUrl(date),
        ...(isSelected ? { "aria-current": "date" } : {}),
      },
    });
    append(list, link);
  }
  nav.append(list);
  return nav;
}
