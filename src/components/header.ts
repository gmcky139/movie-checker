import { homeUrl } from "../domain/urls";
import type { AppData } from "../domain/types";
import { append, element } from "./dom";

type HeaderOptions = {
  data: AppData;
  selectedDate: string;
  query?: string;
};

function formatUpdatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "更新日時不明";
  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Tokyo",
  }).format(date);
}

export function createHeader({ data, selectedDate, query = "" }: HeaderOptions): HTMLElement {
  const header = element("header", { className: "site-header" });
  const inner = element("div", { className: "site-header__inner container" });
  const identity = element("div", { className: "site-identity" });
  const brand = element("a", {
    className: "site-identity__brand",
    text: "Movie Schedule Viewer",
    attributes: { href: homeUrl({ date: selectedDate }) },
  });
  const tagline = element("span", {
    className: "site-identity__tagline",
    text: "映画館をまたいで、今日の一本を。",
  });
  append(identity, brand, tagline);

  const form = element("form", {
    className: "search-form",
    attributes: { role: "search" },
  });
  const label = element("label", {
    className: "visually-hidden",
    text: "映画タイトルを検索",
    attributes: { for: "site-search" },
  });
  const input = element("input", {
    className: "search-form__input",
    attributes: {
      id: "site-search",
      name: "q",
      type: "search",
      placeholder: "映画タイトルを検索",
      autocomplete: "off",
      value: query,
    },
  });
  const button = element("button", {
    className: "button button--accent",
    text: "検索",
    attributes: { type: "submit" },
  });
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    window.location.href = homeUrl({ date: selectedDate, query: input.value });
  });
  append(form, label, input, button);

  const updated = element("p", {
    className: "site-header__updated",
    text: `データ更新: ${formatUpdatedAt(data.generatedAt)} JST`,
  });
  append(inner, identity, form, updated);
  header.append(inner);
  return header;
}
