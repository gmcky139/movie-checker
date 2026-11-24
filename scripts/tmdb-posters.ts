import { isValidDateString } from "../src/domain/date";
import type { AppData, Movie, PosterCoverage } from "../src/domain/types";
import type { NormalizedRealData } from "./normalize-movies";
import type { TmdbApi } from "./tmdb-client";
import {
  TMDB_MATCH_RULES,
  TMDB_OVERRIDES,
  tmdbSearchTitle,
  type TmdbMatchRule,
  type TmdbOverride,
} from "./tmdb-overrides";

const LOCAL_FALLBACK = "images/posters/placeholder.svg";
const MINIMUM_COVERAGE = 70;

export type TmdbMovie = {
  id: number;
  title: string;
  originalTitle: string;
  posterPath: string | null;
  releaseDate?: string;
  releaseYear?: number;
  adult: boolean;
};

type EnrichmentOptions = {
  api: TmdbApi;
  overrides?: Readonly<Record<string, TmdbOverride>>;
  rules?: Readonly<Record<string, TmdbMatchRule>>;
  minimumCoverage?: number;
};

function record(value: unknown): Record<string, unknown> | undefined {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

function normalizeTitle(value: string): string {
  return value
    .normalize("NFKC")
    .toLocaleLowerCase("ja-JP")
    .replace(/[\s\p{P}\p{S}]+/gu, "");
}

function parseMovie(value: unknown): TmdbMovie | undefined {
  const item = record(value);
  if (!item || !Number.isSafeInteger(item.id) || typeof item.title !== "string") return undefined;
  const originalTitle = typeof item.original_title === "string" ? item.original_title : "";
  const posterPath = typeof item.poster_path === "string" ? item.poster_path : null;
  const releaseDate =
    typeof item.release_date === "string" && isValidDateString(item.release_date)
      ? item.release_date
      : undefined;
  return {
    id: Number(item.id),
    title: item.title,
    originalTitle,
    posterPath,
    ...(releaseDate ? { releaseDate, releaseYear: Number(releaseDate.slice(0, 4)) } : {}),
    adult: item.adult === true,
  };
}

function searchResults(value: unknown): TmdbMovie[] {
  const results = record(value)?.results;
  return Array.isArray(results)
    ? results.map(parseMovie).filter((item): item is TmdbMovie => item !== undefined)
    : [];
}

function japaneseSynopsis(value: unknown, movieId: number): string | undefined {
  const response = record(value);
  if (response?.id !== movieId || !Array.isArray(response.translations)) {
    throw new Error(`Invalid TMDB movie translations for ID ${movieId}`);
  }
  let japanese: string | undefined;
  for (const item of response.translations) {
    const translation = record(item);
    if (translation?.iso_639_1 !== "ja") continue;
    const overview = record(translation.data)?.overview;
    const synopsis = typeof overview === "string" ? overview.trim() : "";
    if (!synopsis) continue;
    if (translation.iso_3166_1 === "JP") return synopsis;
    japanese ??= synopsis;
  }
  return japanese;
}

function posterSizes(value: unknown): { baseUrl: string; sizes: string[] } {
  const images = record(record(value)?.images);
  const baseUrl = images?.secure_base_url;
  const sizes = images?.poster_sizes;
  if (typeof baseUrl !== "string" || !Array.isArray(sizes)) {
    throw new Error("TMDB configuration is missing poster settings");
  }
  const url = new URL(baseUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "image.tmdb.org" ||
    url.username !== "" ||
    url.password !== "" ||
    (url.port !== "" && url.port !== "443") ||
    url.pathname !== "/t/p/" ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    throw new Error("TMDB image base URL is outside the allowlist");
  }
  const safeSizes = sizes.filter(
    (size): size is string =>
      typeof size === "string" && (/^w\d+$/u.test(size) || size === "original"),
  );
  if (safeSizes.length === 0) throw new Error("TMDB configuration has no usable poster size");
  return { baseUrl: url.toString(), sizes: safeSizes };
}

export function choosePosterSize(sizes: string[]): string {
  if (sizes.includes("w500")) return "w500";
  const numeric = sizes
    .filter((size) => /^w\d+$/u.test(size))
    .map((size) => ({ size, width: Number(size.slice(1)) }))
    .sort((left, right) => Math.abs(left.width - 500) - Math.abs(right.width - 500));
  return numeric[0]?.size ?? (sizes.includes("original") ? "original" : "");
}

export function buildPosterUrl(baseUrl: string, size: string, path: string): string {
  if (!/^\/[A-Za-z0-9._-]+\.(?:jpg|jpeg|png|webp)$/u.test(path)) {
    throw new Error("TMDB poster path is invalid");
  }
  if (!/^(?:w\d+|original)$/u.test(size)) throw new Error("TMDB poster size is invalid");
  const url = new URL(`${size}${path}`, baseUrl);
  if (
    url.protocol !== "https:" ||
    url.hostname !== "image.tmdb.org" ||
    url.username !== "" ||
    url.password !== "" ||
    (url.port !== "" && url.port !== "443")
  ) {
    throw new Error("TMDB poster URL is outside the allowlist");
  }
  return url.toString();
}

function matchesTitle(candidate: TmdbMovie, accepted: ReadonlySet<string>): boolean {
  return [candidate.title, candidate.originalTitle]
    .filter(Boolean)
    .some((title) => accepted.has(normalizeTitle(title)));
}

function normalizeDuplicateTitle(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/gu, " ");
}

