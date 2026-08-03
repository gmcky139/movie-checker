import { appConfig } from "../config";
import type { AppData } from "../domain/types";
import { append, element } from "./dom";

export function createFooter(data: AppData): HTMLElement {
  const footer = element("footer", { className: "site-footer" });
  const inner = element("div", { className: "container site-footer__inner" });
  const notice = element("p", {
    text:
      data.dataMode === "real"
        ? `実際の上映予定を${data.sources.map((source) => source.theaterName).join("、")}の公式情報から取得しています。内容は変更される場合があります。購入前に公式サイトで再確認してください。`
        : "これはデモアプリです。上映・予約情報はすべてサンプルです。実際の情報は各映画館の公式サイトでご確認ください。",
  });
  const repository = element("a", {
    text: "GitHubリポジトリ ↗",
    attributes: {
      href: appConfig.repositoryUrl,
      target: "_blank",
      rel: "noopener noreferrer",
    },
  });
  append(inner, notice, repository);
  footer.append(inner);
  return footer;
}
