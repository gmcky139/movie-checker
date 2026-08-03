import type { AppData } from "../domain/types";
import { homeUrl } from "../domain/urls";
import { append, element } from "./dom";
import { createEmptyState } from "./empty-state";
import { createFooter } from "./footer";
import { createHeader } from "./header";

export function getAppRoot(): HTMLElement {
  const root = document.querySelector<HTMLElement>("#app");
  if (!root) throw new Error("Application root was not found");
  return root;
}

export function createMain(): HTMLElement {
  return element("main", { className: "container page-main" });
}

export function renderPage(
  root: HTMLElement,
  data: AppData,
  selectedDate: string,
  main: HTMLElement,
  query = "",
): void {
  root.replaceChildren(createHeader({ data, selectedDate, query }), main, createFooter(data));
}

export function renderFatalError(root: HTMLElement): void {
  const main = createMain();
  append(
    main,
    createEmptyState(
      "上映情報を読み込めませんでした",
      "時間をおいてページを再読み込みしてください。",
      { label: "トップページへ", href: homeUrl() },
      "h1",
    ),
  );
  root.replaceChildren(main);
}
