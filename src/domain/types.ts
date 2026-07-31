export type AppData = {
  schemaVersion: 1;
  generatedAt: string;
  timezone: "Asia/Tokyo";
  sourceMode: "sample" | "live";
  dates: string[];
  movies: Movie[];
  theaters: Theater[];
  screenings: Screening[];
};

export type Movie = {
  id: string;
  title: string;
  originalTitle?: string;
  synopsis: string;
  durationMinutes: number;
  releaseDate: string;
  genres: string[];
  posterPath: string;
};

export type Theater = {
  id: string;
  name: string;
  area: string;
  description: string;
  officialUrl: string;
  ticketUrl: string;
};

export type Screening = {
  id: string;
  movieId: string;
  theaterId: string;
  date: string;
  startTime: string;
  endTime: string;
  ticketUrl?: string;
};

export interface MovieDataProvider {
  load(): Promise<AppData>;
}
