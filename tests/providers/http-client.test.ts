import { SafeHttpClient } from "../../scripts/providers/http-client";

const allowedHosts = new Set(["cinema.109cinemas.net"]);
const url = "https://cinema.109cinemas.net/schedule.html";

describe("safe provider HTTP client", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("does not retry 403 responses", async () => {
    const fetchMock = vi.fn(async () => new Response("forbidden", { status: 403 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new SafeHttpClient().get(url, { allowedHosts, expected: "html" })).rejects.toThrow(
      /HTTP 403/u,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not retry 429 responses", async () => {
    const fetchMock = vi.fn(async () => new Response("slow down", { status: 429 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new SafeHttpClient().get(url, { allowedHosts, expected: "html" })).rejects.toThrow(
      /HTTP 429/u,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("retries 5xx at most twice", async () => {
    const fetchMock = vi.fn(async () => new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new SafeHttpClient({ retryBaseDelayMs: 1 }).get(url, {
        allowedHosts,
        expected: "html",
      }),
    ).rejects.toThrow(/HTTP 503/u);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry an invalid content type", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("not html", {
          status: 200,
          headers: { "content-type": "text/plain" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(new SafeHttpClient().get(url, { allowedHosts, expected: "html" })).rejects.toThrow(
      /not valid HTML/u,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects a redirect outside the allowlist", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(null, {
          status: 302,
          headers: { location: "https://example.com/" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(new SafeHttpClient().get(url, { allowedHosts, expected: "html" })).rejects.toThrow(
      /outside the provider allowlist/u,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("rejects HTTP, user-info URLs, and unknown ports before fetching", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const client = new SafeHttpClient();
    expect(() =>
      client.get("http://cinema.109cinemas.net/schedule", {
        allowedHosts,
        expected: "html",
      }),
    ).toThrow(/outside the provider allowlist/u);
    expect(() =>
      client.get("https://user@cinema.109cinemas.net/schedule", {
        allowedHosts,
        expected: "html",
      }),
    ).toThrow(/outside the provider allowlist/u);
    expect(() =>
      client.get("https://cinema.109cinemas.net:444/schedule", {
        allowedHosts,
        expected: "html",
      }),
    ).toThrow(/outside the provider allowlist/u);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("enforces the configured response-size limit without retrying", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("<!doctype html><html></html>", {
          status: 200,
          headers: { "content-type": "text/html", "content-length": "100" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new SafeHttpClient({ maxBytes: 32 }).get(url, {
        allowedHosts,
        expected: "html",
      }),
    ).rejects.toThrow(/exceeds 32 bytes/u);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("aborts a request after the configured timeout", async () => {
    const fetchMock = vi.fn(
      async (_input: string | URL | Request, init?: RequestInit): Promise<Response> =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason), {
            once: true,
          });
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new SafeHttpClient({ timeoutMs: 5, maxRetries: 0 }).get(url, {
        allowedHosts,
        expected: "html",
      }),
    ).rejects.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("does not send cookies or authorization and caches duplicate URLs", async () => {
    let requestOptions: RequestInit | undefined;
    const fetchMock = vi.fn(async (_input: string | URL | Request, init?: RequestInit) => {
      requestOptions = init;
      return new Response("<!doctype html><html></html>", {
        status: 200,
        headers: { "content-type": "text/html" },
      });
    });
    vi.stubGlobal("fetch", fetchMock);
    const client = new SafeHttpClient();
    const first = client.get(url, { allowedHosts, expected: "html" });
    const second = client.get(url, { allowedHosts, expected: "html" });
    await expect(Promise.all([first, second])).resolves.toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const headers = new Headers(requestOptions?.headers);
    expect(requestOptions?.credentials).toBe("omit");
    expect(headers.has("cookie")).toBe(false);
    expect(headers.has("authorization")).toBe(false);
  });

  it("retries temporary network errors only up to the configured limit", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new TypeError("network unavailable"))
      .mockResolvedValueOnce(
        new Response("<!doctype html><html></html>", {
          status: 200,
          headers: { "content-type": "text/html" },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);
    await expect(
      new SafeHttpClient({ retryBaseDelayMs: 1 }).get(url, {
        allowedHosts,
        expected: "html",
      }),
    ).resolves.toMatchObject({ url });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
});
