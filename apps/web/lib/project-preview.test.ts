import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySite } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";
import { seedPage } from "@/test/pages";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { buildPreview, refreshProjectPreview } = await import("./project-preview");
const { upsertItem } = await import("./collections");
const { getDraft } = await import("./site");

const SLUG = "idris-rasaq";
const now = new Date("2026-10-22T10:00:00.000Z");
const allow = async (raw: string) => new URL(raw);

const page = (head: string) =>
  new Response(`<html><head>${head}</head></html>`, { headers: { "content-type": "text/html" } });
const png = () => new Response(new Uint8Array([137, 80, 78, 71]), { headers: { "content-type": "image/png" } });

/** Routes by URL so one stub can play the site, its picture and the screenshot service. */
function network(routes: Record<string, () => Response>): typeof fetch {
  return (async (input: URL | RequestInfo) => {
    const url = String(input);
    // Longest prefix wins, so "https://a.test/og.png" is not swallowed by "https://a.test".
    const hit = Object.entries(routes)
      .sort(([a], [b]) => b.length - a.length)
      .find(([prefix]) => url.startsWith(prefix));
    if (!hit) throw new Error(`unrouted ${url}`);
    return hit[1]();
  }) as typeof fetch;
}

const stored: string[] = [];
const store = async (_b: Uint8Array, type: string) => {
  const url = `https://blob.test/${stored.length}.${type.split("/")[1]}`;
  stored.push(url);
  return url;
};
const noStore = async () => null;
const ctx = (fetchImpl: typeof fetch, over: Record<string, unknown> = {}) => ({
  now,
  store,
  screenshotTemplate: "https://shots.test/?u={url}",
  fetchDeps: { fetchImpl, guard: allow },
  ...over,
});

beforeEach(() => {
  stored.length = 0;
});

