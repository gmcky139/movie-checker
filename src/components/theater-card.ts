import { getMoviesForTheater } from "../domain/selectors";
import type { AppData, Theater } from "../domain/types";
import { theaterUrl } from "../domain/urls";
import { append, element } from "./dom";

export function createTheaterCard(data: AppData, theater: Theater, date: string): HTMLElement {
  const article = element("article", { className: "theater-card" });
  const area = element("p", { className: "eyebrow", text: theater.area });
  const heading = element("h3", { className: "theater-card__title", text: theater.name });
  const description = element("p", { text: theater.description });
  const count = getMoviesForTheater(data, theater.id, date).length;
  const meta = element("p", {
    className: "theater-card__meta",
    text: `${count}作品を上映`,
  });
  const link = element("a", {
    className: "text-link",
    text: "上映作品を見る →",
    attributes: { href: theaterUrl(theater.id, date) },
  });
  append(article, area, heading, description, meta, link);
  return article;
}
