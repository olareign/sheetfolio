import { describe, expect, it } from "vitest";
import {
  assertPublicUrl,
  fetchImageBytes,
  fetchSiteMeta,
  isPrivateAddress,
  parseSiteMeta,
  PreviewError,
  screenshotUrl,
} from "./site-preview";

const allowAll = async (raw: string) => new URL(raw);

const html = (body: string, type = "text/html; charset=utf-8", init: ResponseInit = {}) =>
  new Response(body, { status: 200, headers: { "content-type": type }, ...init });

describe("isPrivateAddress", () => {
  it.each([
    "127.0.0.1",
    "10.1.2.3",
    "172.16.0.1",
    "172.31.255.255",
    "192.168.1.1",
    "169.254.169.254",
    "100.64.0.1",
    "0.0.0.0",
    "224.0.0.1",
    "::1",
    "fd12::1",
    "fe80::1",
    "::ffff:10.0.0.1",
    "not-an-ip",
  ])("refuses %s", (ip) => expect(isPrivateAddress(ip)).toBe(true));
  it.each(["8.8.8.8", "172.32.0.1", "100.63.0.1", "93.184.216.34", "2606:4700:4700::1111"])("allows %s", (ip) =>
    expect(isPrivateAddress(ip)).toBe(false),
  );
});

describe("assertPublicUrl", () => {
  it.each([
    "file:///etc/passwd",
    "ftp://example.com",
    "javascript:alert(1)",
    "http://localhost:3000",
    "http://app.localhost",
    "http://127.0.0.1/admin",
    "http://10.0.0.5",
    "http://[::1]/",
    "http://169.254.169.254/latest/meta-data",
    "https://user:pass@8.8.8.8/",
    "not a url",
  ])("blocks %s", async (url) => {
    await expect(assertPublicUrl(url)).rejects.toMatchObject({ code: "BLOCKED" });
  });

  it("accepts a public address", async () => {
    await expect(assertPublicUrl("https://8.8.8.8/")).resolves.toBeInstanceOf(URL);
  });
});

describe("parseSiteMeta", () => {
  it("reads Open Graph tags and resolves a relative image", () => {
    const meta = parseSiteMeta(
      `<head><title>Fallback</title>
       <meta property="og:title" content="Acme &amp; Sons">
       <meta property="og:description" content="We build   things.">
       <meta property="og:image" content="/img/cover.png"></head>`,
      "https://acme.test/work/",
    );
    expect(meta).toEqual({
      url: "https://acme.test/work/",
      title: "Acme & Sons",
      description: "We build things.",
      image: "https://acme.test/img/cover.png",
    });
  });

  it("falls back to Twitter tags, the meta description and the title element", () => {
    const meta = parseSiteMeta(
      `<title> My   site </title><meta name="description" content="Plain description">
       <meta name="twitter:image" content="https://cdn.test/a.jpg">`,
      "https://x.test/",
    );
    expect(meta).toMatchObject({ title: "My site", description: "Plain description", image: "https://cdn.test/a.jpg" });
  });

  it("handles single-quoted and reordered attributes", () => {
    const meta = parseSiteMeta(`<meta content='Hi there' property='og:title'>`, "https://x.test/");
    expect(meta.title).toBe("Hi there");
  });

  it("ignores an image that is not http(s)", () => {
    expect(
      parseSiteMeta(`<meta property="og:image" content="javascript:alert(1)">`, "https://x.test/").image,
    ).toBeUndefined();
    expect(
      parseSiteMeta(`<meta property="og:image" content="data:image/png;base64,AAAA">`, "https://x.test/").image,
    ).toBeUndefined();
  });

  it("returns nothing for a page with no metadata", () => {
    expect(parseSiteMeta("<p>hello</p>", "https://x.test/")).toEqual({
      url: "https://x.test/",
      title: undefined,
      description: undefined,
      image: undefined,
    });
  });

  it("caps long descriptions", () => {
    const meta = parseSiteMeta(`<meta name="description" content="${"a".repeat(1000)}">`, "https://x.test/");
    expect(meta.description).toHaveLength(400);
  });
});

