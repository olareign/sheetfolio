import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateTag } from "next/cache";
import { createEmptySite, type Site } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));

vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({
  unstable_cache: <T>(fn: () => Promise<T>) => fn,
  revalidateTag: vi.fn(),
}));

const {
  addLead,
  claimSlug,
  getDraft,
  getProjectViews,
  getPublished,
  getUnreadCount,
  getWeekViews,
  listLeads,
  markAllLeadsRead,
  markLeadRead,
  publish,
  recordView,
  saveDraft,
  SiteError,
  updateCollection,
} = await import("./site");

const SLUG = "idris-rasaq";
const t0 = new Date("2026-09-28T10:00:00.000Z");
const t1 = new Date("2026-09-28T11:00:00.000Z");
let fake: FakeRedis;

function seedDraft(over: Partial<Site["profile"]> = {}): Site {
  const site = createEmptySite({
    name: "Rasaq Idris Olawale",
    firstName: "Idris",
    headline: "Site Engineer",
    publicEmail: "i@example.com",
    now: t0,
  });
  site.profile = { ...site.profile, ...over };
  fake.strings.set(`site:${SLUG}:draft`, JSON.stringify(site));
  fake.sets.set("sites", new Set([SLUG]));
  return site;
}
const ready = { summary: "Site engineer.", location: "Akure, Ondo State", whatsapp: "2347033435818" };

const experience = (id: string, company = "IJUNT") => ({ id, company, role: "Site Engineer", startYear: 2026 });

beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
  vi.mocked(revalidateTag).mockClear();
});

describe("getDraft", () => {
  it("returns null when the site has no draft", async () => {
    expect(await getDraft(SLUG)).toBeNull();
  });

  it("returns the stored draft, parsed", async () => {
    const site = seedDraft();
    expect(await getDraft(SLUG)).toEqual(site);
  });

  it("fails loudly on a corrupt stored document", async () => {
    fake.strings.set(`site:${SLUG}:draft`, JSON.stringify({ profile: {} }));
    await expect(getDraft(SLUG)).rejects.toMatchObject({ code: "INVALID" });
  });

  it("rejects an invalid slug instead of building a key from it", async () => {
    await expect(getDraft("../../etc")).rejects.toBeInstanceOf(SiteError);
  });
});

describe("saveDraft", () => {
  it("stamps updatedAt", async () => {
    const site = seedDraft();
    const saved = await saveDraft(SLUG, site, t1);
    expect(saved.updatedAt).toBe(t1.toISOString());
    expect((await getDraft(SLUG))?.updatedAt).toBe(t1.toISOString());
  });

  it("refuses an invalid document and leaves the stored one untouched", async () => {
    const site = seedDraft();
    const bad = { ...site, profile: { ...site.profile, publicEmail: "not-an-email" } };
    await expect(saveDraft(SLUG, bad, t1)).rejects.toMatchObject({ code: "INVALID" });
    expect(await getDraft(SLUG)).toEqual(site);
  });
});

