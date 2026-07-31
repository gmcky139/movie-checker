import { isScreeningFinished, screeningStart } from "./date";
import type { AppData, Movie, Screening, Theater } from "./types";

const byStartTime = (left: Screening, right: Screening): number =>
  left.date.localeCompare(right.date) || left.startTime.localeCompare(right.startTime);

export function getAvailableDates(data: AppData): string[] {
  return [...data.dates];
}

export function getMoviesForDate(data: AppData, date: string): Movie[] {
  const movieIds = new Set(
    data.screenings
      .filter((screening) => screening.date === date)
      .map((screening) => screening.movieId),
  );
  return data.movies.filter((movie) => movieIds.has(movie.id));
}

export function searchMovies(movies: Movie[], query: string): Movie[] {
  const normalized = query.trim().toLocaleLowerCase("ja-JP");
  if (!normalized) {
    return [...movies];
  }
  return movies.filter((movie) => movie.title.toLocaleLowerCase("ja-JP").includes(normalized));
}

export function getTheatersForMovie(data: AppData, movieId: string, date: string): Theater[] {
  const theaterIds = new Set(
    data.screenings
      .filter((screening) => screening.movieId === movieId && screening.date === date)
      .map((screening) => screening.theaterId),
  );
  return data.theaters.filter((theater) => theaterIds.has(theater.id));
}

export function getMoviesForTheater(data: AppData, theaterId: string, date: string): Movie[] {
  const movieIds = new Set(
    data.screenings
      .filter((screening) => screening.theaterId === theaterId && screening.date === date)
      .map((screening) => screening.movieId),
  );
  return data.movies.filter((movie) => movieIds.has(movie.id));
}

export function getScreeningsForMovie(data: AppData, movieId: string, date: string): Screening[] {
  return data.screenings
    .filter((screening) => screening.movieId === movieId && screening.date === date)
    .sort(byStartTime);
}

export function getScreeningsForTheater(
  data: AppData,
  theaterId: string,
  date: string,
): Screening[] {
  return data.screenings
    .filter((screening) => screening.theaterId === theaterId && screening.date === date)
    .sort(byStartTime);
}

export function getScreeningsForMovieAtTheater(
  data: AppData,
  movieId: string,
  theaterId: string,
  date: string,
): Screening[] {
  return data.screenings
    .filter(
      (screening) =>
        screening.movieId === movieId &&
        screening.theaterId === theaterId &&
        screening.date === date,
    )
    .sort(byStartTime);
}

export function getNextScreening(screenings: Screening[], now: Date): Screening | null {
  return (
    [...screenings]
      .sort(byStartTime)
      .find((screening) => screeningStart(screening).getTime() >= now.getTime()) ?? null
  );
}

export function sortMoviesForSchedule(
  data: AppData,
  movies: Movie[],
  date: string,
  now: Date,
): Movie[] {
  return [...movies].sort((left, right) => {
    const leftScreenings = getScreeningsForMovie(data, left.id, date);
    const rightScreenings = getScreeningsForMovie(data, right.id, date);
    const leftNext = getNextScreening(leftScreenings, now);
    const rightNext = getNextScreening(rightScreenings, now);

    if (leftNext && !rightNext) return -1;
    if (!leftNext && rightNext) return 1;

    const leftTime = leftNext?.startTime ?? leftScreenings[0]?.startTime ?? "99:99";
    const rightTime = rightNext?.startTime ?? rightScreenings[0]?.startTime ?? "99:99";
    return leftTime.localeCompare(rightTime) || left.title.localeCompare(right.title, "ja");
  });
}

export function hasFinished(screening: Screening, now: Date): boolean {
  return isScreeningFinished(screening, now);
}
