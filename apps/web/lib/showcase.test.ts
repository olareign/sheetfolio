import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySite, type Site } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { getFeaturedUsers, leadProject, rankFeatured } = await import("./showcase");

const now = new Date("2026-10-22T12:00:00.000Z");
let fake: FakeRedis;

function addSite(
  slug: string,
  name: string,
  over: {
    publishedAt?: string;
    showInShowcase?: boolean;
    status?: "published" | "suspended";
    projects?: Site["projects"];
  } = {},
) {
  const base = createEmptySite({
    name,
    firstName: name.split(" ")[0] ?? name,
    headline: "Engineer",
    publicEmail: "a@b.test",
    now,
  });
  const site: Site = {
    ...base,
    projects: over.projects ?? [],
    publishedAt: over.publishedAt ?? "2026-10-01T00:00:00.000Z",
    settings: { ...base.settings, status: over.status ?? "published", showInShowcase: over.showInShowcase ?? true },
  };
  fake.strings.set(`site:${slug}:published`, JSON.stringify(site));
  fake.sets.set("sites", new Set([...(fake.sets.get("sites") ?? []), slug]));
}
const day = (daysAgo: number) => {
  const d = new Date(now);
  d.setUTCDate(d.getUTCDate() - daysAgo);
  return d.toISOString().slice(0, 10);
};
const views = (slug: string, daysAgo: number, n: number) =>
  fake.strings.set(`views:${slug}:${day(daysAgo)}`, String(n));

const project = (
  id: string,
  title: string,
  category: Site["projects"][number]["category"] = "building",
): Site["projects"][number] => ({
  id,
  title,
  location: "Lagos",
  category,
  role: "Engineer",
  scope: "",
  startYear: 2024,
  status: "completed",
  images: [],
  featured: false,
});

beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
});

describe("rankFeatured", () => {
  const u = (name: string, views: number, projectViews = 0, publishedAt = "2026-10-01T00:00:00.000Z") => ({
    name,
    views,
    projectViews,
    publishedAt,
  });
  it("puts the most viewed first, then project opens, then the newest publish, then the name", () => {
    const ranked = rankFeatured([
      u("Zed", 5),
      u("Amy", 9),
      u("Bob", 5, 3),
      u("Cat", 5, 3, "2026-10-10T00:00:00.000Z"),
      u("Dan", 5, 3, "2026-10-10T00:00:00.000Z"),
    ]);
    expect(ranked.map((r) => r.name)).toEqual(["Amy", "Cat", "Dan", "Bob", "Zed"]);
  });
  it("does not change its input", () => {
    const input = [u("A", 1), u("B", 2)];
    rankFeatured(input);
    expect(input.map((i) => i.name)).toEqual(["A", "B"]);
  });
});

describe("leadProject", () => {
  it("picks the most opened project, else the first", () => {
    const site = { projects: [project("a", "A"), project("b", "B")] } as Site;
    expect(leadProject(site, { a: 1, b: 7 })?.id).toBe("b");
    expect(leadProject(site, {})?.id).toBe("a");
    expect(leadProject({ projects: [] } as unknown as Site, {})).toBeUndefined();
  });
});

describe("getFeaturedUsers", () => {
  it("ranks published pages by views in the last 30 days", async () => {
    addSite("low-views", "Low Views");
    addSite("top-views", "Top Views");
    views("low-views", 1, 4);
    views("top-views", 2, 40);
    views("top-views", 10, 2);
    const out = await getFeaturedUsers(12, now);
    expect(out.map((u) => [u.slug, u.views])).toEqual([
      ["top-views", 42],
      ["low-views", 4],
    ]);
  });

  it("ignores views older than 30 days", async () => {
    addSite("old-fame", "Old Fame");
    views("old-fame", 45, 1000);
    expect((await getFeaturedUsers(12, now))[0]?.views).toBe(0);
  });

  it("leaves out pages that opted out, were suspended, or are unpublished", async () => {
    addSite("shown", "Shown");
    addSite("opted-out", "Opted Out", { showInShowcase: false });
    addSite("suspended", "Suspended", { status: "suspended" });
    fake.sets.set("sites", new Set([...(fake.sets.get("sites") ?? []), "never-published"]));
    expect((await getFeaturedUsers(12, now)).map((u) => u.slug)).toEqual(["shown"]);
  });

  it("shows the picture of the most opened project, falling back to a stock photo for its category", async () => {
    addSite("ada-obi", "Ada Obi", { projects: [project("p1", "Clinic", "healthcare"), project("p2", "Road", "road")] });
    fake.strings.set("views:ada-obi:p:p2", "9");
    const [u] = await getFeaturedUsers(12, now);
    expect(u).toMatchObject({ coverTitle: "Road", projectViews: 9, projects: 2 });
    expect(u?.cover).toMatchObject({ kind: "stock", url: "/stock/projects/road.jpg" });
  });

  it("shows the person's own photo when they uploaded one, over any project picture", async () => {
    addSite("ada-obi", "Ada Obi", { projects: [project("p1", "Clinic", "healthcare")] });
    const key = "site:ada-obi:published";
    const stored = JSON.parse(String(fake.strings.get(key)));
    stored.profile.avatar = "https://abc.public.blob.vercel-storage.com/ada.jpg";
    fake.strings.set(key, JSON.stringify(stored));
    const [u] = await getFeaturedUsers(12, now);
    expect(u).toMatchObject({
      isPerson: true,
      cover: { kind: "upload", url: "https://abc.public.blob.vercel-storage.com/ada.jpg" },
    });
    expect(u?.coverTitle).toBe("Clinic");
  });

  it("marks a card that shows a project picture as not a person", async () => {
    addSite("no-photo", "No Photo", { projects: [project("p1", "Clinic", "healthcare")] });
    expect((await getFeaturedUsers(12, now))[0]?.isPerson).toBe(false);
  });

  it("respects the limit", async () => {
    for (const n of ["aaa", "bbb", "ccc"]) addSite(n, n.toUpperCase());
    expect(await getFeaturedUsers(2, now)).toHaveLength(2);
  });
});
