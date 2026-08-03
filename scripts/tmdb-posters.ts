import type { AppData, Movie, PosterCoverage } from "../src/domain/types";
import type { TmdbApi } from "./tmdb-client";
import {
  TMDB_MATCH_RULES,
  TMDB_OVERRIDES,
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
  const releaseYear =
    typeof item.release_date === "string" && /^\d{4}-/u.test(item.release_date)
      ? Number(item.release_date.slice(0, 4))
      : undefined;
  return {
    id: Number(item.id),
    title: item.title,
    originalTitle,
    posterPath,
    ...(releaseYear ? { releaseYear } : {}),
    adult: item.adult === true,
  };
}

function searchResults(value: unknown): TmdbMovie[] {
  const results = record(value)?.results;
  return Array.isArray(results)
    ? results.map(parseMovie).filter((item): item is TmdbMovie => item !== undefined)
    : [];
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
  const matches = candidates.filter((candidate) => {
    if (candidate.adult || !candidate.posterPath) return false;
    const titleMatches = [candidate.title, candidate.originalTitle]
      .filter(Boolean)
      .some((title) => accepted.has(normalizeTitle(title)));
    return titleMatches && (year === undefined || candidate.releaseYear === year);
  });
  return matches.length === 1 ? matches[0] : undefined;
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
  data: AppData,
  options: EnrichmentOptions,
): Promise<AppData> {
  const overrides = options.overrides ?? TMDB_OVERRIDES;
  const rules = options.rules ?? TMDB_MATCH_RULES;
  const configuration = posterSizes(await options.api.configuration());
  const size = choosePosterSize(configuration.sizes);
  if (!size) throw new Error("TMDB configuration has no suitable poster size");

  const movies = await Promise.all(
    data.movies.map(async (movie): Promise<Movie> => {
      const override = overrides[movie.title];
      if (override === null) return unmatched(movie, "not-applicable");

      let candidate: TmdbMovie | undefined;
      if (override !== undefined) {
        const overridden = parseMovie(await options.api.movie(override));
        candidate = overridden?.id === override ? overridden : undefined;
      } else {
        const rule = rules[movie.title];
        const results = searchResults(await options.api.searchMovie(rule?.query ?? movie.title));
        candidate = selectCandidate(movie, results, rule);
      }
      if (!candidate?.posterPath || candidate.adult) return unmatched(movie, "unmatched");
      return {
        ...movie,
        tmdbId: candidate.id,
        posterPath: buildPosterUrl(configuration.baseUrl, size, candidate.posterPath),
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

  const minimumCoverage = options.minimumCoverage ?? MINIMUM_COVERAGE;
  if (eligibleCount > 0 && (matchedCount === 0 || coveragePercent < minimumCoverage)) {
    throw new Error(
      `TMDB poster coverage ${posterCoverage.coveragePercent}% is below ${minimumCoverage}%`,
    );
  }
  return { ...data, movies, posterCoverage };
}
