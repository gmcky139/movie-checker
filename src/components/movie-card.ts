import { formatMinutes, getTokyoDate } from "../domain/date";
import { getNextScreening, getScreeningsForMovie, getTheatersForMovie } from "../domain/selectors";
import type { AppData, Movie } from "../domain/types";
import { movieUrl } from "../domain/urls";
import { append, element } from "./dom";
import { createPoster } from "./poster";

export function createMovieCard(
  data: AppData,
  movie: Movie,
  date: string,
  now: Date,
  eager = false,
): HTMLElement {
  const card = element("a", {
    className: "movie-card",
    attributes: {
      href: movieUrl(movie.id, date),
      "aria-label": `${movie.title}の詳細を見る`,
    },
  });
  const posterFrame = element("div", { className: "movie-card__poster" });
  posterFrame.append(createPoster(movie, data.dataMode, eager));

  const body = element("div", { className: "movie-card__body" });
  const title = element("h3", { className: "movie-card__title", text: movie.title });
  const genres = element("p", {
    className: "movie-card__genres",
    text: movie.genres.join("・"),
  });
  const metadata = [
    movie.durationMinutes ? formatMinutes(movie.durationMinutes) : undefined,
    `${getTheatersForMovie(data, movie.id, date).length}館で上映`,
  ].filter((value): value is string => value !== undefined);
  const meta = element("p", {
    className: "movie-card__meta",
    text: metadata.join(" / "),
  });
  const screenings = getScreeningsForMovie(data, movie.id, date);
  const next = getNextScreening(screenings, now);
  const isToday = date === getTokyoDate(now);
  const schedule = element("p", {
    className: `movie-card__next${!next && isToday ? " movie-card__next--finished" : ""}`,
    text: next
      ? `次回 ${next.startTime}`
      : isToday
        ? "本日の上映終了"
        : `最初の上映 ${screenings[0]?.startTime ?? "時刻未定"}`,
  });
  append(body, title);
  if (movie.genres.length > 0) body.append(genres);
  append(body, meta, schedule);
  append(card, posterFrame, body);
  return card;
}