describe("buildPreview", () => {
  it("uses the site's own picture and keeps its title and description", async () => {
    const fetchImpl = network({
      "https://acme.test": () =>
        page(
          `<title>Acme</title><meta property="og:description" content="We build."><meta property="og:image" content="https://acme.test/og.png">`,
        ),
      "https://acme.test/og.png": png,
    });
    const out = await buildPreview("https://acme.test", ctx(fetchImpl));
    expect(out.preview).toMatchObject({
      sourceUrl: "https://acme.test",
      image: "https://blob.test/0.png",
      imageSource: "og",
      title: "Acme",
      description: "We build.",
      fetchedAt: now.toISOString(),
    });
    expect(out.notice).toBeUndefined();
  });

  it("takes a screenshot when the site has no picture", async () => {
    const fetchImpl = network({
      "https://acme.test": () => page(`<title>Acme</title>`),
      "https://shots.test/": png,
    });
    const out = await buildPreview("https://acme.test", ctx(fetchImpl));
    expect(out.preview).toMatchObject({ imageSource: "screenshot", image: "https://blob.test/0.png" });
  });

  it("falls back to a screenshot when the site's picture is broken", async () => {
    const fetchImpl = network({
      "https://acme.test/gone.png": () => new Response("nope", { status: 404 }),
      "https://acme.test": () => page(`<meta property="og:image" content="https://acme.test/gone.png">`),
      "https://shots.test/": png,
    });
    const out = await buildPreview("https://acme.test", ctx(fetchImpl));
    expect(out.preview?.imageSource).toBe("screenshot");
  });

  it("links the site's https picture when there is no storage, and skips screenshots", async () => {
    const withOg = network({
      "https://acme.test/og.png": png,
      "https://acme.test": () => page(`<meta property="og:image" content="https://acme.test/og.png">`),
    });
    const linked = await buildPreview("https://acme.test", ctx(withOg, { store: noStore }));
    expect(linked.preview).toMatchObject({ image: "https://acme.test/og.png", imageSource: "og" });

    const without = network({ "https://acme.test": () => page(`<title>Acme</title>`), "https://shots.test/": png });
    const none = await buildPreview("https://acme.test", ctx(without, { store: noStore }));
    expect(none.preview?.image).toBeUndefined();
    expect(none.notice).toMatch(/Upload a cover photo/);
  });

  it("never hotlinks an insecure picture", async () => {
    const fetchImpl = network({
      "http://acme.test/og.png": png,
      "https://acme.test": () => page(`<meta property="og:image" content="http://acme.test/og.png">`),
    });
    const out = await buildPreview("https://acme.test", ctx(fetchImpl, { store: noStore }));
    expect(out.preview?.image).toBeUndefined();
  });

  it("returns a reason instead of throwing when the site is down or blocked", async () => {
    const down = network({
      "https://acme.test": () => new Response("no", { status: 500, headers: { "content-type": "text/html" } }),
    });
    const a = await buildPreview("https://acme.test", ctx(down));
    expect(a.preview).toBeUndefined();
    expect(a.notice).toMatch(/couldn't reach/);

    const blocked = await buildPreview("http://127.0.0.1/admin", {
      now,
      store,
      fetchDeps: { fetchImpl: network({}) },
    });
    expect(blocked.preview).toBeUndefined();
    expect(blocked.notice).toMatch(/can't be used/);
  });
});

describe("refreshProjectPreview", () => {
  let fake: FakeRedis;
  const project = (over: Record<string, unknown> = {}) => ({
    title: "Geriatric Centre",
    location: "Surulere, Lagos",
    category: "healthcare",
    role: "Site Engineer",
    startYear: 2024,
    status: "completed",
    ...over,
  });
  const read = async (id: string) => (await getDraft(SLUG))!.projects.find((p) => p.id === id)!;

  beforeEach(async () => {
    fake = new FakeRedis();
    state.redis = fake;
    const site = createEmptySite({
      name: "Rasaq Idris Olawale",
      firstName: "Idris",
      headline: "Site Engineer",
      publicEmail: "i@example.com",
      now,
    });
    await seedPage(SLUG, { draft: site });
  });

  const site = network({
    "https://acme.test/og.png": png,
    "https://acme.test": () =>
      page(
        `<title>Acme</title><meta property="og:description" content="A clinic for older people."><meta property="og:image" content="https://acme.test/og.png">`,
      ),
  });

  it("stores the preview and fills an empty description from the site", async () => {
    const id = await upsertItem(SLUG, "projects", "new", project({ websiteUrl: "https://acme.test" }));
    const out = await refreshProjectPreview(SLUG, id, { now, ctx: ctx(site) });
    expect(out.notice).toBeUndefined();
    const saved = await read(id);
    expect(saved.preview).toMatchObject({ sourceUrl: "https://acme.test", image: "https://blob.test/0.png" });
    expect(saved.scope).toBe("A clinic for older people.");
  });

  it("keeps a description the owner already wrote", async () => {
    const id = await upsertItem(
      SLUG,
      "projects",
      "new",
      project({ websiteUrl: "https://acme.test", scope: "My own words" }),
    );
    await refreshProjectPreview(SLUG, id, { now, ctx: ctx(site) });
    expect((await read(id)).scope).toBe("My own words");
  });

  it("does not read the site again while the link is unchanged", async () => {
    const id = await upsertItem(SLUG, "projects", "new", project({ websiteUrl: "https://acme.test" }));
    await refreshProjectPreview(SLUG, id, { now, ctx: ctx(site) });
    const spy = vi.fn(site);
    await refreshProjectPreview(SLUG, id, { now, ctx: ctx(spy as unknown as typeof fetch) });
    expect(spy).not.toHaveBeenCalled();
  });

  it("reads the site again when the link changes", async () => {
    const id = await upsertItem(SLUG, "projects", "new", project({ websiteUrl: "https://acme.test" }));
    await refreshProjectPreview(SLUG, id, { now, ctx: ctx(site) });
    const next = network({
      "https://other.test/og.png": png,
      "https://other.test": () =>
        page(`<title>Other</title><meta property="og:image" content="https://other.test/og.png">`),
    });
    const current = await read(id);
    await upsertItem(SLUG, "projects", id, { ...current, websiteUrl: "https://other.test" });
    await refreshProjectPreview(SLUG, id, { now, ctx: ctx(next) });
    expect((await read(id)).preview).toMatchObject({ sourceUrl: "https://other.test", title: "Other" });
  });

  it("drops the preview when the link is removed", async () => {
    const id = await upsertItem(SLUG, "projects", "new", project({ websiteUrl: "https://acme.test" }));
    await refreshProjectPreview(SLUG, id, { now, ctx: ctx(site) });
    const current = await read(id);
    await upsertItem(SLUG, "projects", id, { ...current, websiteUrl: undefined });
    await refreshProjectPreview(SLUG, id, { now, ctx: ctx(site) });
    expect((await read(id)).preview).toBeUndefined();
  });

  it("leaves the project unchanged and returns a notice when the site can't be read", async () => {
    const id = await upsertItem(SLUG, "projects", "new", project({ websiteUrl: "https://acme.test" }));
    const down = network({
      "https://acme.test": () => new Response("x", { status: 503, headers: { "content-type": "text/html" } }),
    });
    const out = await refreshProjectPreview(SLUG, id, { now, ctx: ctx(down) });
    expect(out.notice).toMatch(/Upload a cover photo/);
    expect((await read(id)).preview).toBeUndefined();
  });

  it("ignores an unknown project", async () => {
    await expect(refreshProjectPreview(SLUG, "ghost", { now, ctx: ctx(site) })).resolves.toEqual({});
  });
});
