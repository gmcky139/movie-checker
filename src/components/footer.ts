import { appConfig } from "../config";
import {
  TMDB_ATTRIBUTION_NOTICE,
  TMDB_ATTRIBUTION_URL,
  TMDB_LOGO_PATH,
} from "../domain/presentation";
import type { AppData } from "../domain/types";
import { append, element } from "./dom";
import { createExternalLink } from "./external-link";

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
  append(inner, notice);
  if (data.dataMode === "real") {
    const sources = element("div", {
      className: "external-links",
      attributes: { "aria-label": "上映情報元" },
    });
    for (const source of data.sources) {
      sources.append(createExternalLink(`情報元: ${source.theaterName}`, source.sourceUrl, false));
    }
    inner.append(sources);
    const attribution = element("section", {
      className: "tmdb-attribution",
      attributes: { "aria-label": "TMDBクレジット" },
    });
    const tmdbLink = element("a", {
      className: "tmdb-attribution__link",
      attributes: {
        href: TMDB_ATTRIBUTION_URL,
        target: "_blank",
        rel: "noopener noreferrer",
        "aria-label": "TMDB公式サイトを外部タブで開く",
      },
    });
    tmdbLink.append(
      element("img", {
        className: "tmdb-attribution__logo",
        attributes: {
          src: TMDB_LOGO_PATH,
          alt: "TMDB",
          width: "273",
          height: "36",
        },
      }),
    );
    attribution.append(
      tmdbLink,
      element("p", {
        text: TMDB_ATTRIBUTION_NOTICE,
      }),
    );
    inner.append(attribution);
  }
  inner.append(repository);
  footer.append(inner);
  return footer;
}
