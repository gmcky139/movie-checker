import { posterAlt, usesLocalPosterFallback } from "../domain/presentation";
import type { DataMode, Movie } from "../domain/types";
import { element } from "./dom";

const FALLBACK_POSTER = "images/posters/placeholder.svg";

function createFallbackPoster(movie: Movie): HTMLElement {
  const fallback = element("span", {
    className: "poster poster--fallback",
    attributes: {
      role: "img",
      "aria-label": `${movie.title}のポスター画像なし`,
    },
  });
  fallback.append(
    element("img", {
      className: "poster-fallback__image",
      attributes: { src: FALLBACK_POSTER, alt: "", width: "480", height: "720" },
    }),
    element("span", { className: "poster-fallback__title", text: movie.title }),
  );
  return fallback;
}

export function createPoster(movie: Movie, mode: DataMode, eager = false): HTMLElement {
  if (usesLocalPosterFallback(movie, mode)) return createFallbackPoster(movie);
  const image = element("img", {
    className: "poster",
    attributes: {
      src: movie.posterPath,
      alt: posterAlt(movie.title, mode, movie.posterMatchStatus),
      width: "480",
      height: "720",
      loading: eager ? "eager" : "lazy",
      decoding: "async",
    },
  });
  image.addEventListener(
    "error",
    () => {
      image.replaceWith(createFallbackPoster(movie));
    },
    { once: true },
  );
  return image;
}
