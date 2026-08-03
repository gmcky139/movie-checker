const API_HOST = "api.themoviedb.org";
const USER_AGENT = "movie-checker/1.0 (+https://github.com/gmcky139/movie-checker)";
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_RETRIES = 2;

export class TmdbHttpError extends Error {
  constructor(readonly status: number) {
    super(`TMDB API returned HTTP ${status}`);
    this.name = "TmdbHttpError";
  }
}

class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}

type TmdbClientOptions = {
  fetch?: typeof fetch;
  timeoutMs?: number;
  maxBytes?: number;
  maxRetries?: number;
  retryDelayMs?: number;
};

export interface TmdbApi {
  configuration(): Promise<unknown>;
  searchMovie(query: string): Promise<unknown>;
  movie(movieId: number): Promise<unknown>;
}

function validateApiUrl(value: string): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.hostname !== API_HOST ||
    url.username !== "" ||
    url.password !== "" ||
    (url.port !== "" && url.port !== "443")
  ) {
    throw new Error("TMDB API URL is outside the allowlist");
  }
  return url;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) {
    await response.body?.cancel();
    throw new Error("TMDB response exceeds the size limit");
  }
  if (!response.body) return new Uint8Array();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    length += result.value.byteLength;
    if (length > maxBytes) {
      await reader.cancel();
      throw new Error("TMDB response exceeds the size limit");
    }
    chunks.push(result.value);
  }
  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export class TmdbClient implements TmdbApi {
  private readonly cache = new Map<string, Promise<unknown>>();
  private readonly semaphore = new Semaphore(2);
  private readonly fetcher: typeof fetch;
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly maxRetries: number;
  private readonly retryDelayMs: number;

  constructor(
    private readonly token: string,
    options: TmdbClientOptions = {},
  ) {
    if (!token.trim()) throw new Error("TMDB_API_READ_TOKEN is required in real mode");
    this.fetcher = options.fetch ?? fetch;
    this.timeoutMs = options.timeoutMs ?? 15_000;
    this.maxBytes = options.maxBytes ?? MAX_BYTES;
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
    this.retryDelayMs = options.retryDelayMs ?? 250;
  }

  configuration(): Promise<unknown> {
    return this.getJson("https://api.themoviedb.org/3/configuration");
  }

  searchMovie(query: string): Promise<unknown> {
    const url = new URL("https://api.themoviedb.org/3/search/movie");
    url.searchParams.set("query", query);
    url.searchParams.set("language", "ja-JP");
    url.searchParams.set("region", "JP");
    url.searchParams.set("include_adult", "false");
    return this.getJson(url.toString());
  }

  movie(movieId: number): Promise<unknown> {
    if (!Number.isSafeInteger(movieId) || movieId < 1) throw new Error("Invalid TMDB movie ID");
    const url = new URL(`https://api.themoviedb.org/3/movie/${movieId}`);
    url.searchParams.set("language", "ja-JP");
    return this.getJson(url.toString());
  }

  private getJson(value: string): Promise<unknown> {
    const url = validateApiUrl(value).toString();
    const cached = this.cache.get(url);
    if (cached) return cached;
    const request = this.semaphore.run(() => this.requestWithRetries(url));
    this.cache.set(url, request);
    return request;
  }

  private async requestWithRetries(url: string): Promise<unknown> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        return await this.request(url);
      } catch (error: unknown) {
        lastError = error;
        const retryableStatus = error instanceof TmdbHttpError && error.status >= 500;
        const retryableNetwork =
          error instanceof TypeError ||
          (error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name));
        if (attempt >= this.maxRetries || (!retryableStatus && !retryableNetwork)) throw error;
        await new Promise<void>((resolve) => setTimeout(resolve, this.retryDelayMs * 2 ** attempt));
      }
    }
    throw lastError;
  }

  private async request(value: string): Promise<unknown> {
    let url = validateApiUrl(value);
    for (let redirects = 0; redirects <= 5; redirects += 1) {
      const response = await this.fetcher(url, {
        redirect: "manual",
        credentials: "omit",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          accept: "application/json",
          authorization: `Bearer ${this.token}`,
          "user-agent": USER_AGENT,
        },
      });
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get("location");
        await response.body?.cancel();
        if (!location) throw new Error("TMDB redirect has no location");
        url = validateApiUrl(new URL(location, url).toString());
        continue;
      }
      if (!response.ok) {
        await response.body?.cancel();
        throw new TmdbHttpError(response.status);
      }
      const body = await readBoundedBody(response, this.maxBytes);
      const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
      if (!contentType.includes("json")) throw new Error("TMDB response is not JSON");
      try {
        return JSON.parse(new TextDecoder().decode(body));
      } catch {
        throw new Error("TMDB response is not valid JSON");
      }
    }
    throw new Error("Too many TMDB redirects");
  }
}
