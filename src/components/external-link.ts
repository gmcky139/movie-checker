import { isSafeExternalUrl } from "../domain/urls";
import { element } from "./dom";

export function createExternalLink(label: string, url: string | undefined): HTMLElement {
  if (!isSafeExternalUrl(url)) {
    return element("span", {
      className: "external-link external-link--unavailable",
      text: `${label}（リンク情報なし）`,
    });
  }
  return element("a", {
    className: "external-link",
    text: `${label}（デモ用外部リンク） ↗`,
    attributes: {
      href: url,
      target: "_blank",
      rel: "noopener noreferrer",
    },
  });
}
