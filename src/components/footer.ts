import { appConfig } from "../config";
import { append, element } from "./dom";

export function createFooter(): HTMLElement {
  const footer = element("footer", { className: "site-footer" });
  const inner = element("div", { className: "container site-footer__inner" });
  const notice = element("p", {
    text: "これはデモアプリです。上映・予約情報はすべてサンプルです。実際の情報は各映画館の公式サイトでご確認ください。",
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
