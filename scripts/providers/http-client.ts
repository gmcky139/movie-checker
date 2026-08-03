const USER_AGENT = "movie-checker/1.0 (+https://github.com/gmcky139/movie-checker)";
const DEFAULT_TIMEOUT_MS = 15_000;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const MAX_RETRIES = 2;

type SafeHttpClientOptions = {
  timeoutMs?: number;
  maxBytes?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
};

export type HttpResponseData = {
  url: string;
  contentType: string;
  body: Uint8Array;
  fetchedAt: string;
};

type GetOptions = {
  allowedHosts: ReadonlySet<string>;
  expected: "html" | "json";
  allowNotFound?: boolean;
};

export class HttpStatusError extends Error {
  constructor(
    readonly status: number,
    readonly url: string,
  ) {
    super(`HTTP ${status} from ${url}`);
    this.name = "HttpStatusError";
  }
}

class Semaphore {
  private active = 0;
  private readonly waiting: Array<() => void> = [];

  constructor(private readonly limit: number) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    if (this.active >= this.limit) {
      await new Promise<void>((resolve) => this.waiting.push(resolve));
    }
    this.active += 1;
    try {
      return await task();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}

function validateUrl(value: string, allowedHosts: ReadonlySet<string>): URL {
  const url = new URL(value);
  if (
    url.protocol !== "https:" ||
    url.username !== "" ||
    url.password !== "" ||
    (url.port !== "" && url.port !== "443") ||
    !allowedHosts.has(url.hostname)
  ) {
    throw new Error(`URL is outside the provider allowlist: ${url.origin}`);
  }
  return url;
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    await response.body?.cancel();
    throw new Error(`Response exceeds ${maxBytes} bytes: ${response.url}`);
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  while (true) {
    const result = await reader.read();
    if (result.done) break;
    length += result.value.length;
    if (length > maxBytes) {
      await reader.cancel();
      throw new Error(`Response exceeds ${maxBytes} bytes: ${response.url}`);
    }
    chunks.push(result.value);
  }

  const body = new Uint8Array(length);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.length;
  }
  return body;
}

function validateContent(response: Response, body: Uint8Array, expected: "html" | "json"): void {
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const prefix = new TextDecoder().decode(body.slice(0, 256)).trimStart();
  if (expected === "html") {
    if (
      !contentType.includes("text/html") ||
      !/^<!doctype\s+html|^<html|^<script|^<div/i.test(prefix)
    ) {
      throw new Error(`Response is not valid HTML: ${response.url}`);
    }
    return;
  }

  if (!prefix.startsWith("{") && !prefix.startsWith("[")) {
    throw new Error(`Response is not valid JSON: ${response.url}`);
  }
  try {
    JSON.parse(new TextDecoder().decode(body));
  } catch {
    throw new Error(`Response is not valid JSON: ${response.url}`);
  }
}

async function waitBeforeRetry(attempt: number, baseDelayMs: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, baseDelayMs * 2 ** attempt));
}

export class SafeHttpClient {
  private readonly semaphore = new Semaphore(2);
  private readonly cache = new Map<string, Promise<HttpResponseData | null>>();
  private readonly timeoutMs: number;
  private readonly maxBytes: number;
  private readonly maxRetries: number;
  private readonly retryBaseDelayMs: number;

  constructor(options: SafeHttpClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
    this.maxRetries = options.maxRetries ?? MAX_RETRIES;
    this.retryBaseDelayMs = options.retryBaseDelayMs ?? 250;
  }

  get(url: string, options: GetOptions): Promise<HttpResponseData | null> {
    const validated = validateUrl(url, options.allowedHosts).toString();
    const cached = this.cache.get(validated);
    if (cached) return cached;
    const request = this.semaphore.run(() => this.requestWithRetries(validated, options));
    this.cache.set(validated, request);
    return request;
  }

  private async requestWithRetries(
    url: string,
    options: GetOptions,
  ): Promise<HttpResponseData | null> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= this.maxRetries; attempt += 1) {
      try {
        const result = await this.requestFollowingRedirects(url, options);
        if (result instanceof Response && result.status >= 500) {
          await result.body?.cancel();
          throw new HttpStatusError(result.status, result.url || url);
        }
        if (result instanceof Response) {
          if (result.status === 404 && options.allowNotFound) {
            await result.body?.cancel();
            return null;
          }
          if (!result.ok) {
            await result.body?.cancel();
            throw new HttpStatusError(result.status, result.url || url);
          }
          const body = await readBoundedBody(result, this.maxBytes);
          validateContent(result, body, options.expected);
          return {
            url: result.url || url,
            contentType: result.headers.get("content-type") ?? "",
            body,
            fetchedAt: new Date().toISOString(),
          };
        }
        return result;
      } catch (error: unknown) {
        lastError = error;
        const terminalStatus =
          error instanceof HttpStatusError && [403, 404, 429].includes(error.status);
        const retryableStatus = error instanceof HttpStatusError && error.status >= 500;
        const retryableNetwork =
          error instanceof TypeError ||
          (error instanceof DOMException && ["AbortError", "TimeoutError"].includes(error.name));
        if (
          terminalStatus ||
          attempt >= this.maxRetries ||
          (!retryableStatus && !retryableNetwork)
        ) {
          throw error;
        }
        await waitBeforeRetry(attempt, this.retryBaseDelayMs);
      }
    }
    throw lastError;
  }

  private async requestFollowingRedirects(
    initialUrl: string,
    options: GetOptions,
  ): Promise<Response> {
    let currentUrl = validateUrl(initialUrl, options.allowedHosts);
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
      const response = await fetch(currentUrl, {
        redirect: "manual",
        credentials: "omit",
        signal: AbortSignal.timeout(this.timeoutMs),
        headers: {
          accept: options.expected === "json" ? "application/json, */*;q=0.1" : "text/html",
          "user-agent": USER_AGENT,
        },
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) return response;
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error(`Redirect has no location: ${currentUrl.toString()}`);
      currentUrl = validateUrl(new URL(location, currentUrl).toString(), options.allowedHosts);
    }
    throw new Error(`Too many redirects: ${initialUrl}`);
  }
}