describe("fetchSiteMeta", () => {
  it("fetches and parses a page", async () => {
    const fetchImpl = (async () =>
      html(`<title>Hello</title><meta property="og:image" content="https://x.test/i.png">`)) as typeof fetch;
    await expect(fetchSiteMeta("https://x.test/", { fetchImpl, guard: allowAll })).resolves.toMatchObject({
      title: "Hello",
      image: "https://x.test/i.png",
    });
  });

  it("checks every redirect hop, not only the first URL", async () => {
    const seen: string[] = [];
    const guard = async (raw: string) => {
      seen.push(raw);
      if (raw.includes("internal")) throw new PreviewError("BLOCKED", "That address is not public");
      return new URL(raw);
    };
    const fetchImpl = (async () =>
      new Response(null, { status: 302, headers: { location: "http://internal.test/secret" } })) as typeof fetch;
    await expect(fetchSiteMeta("https://x.test/", { fetchImpl, guard })).rejects.toMatchObject({ code: "BLOCKED" });
    expect(seen).toEqual(["https://x.test/", "http://internal.test/secret"]);
  });

  it("stops after too many redirects", async () => {
    const fetchImpl = (async () =>
      new Response(null, { status: 302, headers: { location: "https://x.test/again" } })) as typeof fetch;
    await expect(fetchSiteMeta("https://x.test/", { fetchImpl, guard: allowAll })).rejects.toMatchObject({
      code: "FETCH",
    });
  });

  it("rejects a response that is not HTML", async () => {
    const fetchImpl = (async () => html("{}", "application/json")) as typeof fetch;
    await expect(fetchSiteMeta("https://x.test/", { fetchImpl, guard: allowAll })).rejects.toMatchObject({
      code: "TYPE",
    });
  });

  it("rejects a page that is too large", async () => {
    const fetchImpl = (async () => html("a".repeat(1_100_000))) as typeof fetch;
    await expect(fetchSiteMeta("https://x.test/", { fetchImpl, guard: allowAll })).rejects.toMatchObject({
      code: "SIZE",
    });
  });

  it("turns an HTTP error and a network failure into reasons", async () => {
    const notFound = (async () =>
      new Response("no", { status: 404, headers: { "content-type": "text/html" } })) as typeof fetch;
    await expect(fetchSiteMeta("https://x.test/", { fetchImpl: notFound, guard: allowAll })).rejects.toMatchObject({
      code: "FETCH",
    });
    const down = (async () => {
      throw new Error("ECONNRESET");
    }) as typeof fetch;
    await expect(fetchSiteMeta("https://x.test/", { fetchImpl: down, guard: allowAll })).rejects.toMatchObject({
      code: "FETCH",
    });
  });
});

describe("fetchImageBytes", () => {
  it("returns image bytes and type", async () => {
    const fetchImpl = (async () =>
      new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/png" } })) as typeof fetch;
    const out = await fetchImageBytes("https://x.test/i.png", { fetchImpl, guard: allowAll });
    expect(out.contentType).toBe("image/png");
    expect([...out.bytes]).toEqual([1, 2, 3]);
  });

  it("refuses SVG and other non-raster types", async () => {
    const fetchImpl = (async () =>
      new Response("<svg/>", { headers: { "content-type": "image/svg+xml" } })) as typeof fetch;
    await expect(fetchImageBytes("https://x.test/i.svg", { fetchImpl, guard: allowAll })).rejects.toMatchObject({
      code: "TYPE",
    });
  });

  it("refuses an oversize image", async () => {
    const fetchImpl = (async () =>
      new Response(new Uint8Array(4_100_000), { headers: { "content-type": "image/jpeg" } })) as typeof fetch;
    await expect(fetchImageBytes("https://x.test/big.jpg", { fetchImpl, guard: allowAll })).rejects.toMatchObject({
      code: "SIZE",
    });
  });
});

describe("helpers", () => {
  it("encodes the target into the screenshot template", () => {
    expect(screenshotUrl("https://a.test/?q=1&r=2", "https://shots.test/?u={url}")).toBe(
      "https://shots.test/?u=https%3A%2F%2Fa.test%2F%3Fq%3D1%26r%3D2",
    );
  });
});
