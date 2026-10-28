import "server-only";
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

/*
 * Reads what a project's website says about itself (title, description, picture) so a project needs no upload.
 * Every request is made on behalf of a user-supplied URL, so each hop is checked against private networks
 * (SSRF), limited in time and size, and only HTML or image responses are accepted.
 */

const USER_AGENT = "DosinexBot/1.0 (+https://dosinex.vercel.app)";
const MAX_HTML_BYTES = 1_000_000;
const MAX_IMAGE_BYTES = 4_000_000;
const MAX_REDIRECTS = 4;
const REQUEST_TIMEOUT_MS = 4_000;

export type SiteMeta = {
  /** Final URL after redirects. */
  url: string;
  title?: string;
  description?: string;
  image?: string;
};

export class PreviewError extends Error {
  constructor(
    readonly code: "BLOCKED" | "FETCH" | "TYPE" | "SIZE",
    message: string,
  ) {
    super(message);
    this.name = "PreviewError";
  }
}

// ── Address safety ──────────────────────────────────────────────────────────

/** True for loopback, private, link-local, carrier-grade NAT, multicast and unspecified addresses. */
export function isPrivateAddress(address: string): boolean {
  const ip = address.toLowerCase();
  if (isIP(ip) === 4) {
    const [a = 0, b = 0] = ip.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      a >= 224
    );
  }
  if (isIP(ip) === 6) {
    const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapped?.[1]) return isPrivateAddress(mapped[1]);
    return ip === "::" || ip === "::1" || ip.startsWith("fc") || ip.startsWith("fd") || /^fe[89ab]/.test(ip);
  }
  return true; // not an address at all: refuse
}

/** Resolves the host and refuses anything that points inside a private network. */
export async function assertPublicUrl(raw: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new PreviewError("BLOCKED", "That is not a valid link");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new PreviewError("BLOCKED", "Only http and https links");
  if (url.username || url.password) throw new PreviewError("BLOCKED", "Links with credentials are not allowed");
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new PreviewError("BLOCKED", "That address is not public");
  }
  const addresses = isIP(host) ? [host] : (await lookup(host, { all: true })).map((a) => a.address);
  if (addresses.length === 0 || addresses.some(isPrivateAddress))
    throw new PreviewError("BLOCKED", "That address is not public");
  return url;
}

// ── Fetching ────────────────────────────────────────────────────────────────

type FetchLike = typeof fetch;
type Guard = (raw: string) => Promise<URL>;

async function readCapped(res: Response, max: number): Promise<Uint8Array> {
  const declared = Number(res.headers.get("content-length") ?? 0);
  if (declared > max) throw new PreviewError("SIZE", "The file is too large");
  if (!res.body) return new Uint8Array();
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel();
      throw new PreviewError("SIZE", "The file is too large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.byteLength;
  }
  return out;
}

/** GET with manual redirects so every hop is checked, a short timeout and a size cap. */
async function safeGet(
  raw: string,
  accept: "html" | "image",
  max: number,
  deps: { fetchImpl: FetchLike; guard: Guard },
): Promise<{ url: string; type: string; bytes: Uint8Array }> {
  let current = raw;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const url = await deps.guard(current);
    let res: Response;
    try {
      res = await deps.fetchImpl(url, {
        redirect: "manual",
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        headers: {
          "user-agent": USER_AGENT,
          accept: accept === "html" ? "text/html,application/xhtml+xml" : "image/*",
        },
      });
    } catch {
      throw new PreviewError("FETCH", "The site did not answer in time");
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) throw new PreviewError("FETCH", "Bad redirect");
      current = new URL(next, url).toString();
      continue;
    }
    if (!res.ok) throw new PreviewError("FETCH", `The site answered ${res.status}`);
    const type = (res.headers.get("content-type") ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
    const ok =
      accept === "html"
        ? type === "text/html" || type === "application/xhtml+xml"
        : /^image\/(jpeg|png|webp|gif|avif)$/.test(type);
    if (!ok) throw new PreviewError("TYPE", `Unexpected content type ${type || "unknown"}`);
    return { url: url.toString(), type, bytes: await readCapped(res, max) };
  }
  throw new PreviewError("FETCH", "Too many redirects");
}