describe("updateCollection", () => {
  it("replaces one array and keeps the given order", async () => {
    seedDraft();
    await updateCollection(SLUG, "experiences", [experience("b", "Samkey"), experience("a")], t1);
    const draft = await getDraft(SLUG);
    expect(draft?.experiences.map((e) => e.id)).toEqual(["b", "a"]);
    expect(draft?.updatedAt).toBe(t1.toISOString());
    expect(draft?.projects).toEqual([]);
  });

  it("rejects invalid items", async () => {
    seedDraft();
    await expect(updateCollection(SLUG, "experiences", [{ ...experience("a"), company: "" }])).rejects.toMatchObject({
      code: "INVALID",
    });
  });

  it("rejects duplicate ids", async () => {
    seedDraft();
    await expect(updateCollection(SLUG, "experiences", [experience("a"), experience("a")])).rejects.toMatchObject({
      code: "INVALID",
    });
  });

  it("throws NOT_FOUND without a draft", async () => {
    await expect(updateCollection(SLUG, "referees", [])).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("publish / getPublished", () => {
  it("refuses a draft that isn't ready and lists the reasons", async () => {
    seedDraft();
    const err = await publish(SLUG, t1).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SiteError);
    expect((err as InstanceType<typeof SiteError>).issues.length).toBe(3);
    expect(await getPublished(SLUG)).toBeNull();
  });

  it("copies draft → published, stamps publishedAt and drops the cache tag", async () => {
    seedDraft(ready);
    const published = await publish(SLUG, t1);
    expect(published.publishedAt).toBe(t1.toISOString());
    expect(published.settings.status).toBe("published");
    expect(revalidateTag).toHaveBeenCalledWith(`site:${SLUG}`, { expire: 0 });
    expect((await getPublished(SLUG))?.profile.summary).toBe(ready.summary);
    // The draft itself is unchanged.
    expect((await getDraft(SLUG))?.publishedAt).toBeUndefined();
  });

  it("throws NOT_FOUND without a draft", async () => {
    await expect(publish(SLUG)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("hides suspended sites and refuses to republish them", async () => {
    seedDraft(ready);
    const published = await publish(SLUG, t1);
    fake.strings.set(
      `site:${SLUG}:published`,
      JSON.stringify({ ...published, settings: { ...published.settings, status: "suspended" } }),
    );
    expect(await getPublished(SLUG)).toBeNull();
    await expect(publish(SLUG)).rejects.toMatchObject({ code: "SUSPENDED" });
  });

  it("returns null for slugs that can't exist", async () => {
    expect(await getPublished("Not A Slug!")).toBeNull();
  });
});

describe("claimSlug", () => {
  it("gives a slug to the first caller only", async () => {
    expect(await claimSlug(SLUG, "user-1")).toBe(true);
    expect(await claimSlug(SLUG, "user-2")).toBe(false);
    expect(fake.strings.get(`slug:${SLUG}`)).toBe("user-1");
  });

  it("rejects reserved and malformed slugs", async () => {
    await expect(claimSlug("dashboard", "u")).rejects.toMatchObject({ code: "INVALID" });
    await expect(claimSlug("A B", "u")).rejects.toMatchObject({ code: "INVALID" });
  });
});

describe("recordView", () => {
  it("counts daily page views with a 90-day TTL", async () => {
    seedDraft();
    await recordView(SLUG, undefined, t0);
    await recordView(SLUG, undefined, t0);
    expect(fake.strings.get(`views:${SLUG}:2026-09-28`)).toBe("2");
    expect(fake.ttls.get(`views:${SLUG}:2026-09-28`)).toBe(90 * 24 * 60 * 60);
  });

  it("counts project views separately", async () => {
    seedDraft();
    await recordView(SLUG, "p1", t0);
    expect(fake.strings.get(`views:${SLUG}:p:p1`)).toBe("1");
    expect(fake.strings.has(`views:${SLUG}:2026-09-28`)).toBe(false);
  });

  it("ignores unknown or malformed slugs", async () => {
    await recordView("nobody-here", undefined, t0);
    await recordView("../x", undefined, t0);
    expect(fake.strings.size).toBe(0);
  });
});

describe("leads", () => {
  const lead = (n: number) => ({ name: `Client ${n}`, email: `c${n}@example.com`, message: "Hello" });

  it("stores newest first and counts unread", async () => {
    await addLead(SLUG, lead(1), t0);
    await addLead(SLUG, lead(2), t1);
    const leads = await listLeads(SLUG, 0);
    expect(leads.map((l) => l.name)).toEqual(["Client 2", "Client 1"]);
    expect(leads[0]?.read).toBe(false);
    expect(fake.strings.get(`leads:${SLUG}:unread`)).toBe("2");
  });

  it("keeps only the latest 500", async () => {
    for (let i = 0; i < 502; i++) await addLead(SLUG, lead(i), t0);
    expect(fake.lists.get(`leads:${SLUG}`)?.length).toBe(500);
    expect((await listLeads(SLUG, 0, 1))[0]?.name).toBe("Client 501");
  });

  it("paginates", async () => {
    for (let i = 0; i < 5; i++) await addLead(SLUG, lead(i), t0);
    expect((await listLeads(SLUG, 1, 2)).map((l) => l.name)).toEqual(["Client 2", "Client 1"]);
    expect(await listLeads(SLUG, 9, 2)).toEqual([]);
    expect((await listLeads(SLUG, -1, 2)).length).toBe(2); // bad page falls back to 0
  });

  it("rejects invalid enquiries", async () => {
    await expect(addLead(SLUG, { ...lead(1), email: "nope" })).rejects.toMatchObject({ code: "INVALID" });
    await expect(addLead(SLUG, { ...lead(1), message: "  " })).rejects.toMatchObject({ code: "INVALID" });
    expect(fake.lists.size).toBe(0);
  });
});

describe("lead read state", () => {
  const lead = (n: number) => ({ name: `Client ${n}`, email: `c${n}@example.com`, message: "Hello" });

  it("marks one lead read, once, and keeps the counter in step", async () => {
    const a = await addLead(SLUG, lead(1), t0);
    await addLead(SLUG, lead(2), t0);
    expect(await markLeadRead(SLUG, a.id)).toBe(true);
    expect(await markLeadRead(SLUG, a.id)).toBe(true); // idempotent
    expect(await getUnreadCount(SLUG)).toBe(1);
    const leads = await listLeads(SLUG, 0);
    expect(leads.find((l) => l.id === a.id)?.read).toBe(true);
    expect(leads.filter((l) => !l.read)).toHaveLength(1);
  });

  it("marks the right lead even after new leads shift the list", async () => {
    const a = await addLead(SLUG, lead(1), t0);
    await addLead(SLUG, lead(2), t0); // a is now at index 1
    await markLeadRead(SLUG, a.id);
    const leads = await listLeads(SLUG, 0);
    expect(leads.map((l) => [l.name, l.read])).toEqual([
      ["Client 2", false],
      ["Client 1", true],
    ]);
  });

  it("ignores forged or unknown ids without touching the counter", async () => {
    await addLead(SLUG, lead(1), t0);
    expect(await markLeadRead(SLUG, crypto.randomUUID())).toBe(false);
    expect(await markLeadRead(SLUG, "not-a-uuid")).toBe(false);
    expect(await getUnreadCount(SLUG)).toBe(1);
  });

  it("marks all read and zeroes the counter", async () => {
    await addLead(SLUG, lead(1), t0);
    await addLead(SLUG, lead(2), t0);
    await markAllLeadsRead(SLUG);
    expect(await getUnreadCount(SLUG)).toBe(0);
    expect((await listLeads(SLUG, 0)).every((l) => l.read)).toBe(true);
    await addLead(SLUG, lead(3), t0);
    expect(await getUnreadCount(SLUG)).toBe(1);
  });

  it("never reports a negative unread count", async () => {
    fake.strings.set(`leads:${SLUG}:unread`, "-3");
    expect(await getUnreadCount(SLUG)).toBe(0);
  });
});

describe("view counters", () => {
  it("returns the last 7 UTC days oldest first, zero-filled", async () => {
    seedDraft();
    await recordView(SLUG, undefined, new Date("2026-09-28T23:00:00.000Z"));
    await recordView(SLUG, undefined, new Date("2026-09-26T01:00:00.000Z"));
    await recordView(SLUG, undefined, new Date("2026-09-26T02:00:00.000Z"));
    const week = await getWeekViews(SLUG, new Date("2026-09-28T23:30:00.000Z"));
    expect(week.map((d) => d.date)).toEqual([
      "2026-09-22",
      "2026-09-23",
      "2026-09-24",
      "2026-09-25",
      "2026-09-26",
      "2026-09-27",
      "2026-09-28",
    ]);
    expect(week.map((d) => d.views)).toEqual([0, 0, 0, 0, 2, 0, 1]);
  });

  it("reads per-project totals", async () => {
    seedDraft();
    await recordView(SLUG, "p-1", t0);
    await recordView(SLUG, "p-1", t0);
    expect(await getProjectViews(SLUG, ["p-1", "p-2"])).toEqual({ "p-1": 2, "p-2": 0 });
    expect(await getProjectViews(SLUG, [])).toEqual({});
  });
});