export function selectCandidate(
  movie: Movie,
  candidates: TmdbMovie[],
  rule?: TmdbMatchRule,
): TmdbMovie | undefined {
  const accepted = new Set(
    [movie.title, movie.originalTitle, rule?.query, ...(rule?.acceptedTitles ?? [])]
      .filter((value): value is string => Boolean(value))
      .map(normalizeTitle),
  );
  const year =
    rule?.releaseYear ?? (movie.releaseDate ? Number(movie.releaseDate.slice(0, 4)) : undefined);
  const matches = candidates.filter(
    (candidate) =>
      !candidate.adult &&
      matchesTitle(candidate, accepted) &&
      (year === undefined || candidate.releaseYear === year),
  );
  const [first, ...otherMatches] = matches;
  if (!first?.posterPath) return undefined;
  if (otherMatches.length === 0) return first;

  const title = normalizeDuplicateTitle(first.title);
  const originalTitle = normalizeDuplicateTitle(first.originalTitle);
  if (!title || !originalTitle || !first.releaseDate) return undefined;

  const sameWork = otherMatches.every(
    (candidate) =>
      candidate.releaseDate === first.releaseDate &&
      candidate.posterPath === first.posterPath &&
      normalizeDuplicateTitle(candidate.title) === title &&
      normalizeDuplicateTitle(candidate.originalTitle) === originalTitle,
  );
  if (!sameWork) return undefined;
  return otherMatches.reduce(
    (chosen, candidate) => (candidate.id < chosen.id ? candidate : chosen),
    first,
  );
}

function unmatched(movie: Movie, status: "unmatched" | "not-applicable"): Movie {
  return {
    ...movie,
    posterPath: LOCAL_FALLBACK,
    posterSource: "local",
    posterMatchStatus: status,
  };
}

export async function enrichMoviesWithTmdb(
  data: NormalizedRealData,
  options: EnrichmentOptions,
): Promise<AppData> {
  const overrides = options.overrides ?? TMDB_OVERRIDES;
  const rules = options.rules ?? TMDB_MATCH_RULES;
  const configuration = posterSizes(await options.api.configuration());
  const size = choosePosterSize(configuration.sizes);
  if (!size) throw new Error("TMDB configuration has no suitable poster size");

  const movies = await Promise.all(
    data.movies.map(async ({ alternateTitle, ...movie }): Promise<Movie> => {
      const override = overrides[movie.title];
      if (override === null) return unmatched(movie, "not-applicable");

      let candidate: TmdbMovie | undefined;
      if (override !== undefined) {
        const overridden = parseMovie(await options.api.movie(override));
        candidate = overridden?.id === override ? overridden : undefined;
      } else {
        const explicitRule = rules[movie.title];
        if (explicitRule?.officialUrl && explicitRule.officialUrl !== movie.officialUrl) {
          return unmatched(movie, "unmatched");
        }
        const query = explicitRule?.query ?? tmdbSearchTitle(movie.title);
        const selectionRule = explicitRule ?? (query === movie.title ? undefined : { query });
        const results = searchResults(await options.api.searchMovie(query));
        candidate = selectCandidate(movie, results, selectionRule);
        const alternateQuery = alternateTitle ? tmdbSearchTitle(alternateTitle) : undefined;
        const alternateKey = alternateQuery ? normalizeTitle(alternateQuery) : "";
        if (
          !candidate &&
          !explicitRule &&
          alternateQuery &&
          alternateKey &&
          alternateKey !== normalizeTitle(query)
        ) {
          const alternateResults = searchResults(await options.api.searchMovie(alternateQuery));
          const candidates = new Map(
            [...results, ...alternateResults].map((item) => [item.id, item]),
          );
          const acceptedAlternate = new Set([alternateKey]);
          candidate = selectCandidate(
            movie,
            [...candidates.values()].filter((item) => matchesTitle(item, acceptedAlternate)),
            selectionRule,
          );
        }
      }
      if (!candidate?.posterPath || candidate.adult) return unmatched(movie, "unmatched");
      const posterPath = buildPosterUrl(configuration.baseUrl, size, candidate.posterPath);
      const synopsis = japaneseSynopsis(
        await options.api.movieTranslations(candidate.id),
        candidate.id,
      );
      return {
        ...movie,
        tmdbId: candidate.id,
        posterPath,
        ...(synopsis ? { synopsis } : {}),
        posterSource: "tmdb",
        posterMatchStatus: "matched",
      };
    }),
  );

  const notApplicableCount = movies.filter(
    (movie) => movie.posterMatchStatus === "not-applicable",
  ).length;
  const matchedCount = movies.filter((movie) => movie.posterMatchStatus === "matched").length;
  const eligibleCount = movies.length - notApplicableCount;
  const unmatchedTitles = movies
    .filter((movie) => movie.posterMatchStatus === "unmatched")
    .map((movie) => movie.title);
  const coveragePercent = eligibleCount === 0 ? 100 : (matchedCount / eligibleCount) * 100;
  const posterCoverage: PosterCoverage = {
    eligibleCount,
    matchedCount,
    notApplicableCount,
    coveragePercent: Number(coveragePercent.toFixed(1)),
    unmatchedTitles,
  };
  console.log(
    `[tmdb] eligible=${eligibleCount} matched=${matchedCount} not-applicable=${notApplicableCount} coverage=${posterCoverage.coveragePercent}%`,
  );
  console.log(
    `[tmdb] unmatched=${unmatchedTitles.length > 0 ? unmatchedTitles.join(" | ") : "none"}`,
  );

  if (movies.length > 0 && matchedCount === 0) {
    throw new Error("TMDB poster matching returned zero matches");
  }
  const minimumCoverage = options.minimumCoverage ?? MINIMUM_COVERAGE;
  if (eligibleCount > 0 && coveragePercent < minimumCoverage) {
    console.warn(
      `[tmdb] WARNING: poster coverage ${posterCoverage.coveragePercent}% is below ${minimumCoverage}%; unmatched movies will use the local placeholder`,
    );
  }
  return { ...data, movies, posterCoverage };
}
