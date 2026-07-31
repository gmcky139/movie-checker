import { access, readFile } from "node:fs/promises";
import { resolve, sep } from "node:path";
import { pathToFileURL } from "node:url";
import { createDateRange, isValidDateString } from "../src/domain/date";
import type { Movie, Screening, Theater } from "../src/domain/types";

type ValidationOptions = {
  now?: Date;
  publicRoot?: string;
  checkPosters?: boolean;
};

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isHttpsUrl(value: unknown): value is string {
  if (!isNonEmptyString(value)) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}

function validateMovie(value: unknown, index: number, errors: string[]): value is Movie {
  const label = `movies[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  let valid = true;
  if (!isNonEmptyString(value.id) || !ID_PATTERN.test(value.id)) {
    errors.push(`${label}.id is invalid`);
    valid = false;
  }
  if (!isNonEmptyString(value.title)) {
    errors.push(`${label}.title is required`);
    valid = false;
  }
  if (!isNonEmptyString(value.synopsis)) {
    errors.push(`${label}.synopsis is required`);
    valid = false;
  }
  if (!Number.isInteger(value.durationMinutes) || Number(value.durationMinutes) < 1) {
    errors.push(`${label}.durationMinutes must be a positive integer`);
    valid = false;
  }
  if (!isNonEmptyString(value.releaseDate) || !isValidDateString(value.releaseDate)) {
    errors.push(`${label}.releaseDate is invalid`);
    valid = false;
  }
  if (
    !Array.isArray(value.genres) ||
    value.genres.length === 0 ||
    !value.genres.every(isNonEmptyString)
  ) {
    errors.push(`${label}.genres must contain values`);
    valid = false;
  }
  if (!isNonEmptyString(value.posterPath)) {
    errors.push(`${label}.posterPath is required`);
    valid = false;
  }
  if (value.originalTitle !== undefined && !isNonEmptyString(value.originalTitle)) {
    errors.push(`${label}.originalTitle must not be empty`);
    valid = false;
  }
  return valid;
}

function validateTheater(value: unknown, index: number, errors: string[]): value is Theater {
  const label = `theaters[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  let valid = true;
  if (!isNonEmptyString(value.id) || !ID_PATTERN.test(value.id)) {
    errors.push(`${label}.id is invalid`);
    valid = false;
  }
  for (const field of ["name", "area", "description"] as const) {
    if (!isNonEmptyString(value[field])) {
      errors.push(`${label}.${field} is required`);
      valid = false;
    }
  }
  for (const field of ["officialUrl", "ticketUrl"] as const) {
    if (!isHttpsUrl(value[field])) {
      errors.push(`${label}.${field} must be an HTTPS URL`);
      valid = false;
    }
  }
  return valid;
}

function validateScreening(value: unknown, index: number, errors: string[]): value is Screening {
  const label = `screenings[${index}]`;
  if (!isRecord(value)) {
    errors.push(`${label} must be an object`);
    return false;
  }
  let valid = true;
  for (const field of ["id", "movieId", "theaterId"] as const) {
    if (!isNonEmptyString(value[field]) || !ID_PATTERN.test(value[field])) {
      errors.push(`${label}.${field} is invalid`);
      valid = false;
    }
  }
  if (!isNonEmptyString(value.date) || !isValidDateString(value.date)) {
    errors.push(`${label}.date is invalid`);
    valid = false;
  }
  if (!isNonEmptyString(value.startTime) || !TIME_PATTERN.test(value.startTime)) {
    errors.push(`${label}.startTime is invalid`);
    valid = false;
  }
  if (!isNonEmptyString(value.endTime) || !TIME_PATTERN.test(value.endTime)) {
    errors.push(`${label}.endTime is invalid`);
    valid = false;
  }
  if (
    typeof value.startTime === "string" &&
    typeof value.endTime === "string" &&
    TIME_PATTERN.test(value.startTime) &&
    TIME_PATTERN.test(value.endTime) &&
    value.endTime <= value.startTime
  ) {
    errors.push(`${label}.endTime must be after startTime`);
    valid = false;
  }
  if (value.ticketUrl !== undefined && !isHttpsUrl(value.ticketUrl)) {
    errors.push(`${label}.ticketUrl must be an HTTPS URL`);
    valid = false;
  }
  return valid;
}

function duplicateValues(values: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

async function validatePosterPaths(
  movies: Movie[],
  publicRoot: string,
  errors: string[],
): Promise<void> {
  const normalizedRoot = resolve(publicRoot);
  for (const movie of movies) {
    const poster = resolve(normalizedRoot, movie.posterPath);
    if (!poster.startsWith(`${normalizedRoot}${sep}`)) {
      errors.push(`Poster path escapes public directory: ${movie.posterPath}`);
      continue;
    }
    try {
      await access(poster);
    } catch {
      errors.push(`Poster does not exist: ${movie.posterPath}`);
    }
  }
}

export async function validateAppData(
  input: unknown,
  options: ValidationOptions = {},
): Promise<string[]> {
  const errors: string[] = [];
  if (!isRecord(input)) return ["Root data must be an object"];

  if (input.schemaVersion !== 1) errors.push("schemaVersion must be 1");
  if (!isNonEmptyString(input.generatedAt) || Number.isNaN(Date.parse(input.generatedAt))) {
    errors.push("generatedAt must be an ISO date");
  }
  if (input.timezone !== "Asia/Tokyo") errors.push("timezone must be Asia/Tokyo");
  if (input.sourceMode !== "sample" && input.sourceMode !== "live") {
    errors.push("sourceMode must be sample or live");
  }

  const dates = Array.isArray(input.dates) ? input.dates : [];
  const movieValues = Array.isArray(input.movies) ? input.movies : [];
  const theaterValues = Array.isArray(input.theaters) ? input.theaters : [];
  const screeningValues = Array.isArray(input.screenings) ? input.screenings : [];
  if (!Array.isArray(input.dates)) errors.push("dates must be an array");
  if (!Array.isArray(input.movies)) errors.push("movies must be an array");
  if (!Array.isArray(input.theaters)) errors.push("theaters must be an array");
  if (!Array.isArray(input.screenings)) errors.push("screenings must be an array");

  const validDates = dates.filter(
    (date): date is string => typeof date === "string" && isValidDateString(date),
  );
  if (validDates.length !== dates.length) errors.push("dates contains an invalid date");
  const expectedDates = createDateRange(options.now ?? new Date());
  if (dates.length !== 4 || dates.some((date, index) => date !== expectedDates[index])) {
    errors.push(`dates must be the current four Tokyo dates: ${expectedDates.join(", ")}`);
  }

  const movies = movieValues.filter((movie, index): movie is Movie =>
    validateMovie(movie, index, errors),
  );
  const theaters = theaterValues.filter((theater, index): theater is Theater =>
    validateTheater(theater, index, errors),
  );
  const screenings = screeningValues.filter((screening, index): screening is Screening =>
    validateScreening(screening, index, errors),
  );

  if (movies.length < 8) errors.push("At least 8 movies are required");
  if (theaters.length < 4) errors.push("At least 4 theaters are required");
  for (const [label, ids] of [
    ["movie", movies.map((movie) => movie.id)],
    ["theater", theaters.map((theater) => theater.id)],
    ["screening", screenings.map((screening) => screening.id)],
  ] as const) {
    const duplicates = duplicateValues(ids);
    if (duplicates.length > 0) errors.push(`Duplicate ${label} IDs: ${duplicates.join(", ")}`);
  }

  const movieIds = new Set(movies.map((movie) => movie.id));
  const theaterIds = new Set(theaters.map((theater) => theater.id));
  const dateSet = new Set(validDates);
  const scheduleKeys: string[] = [];
  for (const screening of screenings) {
    if (!movieIds.has(screening.movieId)) {
      errors.push(`Unknown movie reference: ${screening.movieId}`);
    }
    if (!theaterIds.has(screening.theaterId)) {
      errors.push(`Unknown theater reference: ${screening.theaterId}`);
    }
    if (!dateSet.has(screening.date)) {
      errors.push(`Screening date is not available: ${screening.date}`);
    }
    scheduleKeys.push(
      [screening.movieId, screening.theaterId, screening.date, screening.startTime].join("|"),
    );
  }
  const duplicateSchedules = duplicateValues(scheduleKeys);
  if (duplicateSchedules.length > 0) {
    errors.push(`Duplicate screenings: ${duplicateSchedules.join(", ")}`);
  }

  for (const movie of movies) {
    if (!screenings.some((screening) => screening.movieId === movie.id)) {
      errors.push(`Movie has no screening: ${movie.id}`);
    }
  }
  for (const theater of theaters) {
    for (const date of validDates) {
      const daily = screenings.filter(
        (screening) => screening.theaterId === theater.id && screening.date === date,
      );
      const dailyMovieIds = new Set(daily.map((screening) => screening.movieId));
      if (dailyMovieIds.size < 3) {
        errors.push(`${theater.id} has fewer than 3 movies on ${date}`);
      }
      for (const movieId of dailyMovieIds) {
        if (daily.filter((screening) => screening.movieId === movieId).length < 2) {
          errors.push(`${theater.id}/${movieId}/${date} has fewer than 2 screenings`);
        }
      }
    }
  }

  if (options.checkPosters !== false) {
    await validatePosterPaths(
      movies,
      options.publicRoot ?? resolve(process.cwd(), "public"),
      errors,
    );
  }
  return errors;
}

async function main(): Promise<void> {
  const inputPath = resolve(process.cwd(), "src/data/generated.json");
  const parsed: unknown = JSON.parse(await readFile(inputPath, "utf8"));
  const errors = await validateAppData(parsed);
  if (errors.length > 0) {
    for (const error of errors) console.error(`- ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Data validation passed: ${inputPath}`);
}

const entryPath = process.argv[1];
if (entryPath && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  await main();
}
