import { isSafeExternalUrl, isSafeRealExternalUrl } from "../domain/urls";
import { element } from "./dom";

export function createExternalLink(
  label: string,
  url: string | undefined,
  demo = true,
): HTMLElement {
  const safeUrl =
    demo && isSafeExternalUrl(url) ? url : !demo && isSafeRealExternalUrl(url) ? url : undefined;
  if (!safeUrl) {
    return element("span", {
      className: "external-link external-link--unavailable",
      text: `${label}（リンク情報なし）`,
    });
  }
  return element("a", {
    className: "external-link",
    text: `${label}（${demo ? "デモ用外部リンク" : "外部サイト"}） ↗`,
    attributes: {
      href: safeUrl,
      target: "_blank",
      rel: "noopener noreferrer",
    },
  });
}
