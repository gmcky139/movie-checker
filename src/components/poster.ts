import type { Movie } from "../domain/types";
import { element } from "./dom";

const FALLBACK_POSTER = "images/posters/placeholder.svg";

export function createPoster(movie: Movie, eager = false): HTMLImageElement {
  const image = element("img", {
    className: "poster",
    attributes: {
      src: movie.posterPath,
      alt: `${movie.title}のデモポスター`,
      width: "480",
      height: "720",
      loading: eager ? "eager" : "lazy",
      decoding: "async",
    },
  });
  image.addEventListener(
    "error",
    () => {
      image.src = FALLBACK_POSTER;
      image.alt = `${movie.title}のポスター画像を表示できません`;
      image.classList.add("poster--fallback");
    },
    { once: true },
  );
  return image;
}
