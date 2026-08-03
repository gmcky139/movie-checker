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

  it("retries 5xx at most twice", async () => {
    const fetchMock = vi.fn(async () => new Response("unavailable", { status: 503 }));
    vi.stubGlobal("fetch", fetchMock);
    await expect(new SafeHttpClient().get(url, { allowedHosts, expected: "html" })).rejects.toThrow(
      /HTTP 503/u,
    );
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });

  it("does not retry an invalid content type", async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response("not html", { status: 200, headers: { "content-type": "text/plain" } }),
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
        new Response(null, { status: 302, headers: { location: "https://example.com/" } }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await expect(new SafeHttpClient().get(url, { allowedHosts, expected: "html" })).rejects.toThrow(
      /outside the provider allowlist/u,
    );
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
