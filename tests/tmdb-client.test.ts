import { TmdbClient } from "../scripts/tmdb-client";

function jsonResponse(value: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(value), {
    ...init,
    headers: { "content-type": "application/json", ...init.headers },
  });
}

describe("TMDB API client", () => {
  it("sends the token only as a Bearer header and caches identical searches", async () => {
    const token = "synthetic-secret-for-test";
    const requests: Array<{ url: URL; init?: RequestInit }> = [];
    const fetcher = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      requests.push({ url: new URL(input.toString()), init });
      return jsonResponse({ results: [] });
    });
    const client = new TmdbClient(token, { fetch: fetcher });
    await Promise.all([client.searchMovie("作品 A"), client.searchMovie("作品 A")]);

    expect(fetcher).toHaveBeenCalledTimes(1);
    const request = requests[0];
    expect(request).toBeDefined();
    if (!request) return;
    expect(request.url.hostname).toBe("api.themoviedb.org");
    expect(request.url.searchParams.get("query")).toBe("作品 A");
    expect(request.url.searchParams.get("language")).toBe("ja-JP");
    expect(request.url.searchParams.get("region")).toBe("JP");
    expect(request.url.searchParams.get("include_adult")).toBe("false");
    expect(request.url.toString()).not.toContain(token);
    expect(new Headers(request.init?.headers).get("authorization")).toBe(`Bearer ${token}`);
    expect(request.init?.credentials).toBe("omit");
  });

  it("fails immediately for missing credentials and authentication errors without leaking them", async () => {
    expect(() => new TmdbClient(" ")).toThrow(/required/u);
    const token = "never-print-this-token";
    const fetcher = vi.fn(async () => jsonResponse({}, { status: 401 }));
    const error = await new TmdbClient(token, { fetch: fetcher })
      .configuration()
      .catch((reason: unknown) => reason);
    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(String(error)).toMatch(/HTTP 401/u);
    expect(String(error)).not.toContain(token);
  });

  it("retries 5xx twice but does not retry 429", async () => {
    const unavailable = vi.fn(async () => jsonResponse({}, { status: 503 }));
    await expect(
      new TmdbClient("test-token", { fetch: unavailable, retryDelayMs: 1 }).configuration(),
    ).rejects.toThrow(/HTTP 503/u);
    expect(unavailable).toHaveBeenCalledTimes(3);

    const throttled = vi.fn(async () => jsonResponse({}, { status: 429 }));
    await expect(
      new TmdbClient("test-token", { fetch: throttled }).configuration(),
    ).rejects.toThrow(/HTTP 429/u);
    expect(throttled).toHaveBeenCalledTimes(1);
  });

  it("rejects redirects outside the dedicated TMDB API allowlist", async () => {
    const fetcher = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://example.com/collect" },
        }),
    );
    await expect(new TmdbClient("test-token", { fetch: fetcher }).configuration()).rejects.toThrow(
      /allowlist/u,
    );
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("enforces timeout and response-size limits", async () => {
    const hanging = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true,
          });
        }),
    );
    await expect(
      new TmdbClient("test-token", {
        fetch: hanging,
        timeoutMs: 5,
        maxRetries: 0,
      }).configuration(),
    ).rejects.toThrow();

    const oversized = vi.fn(async () =>
      jsonResponse({ results: [] }, { headers: { "content-length": "100" } }),
    );
    await expect(
      new TmdbClient("test-token", { fetch: oversized, maxBytes: 20 }).configuration(),
    ).rejects.toThrow(/size limit/u);
  });
});
