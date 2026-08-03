export type AppData = {
  schemaVersion: 1;
  dataMode: DataMode;
  generatedAt: string;
  timezone: "Asia/Tokyo";
  sources: DataSourceStatus[];
  dates: string[];
  movies: Movie[];
  theaters: Theater[];
  screenings: Screening[];
  posterCoverage?: PosterCoverage;
};

export type DataMode = "sample" | "real";

export type DataSourceStatus = {
  providerId: string;
  theaterId: string;
  theaterName: string;
  sourceUrl: string;
  fetchedAt: string;
  status: "success" | "failed";
};

export type Movie = {
  id: string;
  title: string;
  originalTitle?: string;
  synopsis?: string;
  durationMinutes?: number;
  releaseDate?: string;
  genres: string[];
  posterPath: string;
  posterSource?: "tmdb" | "local";
  posterMatchStatus?: "matched" | "unmatched" | "not-applicable";
  tmdbId?: number;
  officialUrl?: string;
};

export type PosterCoverage = {
  eligibleCount: number;
  matchedCount: number;
  notApplicableCount: number;
  coveragePercent: number;
  unmatchedTitles: string[];
};

export type Theater = {
  id: string;
  name: string;
  area: string;
  description: string;
  officialUrl: string;
  ticketUrl?: string;
};

export type Screening = {
  id: string;
  movieId: string;
  theaterId: string;
  date: string;
  startTime: string;
  endTime: string;
  startsNextDay?: boolean;
  endsNextDay?: boolean;
  formatLabel?: string;
  screenName?: string;
  salesStatus?: string;
  sourceUrl?: string;
  ticketUrl?: string;
};

export interface MovieDataProvider {
  load(): Promise<AppData>;
}