// ── Reading the page ────────────────────────────────────────────────────────

export const decodeEntities = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)));

const squash = (s: string | undefined, max: number): string | undefined => {
  const t = s ? decodeEntities(s).replace(/\s+/g, " ").trim() : "";
  return t ? t.slice(0, max) : undefined;
};

function attributes(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of tag.matchAll(/([a-zA-Z:_-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    out[(m[1] ?? "").toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return out;
}

/** Pure: pulls title, description and image out of an HTML document. Relative image links resolve against `baseUrl`. */
export function parseSiteMeta(html: string, baseUrl: string): SiteMeta {
  const head = html.slice(0, 200_000);
  const meta: Record<string, string> = {};
  for (const m of head.matchAll(/<meta\b[^>]*>/gi)) {
    const a = attributes(m[0]);
    const key = (a.property ?? a.name ?? "").toLowerCase();
    if (key && a.content !== undefined && !(key in meta)) meta[key] = a.content;
  }
  const titleTag = head.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];

  let image: string | undefined;
  const rawImage =
    meta["og:image:secure_url"] ?? meta["og:image"] ?? meta["twitter:image"] ?? meta["twitter:image:src"];
  if (rawImage) {
    try {
      const resolved = new URL(decodeEntities(rawImage).trim(), baseUrl);
      if (resolved.protocol === "https:" || resolved.protocol === "http:") image = resolved.toString();
    } catch {
      image = undefined;
    }
  }
  return {
    url: baseUrl,
    title: squash(meta["og:title"] ?? meta["twitter:title"] ?? titleTag, 200),
    description: squash(meta["og:description"] ?? meta["twitter:description"] ?? meta.description, 400),
    image,
  };
}

export type PreviewDeps = { fetchImpl?: FetchLike; guard?: Guard };

/** Fetches the page and reads its metadata. Throws `PreviewError` with a reason the dashboard can show. */
export async function fetchSiteMeta(url: string, deps: PreviewDeps = {}): Promise<SiteMeta> {
  const page = await safeGet(url, "html", MAX_HTML_BYTES, {
    fetchImpl: deps.fetchImpl ?? fetch,
    guard: deps.guard ?? assertPublicUrl,
  });
  return parseSiteMeta(new TextDecoder().decode(page.bytes), page.url);
}

/** Fetches a public web page as HTML under the same safety rules (every hop checked, short timeout, size cap). */
export async function fetchHtmlPage(url: string, deps: PreviewDeps = {}): Promise<{ url: string; html: string }> {
  const page = await safeGet(url, "html", MAX_HTML_BYTES, {
    fetchImpl: deps.fetchImpl ?? fetch,
    guard: deps.guard ?? assertPublicUrl,
  });
  return { url: page.url, html: new TextDecoder().decode(page.bytes) };
}

/** Downloads an image (a site's own picture, or a screenshot) under the same safety rules. */
export async function fetchImageBytes(
  url: string,
  deps: PreviewDeps = {},
): Promise<{ bytes: Uint8Array; contentType: string }> {
  const img = await safeGet(url, "image", MAX_IMAGE_BYTES, {
    fetchImpl: deps.fetchImpl ?? fetch,
    guard: deps.guard ?? assertPublicUrl,
  });
  return { bytes: img.bytes, contentType: img.type };
}

/** Where to ask for a screenshot of a page's top section. `{url}` is replaced with the encoded link. */
export const DEFAULT_SCREENSHOT_TEMPLATE =
  "https://api.microlink.io/?url={url}&screenshot=true&meta=false&embed=screenshot.url&viewport.width=1280&viewport.height=800";

export function screenshotUrl(target: string, template = DEFAULT_SCREENSHOT_TEMPLATE): string {
  return template.replace("{url}", encodeURIComponent(target));
}
