export type HomeUrlOptions = {
  date?: string;
  query?: string;
};

const REAL_EXTERNAL_HOSTS = new Set([
  "cinema.109cinemas.net",
  "109cinemas.net",
  "ticket.midlandcinema.jp",
  "www.midland-sq-cinema.jp",
  "midland-sq-cinema.jp",
  "theater.aeoncinema.com",
  "www.aeoncinema.com",
  "aeoncinema.com",
]);

function withParams(page: string, values: Record<string, string | undefined>): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== "") {
      params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${page}?${query}` : page;
}

export function homeUrl(options: HomeUrlOptions = {}): string {
  return withParams("index.html", {
    date: options.date,
    q: options.query?.trim() || undefined,
  });
}

export function movieUrl(movieId: string, date: string): string {
  return withParams("movie.html", { id: movieId, date });
}

export function theaterUrl(theaterId: string, date: string): string {
  return withParams("theater.html", { id: theaterId, date });
}

export function readSearchState(
  search: string,
  availableDates: string[],
): { date: string; query: string; usedFallback: boolean } {
  const params = new URLSearchParams(search);
  const requestedDate = params.get("date") ?? "";
  const fallbackDate = availableDates[0] ?? "";
  const date = availableDates.includes(requestedDate) ? requestedDate : fallbackDate;
  return {
    date,
    query: (params.get("q") ?? "").trim(),
    usedFallback: requestedDate !== "" && requestedDate !== date,
  };
}

export function readId(search: string): string {
  return (new URLSearchParams(search).get("id") ?? "").trim();
}

export function isSafeExternalUrl(value: string | undefined): value is string {
  if (!value) return false;
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" &&
      url.username === "" &&
      url.password === "" &&
      (url.port === "" || url.port === "443")
    );
  } catch {
    return false;
  }
}

export function isSafeRealExternalUrl(value: string | undefined): value is string {
  if (!isSafeExternalUrl(value)) return false;
  const url = new URL(value);
  return (
    url.username === "" &&
    url.password === "" &&
    (url.port === "" || url.port === "443") &&
    REAL_EXTERNAL_HOSTS.has(url.hostname)
  );
}
