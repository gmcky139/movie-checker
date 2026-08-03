import { createSampleData } from "../scripts/generate-sample-data";
import {
  getMoviesForDate,
  getMoviesForTheater,
  getNextScreening,
  getScreeningsForMovie,
  getScreeningsForTheater,
  getTheatersForMovie,
  searchMovies,
  sortMoviesForSchedule,
} from "../src/domain/selectors";
import type { AppData, Movie, Screening } from "../src/domain/types";

const now = new Date("2026-07-31T00:00:00.000Z");
const data = createSampleData(now);
const date = data.dates[0] ?? "";

describe("movie search", () => {
  const movies: Movie[] = [
    {
      id: "movie-a",
      title: "MIDNIGHT Code",
      synopsis: "Synopsis",
      durationMinutes: 100,
      releaseDate: "2026-01-01",
      genres: ["Drama"],
      posterPath: "poster.svg",
    },
    {
      id: "movie-b",
      title: "朝の物語",
      synopsis: "Synopsis",
      durationMinutes: 90,
      releaseDate: "2026-01-02",
      genres: ["Drama"],
      posterPath: "poster.svg",
    },
  ];

  it("returns all movies for an empty query", () => {
    expect(searchMovies(movies, "  ")).toEqual(movies);
  });

  it("supports exact and partial matches", () => {
    expect(searchMovies(movies, "朝の物語")).toEqual([movies[1]]);
    expect(searchMovies(movies, "朝")).toEqual([movies[1]]);
  });

  it("ignores casing and surrounding whitespace", () => {
    expect(searchMovies(movies, "  midnight  ")).toEqual([movies[0]]);
  });

  it("returns an empty array when there is no match", () => {
    expect(searchMovies(movies, "該当なし")).toEqual([]);
  });
});

describe("screening selectors", () => {
  it("extracts movies for a date", () => {
    expect(getMoviesForDate(data, date).length).toBeGreaterThanOrEqual(8);
  });

  it("extracts screenings by movie, theater, and date", () => {
    const screening = data.screenings[0];
    expect(screening).toBeDefined();
    if (!screening) return;

    const movieScreenings = getScreeningsForMovie(data, screening.movieId, screening.date);
    const theaterScreenings = getScreeningsForTheater(data, screening.theaterId, screening.date);
    expect(movieScreenings.every((item) => item.movieId === screening.movieId)).toBe(true);
    expect(theaterScreenings.every((item) => item.theaterId === screening.theaterId)).toBe(true);
  });

  it("extracts related theaters and movies", () => {
    const screening = data.screenings[0];
    expect(screening).toBeDefined();
    if (!screening) return;

    expect(
      getTheatersForMovie(data, screening.movieId, screening.date).some(
        (theater) => theater.id === screening.theaterId,
      ),
    ).toBe(true);
    expect(
      getMoviesForTheater(data, screening.theaterId, screening.date).some(
        (movie) => movie.id === screening.movieId,
      ),
    ).toBe(true);
  });

  it("returns the next screening by start time", () => {
    const screenings: Screening[] = [
      {
        id: "late",
        movieId: "movie-a",
        theaterId: "theater-a",
        date: "2026-07-31",
        startTime: "18:00",
        endTime: "20:00",
      },
      {
        id: "past",
        movieId: "movie-a",
        theaterId: "theater-a",
        date: "2026-07-31",
        startTime: "09:00",
        endTime: "11:00",
      },
      {
        id: "next",
        movieId: "movie-a",
        theaterId: "theater-a",
        date: "2026-07-31",
        startTime: "13:00",
        endTime: "15:00",
      },
    ];
    expect(getNextScreening(screenings, new Date("2026-07-31T03:00:00.000Z"))?.id).toBe("next");
    expect(getNextScreening(screenings, new Date("2026-07-31T12:00:00.000Z"))).toBeNull();
  });

  it("sorts movies with no remaining screenings by title", () => {
    const candidates = data.movies.slice(0, 2);
    const titleSorted = [...candidates].sort((left, right) =>
      left.title.localeCompare(right.title, "ja"),
    );
    const earlierMovie = titleSorted[1];
    const laterMovie = titleSorted[0];
    expect(earlierMovie).toBeDefined();
    expect(laterMovie).toBeDefined();
    if (!earlierMovie || !laterMovie) return;

    const endedData: AppData = {
      ...data,
      movies: candidates,
      screenings: [
        {
          id: "ended-earlier",
          movieId: earlierMovie.id,
          theaterId: data.theaters[0]?.id ?? "theater-a",
          date,
          startTime: "09:00",
          endTime: "11:00",
        },
        {
          id: "ended-later",
          movieId: laterMovie.id,
          theaterId: data.theaters[0]?.id ?? "theater-a",
          date,
          startTime: "10:00",
          endTime: "12:00",
        },
      ],
    };

    expect(
      sortMoviesForSchedule(endedData, candidates, date, new Date("2026-07-31T13:00:00.000Z")).map(
        (movie) => movie.id,
      ),
    ).toEqual(titleSorted.map((movie) => movie.id));
  });
});
