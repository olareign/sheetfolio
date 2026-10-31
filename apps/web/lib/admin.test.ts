import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { revalidateTag } from "next/cache";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));
vi.mock("@/lib/ratelimit", () => ({ tailorQuota: async () => ({ remaining: 3, limit: 5 }) }));

const {
  cvDownloadsBySlug,
  deleteAccount,
  deleteLead,
  describeItem,
  filterAccounts,
  getAccountDetail,
  getOverview,
  getSystemStatus,
  listAccounts,
  listContent,
  listSignups,
  listSites,
  removeItem,
  reindexPages,
  resetAllowances,
  setPlan,
  setSuspended,
  signOutEverywhere,
  viewsBySlug,
} = await import("./admin");
const { listActivity } = await import("./activity");
const { users, leads: leadsStore } = await import("./store");
const { onboard } = await import("./accounts");
const { addLead, getPublished, publish, saveDraft, getDraft } = await import("./site");

const seed = JSON.parse(readFileSync("seed/idris.json", "utf8")) as { site: Record<string, unknown> };
const SLUG = "idris-rasaq";
const signup = new Date("2026-09-28T10:00:00.000Z");
let fake: FakeRedis;

async function onboardAndPublish(minutesLater: number) {
  await onboard({
    userId: "u1",
    email: "idris@example.com",
    role: "engineer",
    input: { slug: SLUG, name: "Rasaq Idris Olawale", firstName: "Idris", headline: "Site Engineer" },
    now: signup,
  });
  await saveDraft(SLUG, { ...(seed.site as object), updatedAt: signup.toISOString() } as never, signup);
  await publish(SLUG, new Date(signup.getTime() + minutesLater * 60_000));
}

beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
  vi.mocked(revalidateTag).mockClear();
});

describe("listSites (PRD §11 metrics)", () => {
  it("reports status, minutes to first publish, projects, certificates and leads", async () => {
    await onboardAndPublish(18);
    await addLead(SLUG, { name: "A", email: "a@example.com", message: "Hi" });
    const [row] = await listSites();
    expect(row).toMatchObject({
      slug: SLUG,
      status: "live",
      owner: "idris@example.com",
      minutesToFirstPublish: 18,
      projects: 9,
      certifications: 1,
      leads: 1,
      unread: 1,
    });
  });

  it("keeps the first publish time when republishing", async () => {
    await onboardAndPublish(18);
    await publish(SLUG, new Date(signup.getTime() + 90 * 60_000));
    expect((await listSites())[0]?.minutesToFirstPublish).toBe(18);
  });

  it("lists a site that was never published", async () => {
    await onboard({
      userId: "u2",
      email: "new@example.com",
      role: "engineer",
      input: { slug: "new-one", name: "New One", firstName: "New", headline: "Engineer" },
      now: signup,
    });
    expect((await listSites())[0]).toMatchObject({
      slug: "new-one",
      status: "unpublished",
      minutesToFirstPublish: undefined,
    });
  });
});

describe("listSignups", () => {
  it("returns app accounts", async () => {
    await onboardAndPublish(5);
    const signups = await listSignups();
    expect(signups).toEqual([expect.objectContaining({ email: "idris@example.com", slug: SLUG, role: "engineer" })]);
  });
});

describe("setSuspended", () => {
  it("hides the public page, blocks publishing, keeps editing, and purges the cache", async () => {
    await onboardAndPublish(5);
    const before = (await getDraft(SLUG))?.updatedAt;
    await setSuspended(SLUG, true);
    expect(await getPublished(SLUG)).toBeNull();
    expect(revalidateTag).toHaveBeenCalledWith(`site:${SLUG}`, { expire: 0 });
    await expect(publish(SLUG)).rejects.toMatchObject({ code: "SUSPENDED" });
    expect((await getDraft(SLUG))?.updatedAt).toBe(before); // suspension isn't an engineer edit
    expect((await listSites())[0]?.status).toBe("suspended");
  });

  it("restores the page exactly as it was", async () => {
    await onboardAndPublish(5);
    await setSuspended(SLUG, true);
    await setSuspended(SLUG, false);
    expect((await getPublished(SLUG))?.settings.status).toBe("published");
    expect((await listSites())[0]?.status).toBe("live");
    await expect(publish(SLUG)).resolves.toBeTruthy();
  });

  it("suspends a site that was never published", async () => {
    await onboard({
      userId: "u2",
      email: "new@example.com",
      role: "engineer",
      input: { slug: "new-one", name: "New One", firstName: "New", headline: "Engineer" },
      now: signup,
    });
    await setSuspended("new-one", true);
    expect((await listSites())[0]?.status).toBe("suspended");
  });

  it("throws NOT_FOUND for an unknown site", async () => {
    await expect(setSuspended("ghost-site", true)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

// ── The admin console ───────────────────────────────────────────────────────

async function addAccount(slug: string, email: string, role: "engineer" | "admin" = "engineer") {
  await onboard({
    userId: `u-${slug}`,
    email,
    role,
    input: { slug, name: `Name ${slug}`, firstName: slug, headline: "Engineer" },
    now: signup,
  });
}

describe("listAccounts and filterAccounts", () => {
  it("joins accounts to their pages and enquiry counts", async () => {
    await onboardAndPublish(18);
    await addAccount("bob-new", "bob@example.com");
    await addLead(SLUG, { name: "A", email: "a@example.com", message: "Hi" });
    const rows = await listAccounts();
    expect(rows.map((r) => r.slug).sort()).toEqual(["bob-new", SLUG]);
    expect(rows.find((r) => r.slug === SLUG)).toMatchObject({
      email: "idris@example.com",
      plan: "free",
      status: "live",
      minutesToFirstPublish: 18,
      leads: 1,
      unread: 1,
    });
    expect(rows.find((r) => r.slug === "bob-new")).toMatchObject({ status: "unpublished", leads: 0 });
  });

  it("filters by text, plan, status and role", async () => {
    await onboardAndPublish(18);
    await addAccount("bob-new", "bob@example.com", "admin");
    await setPlan("bob-new", "pro", "root@example.com");
    const rows = await listAccounts();
    const slugs = (q: Parameters<typeof filterAccounts>[1]) => filterAccounts(rows, q).map((r) => r.slug);
    expect(slugs({ q: "BOB@" })).toEqual(["bob-new"]);
    expect(slugs({ q: "rasaq" })).toEqual([SLUG]);
    expect(slugs({ plan: "pro" })).toEqual(["bob-new"]);
    expect(slugs({ status: "live" })).toEqual([SLUG]);
    expect(slugs({ role: "admin" })).toEqual(["bob-new"]);
    expect(slugs({ q: "nobody" })).toEqual([]);
    expect(slugs({})).toHaveLength(2);
  });
});

describe("getOverview", () => {
  it("totals the platform", async () => {
    await onboardAndPublish(18);
    await addAccount("bob-new", "bob@example.com");
    await addLead(SLUG, { name: "A", email: "a@example.com", message: "Hi" });
    await fake.set(`views:${SLUG}:${new Date().toISOString().slice(0, 10)}`, 4);
    await fake.set(`cv:${SLUG}:downloads`, 2);
    const o = await getOverview();
    expect(o.totals).toMatchObject({ users: 2, publishedPages: 1, proUsers: 0, suspendedPages: 0 });
    expect(o.leads).toEqual({ total: 1, unread: 1 });
    expect(o.viewsWeek).toBe(4);
    expect(o.cvDownloads).toBe(2);
    expect(o.medianMinutesToPublish).toBe(18);
    expect(o.underThirty).toEqual({ count: 1, of: 1 });
    expect(o.signupsWeek).toBe(0);
  });
});

describe("counters", () => {
  it("reads views and downloads for many pages at once", async () => {
    const day = new Date("2026-10-10T12:00:00.000Z");
    await fake.set("views:a-page:2026-10-10", 3);
    await fake.set("views:a-page:2026-10-09", 1);
    await fake.set("cv:a-page:downloads", 7);
    const views = await viewsBySlug(["a-page", "b-page"], 3, day);
    expect(views.get("a-page")).toEqual([0, 1, 3]);
    expect(views.get("b-page")).toEqual([0, 0, 0]);
    expect((await cvDownloadsBySlug(["a-page", "b-page"])).get("a-page")).toBe(7);
  });
});

describe("getAccountDetail", () => {
  it("returns one account's page, status and counters, or null", async () => {
    await onboardAndPublish(18);
    const detail = await getAccountDetail(SLUG);
    expect(detail).toMatchObject({
      account: { email: "idris@example.com" },
      status: "live",
      hasPassword: false,
      leadTotals: { total: 0, unread: 0 },
      allowance: [
        { engine: "groq", remaining: 3, limit: 5 },
        { engine: "claude", remaining: 3, limit: 5 },
      ],
    });
    expect(detail?.views).toHaveLength(14);
    expect(await getAccountDetail("ghost-page")).toBeNull();
  });
});

describe("admin changes are applied and logged with who did them", () => {
  it("moves an account between plans", async () => {
    await onboardAndPublish(18);
    await setPlan(SLUG, "pro", "root@example.com");
    expect((await users().get("idris@example.com"))?.plan).toBe("pro");
    const [last] = (await listActivity({ slug: SLUG })).events;
    expect(last).toMatchObject({
      type: "admin",
      actor: "root@example.com",
      detail: "Moved the account to the pro plan",
    });
    await expect(setPlan("ghost-page", "pro", "root@example.com")).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("logs a suspension only when an admin is named", async () => {
    await onboardAndPublish(18);
    const before = (await listActivity()).events.length;
    await setSuspended(SLUG, true);
    expect((await listActivity()).events).toHaveLength(before);
    await setSuspended(SLUG, false, "root@example.com");
    expect((await listActivity()).events[0]).toMatchObject({ detail: "Restored the page", actor: "root@example.com" });
  });

  it("records sign-ups, publishes and enquiries as they happen, without what anyone wrote", async () => {
    await onboardAndPublish(18);
    await addLead(SLUG, { name: "Pat", email: "pat@example.com", message: "A private message" });
    const { events } = await listActivity({ slug: SLUG });
    expect(events.map((e) => e.type)).toEqual(["lead", "publish", "signup"]);
    expect(JSON.stringify(events)).not.toContain("private message");
    expect(JSON.stringify(events)).not.toContain("pat@example.com");
  });

  it("signs an account out everywhere by bumping its session counter", async () => {
    await onboardAndPublish(18);
    const { getSessionEpoch } = await import("./credentials");
    const before = await getSessionEpoch("idris@example.com");
    await signOutEverywhere(SLUG, "root@example.com");
    expect(await getSessionEpoch("idris@example.com")).toBe(before + 1);
  });

  it("gives back the tailoring allowance by clearing that account's counters only", async () => {
    await fake.set("ratelimit:tailor:groq:account:ada:123", 3);
    await fake.set("ratelimit:tailor:claude:account:ada:123", 1);
    await fake.set("ratelimit:tailor:groq:account:bob:123", 2);
    expect(await resetAllowances("ada", "root@example.com")).toBe(2);
    expect([...fake.strings.keys()]).toEqual(["ratelimit:tailor:groq:account:bob:123"]);
  });

  it("removes one item from the draft and the live page, and only that item", async () => {
    await onboardAndPublish(18);
    const draft = await getDraft(SLUG);
    const [first, second] = draft!.projects;
    expect(await removeItem(SLUG, "projects", first!.id, "root@example.com")).toBe(true);
    expect((await getDraft(SLUG))?.projects.map((p) => p.id)).not.toContain(first!.id);
    expect((await getPublished(SLUG))?.projects.map((p) => p.id)).not.toContain(first!.id);
    expect((await getPublished(SLUG))?.projects.map((p) => p.id)).toContain(second!.id);
    expect(revalidateTag).toHaveBeenCalledWith(`site:${SLUG}`, { expire: 0 });
    expect(await removeItem(SLUG, "projects", first!.id, "root@example.com")).toBe(false);
    await expect(removeItem("ghost-page", "projects", "x", "root@example.com")).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
  });

  it("deletes an enquiry on its own page", async () => {
    await onboardAndPublish(18);
    const lead = await addLead(SLUG, { name: "A", email: "a@example.com", message: "Hi" });
    expect(await deleteLead("another-page", lead.id, "root@example.com")).toBe(false);
    expect(await deleteLead(SLUG, lead.id, "root@example.com")).toBe(true);
    expect(await leadsStore().count(SLUG)).toBe(0);
  });
});

describe("deleteAccount", () => {
  it("removes the account, its page and its Redis traces, and says so in the log", async () => {
    await onboardAndPublish(18);
    await addAccount("keep-me", "keep@example.com");
    await addLead(SLUG, { name: "A", email: "a@example.com", message: "Hi" });
    await fake.set(`views:${SLUG}:2026-10-01`, 4);
    await fake.set(`cv:${SLUG}:downloads`, 1);
    await fake.set("views:keep-me:2026-10-01", 9);
    await recordActivityFor(SLUG);

    expect(await deleteAccount(SLUG, "root@example.com")).toEqual({ ok: true });

    expect(await users().get("idris@example.com")).toBeNull();
    expect(await getDraft(SLUG)).toBeNull();
    expect(await leadsStore().count(SLUG)).toBe(0);
    expect([...fake.strings.keys()].filter((k) => k.includes(SLUG))).toEqual([]);
    expect(await fake.sismember("sites", SLUG)).toBe(0);
    expect(fake.lists.has(`activity:user:${SLUG}`)).toBe(false);
    // Another account is untouched.
    expect(await users().get("keep@example.com")).not.toBeNull();
    expect(fake.strings.has("views:keep-me:2026-10-01")).toBe(true);
    expect((await listActivity()).events[0]).toMatchObject({ type: "admin", detail: `Deleted the account /${SLUG}` });
  });

  it("refuses an unknown account, an admin and the admin doing it", async () => {
    await addAccount("root-page", "root@example.com", "admin");
    await addAccount("other-admin", "boss@example.com", "admin");
    await addAccount("plain-user", "plain@example.com");
    expect(await deleteAccount("ghost-page", "root@example.com")).toEqual({ ok: false, reason: "NOT_FOUND" });
    expect(await deleteAccount("root-page", "ROOT@example.com")).toEqual({ ok: false, reason: "SELF" });
    expect(await deleteAccount("other-admin", "root@example.com")).toEqual({ ok: false, reason: "ADMIN" });
    expect(await users().get("boss@example.com")).not.toBeNull();
    expect(await deleteAccount("plain-user", "root@example.com")).toEqual({ ok: true });
  });
});

async function recordActivityFor(slug: string) {
  const { recordActivity } = await import("./activity");
  await recordActivity({ type: "login", slug });
}

describe("listContent and describeItem", () => {
  it("lists one collection across every page and marks what is live", async () => {
    await onboardAndPublish(18);
    await addAccount("bob-new", "bob@example.com");
    const all = await listContent({ collection: "projects" });
    expect(all).toHaveLength(9);
    expect(all[0]).toMatchObject({ slug: SLUG, owner: "idris@example.com", collection: "projects", live: true });
    const found = await listContent({ collection: "projects", q: all[0]!.title.slice(0, 6) });
    expect(found.length).toBeGreaterThan(0);
    expect(await listContent({ collection: "projects", slug: "bob-new" })).toEqual([]);
    expect(await listContent({ collection: "testimonials", q: "zzz-nothing" })).toEqual([]);
  });

  it("describes each kind of item in a line", () => {
    expect(describeItem("projects", { title: "Bridge", role: "Lead", scope: "Deck" })).toEqual({
      title: "Bridge",
      detail: "Lead · Deck",
    });
    expect(describeItem("experiences", { role: "Engineer", company: "Acme", notes: "Built." })).toEqual({
      title: "Engineer, Acme",
      detail: "Built.",
    });
    expect(describeItem("testimonials", { author: "Sam", quote: "x".repeat(400) }).detail).toHaveLength(140);
    expect(describeItem("certifications", {}).title).toBe("Certification");
    expect(describeItem("education", { qualification: "BSc", institution: "UNILAG" })).toEqual({
      title: "BSc",
      detail: "UNILAG",
    });
    expect(describeItem("referees", { name: "Pat" }).title).toBe("Pat");
  });
});

describe("system status and the page index", () => {
  it("reports Redis groups, table sizes and which services are on", async () => {
    await onboardAndPublish(18);
    await fake.set(`views:${SLUG}:2026-10-01`, 1);
    await fake.set(`views:${SLUG}:p:p-001`, 1);
    await fake.set(`cv:${SLUG}:downloads`, 1);
    const status = await getSystemStatus();
    expect(status.redis.groups.find((g) => g.label === "Daily view counters")?.count).toBe(1);
    expect(status.redis.groups.find((g) => g.label === "Project view counters")?.count).toBe(1);
    expect(status.redis.groups.find((g) => g.label === "CV download counters")?.count).toBe(1);
    expect(status.redis.pages).toBe(1);
    expect(status.tables.users).toBe(1);
    expect(status.integrations.map((i) => i.name)).toContain("Email (Resend)");
  });

  it("adds pages missing from the Redis index and logs it", async () => {
    await onboardAndPublish(18);
    await fake.srem("sites", SLUG);
    expect(await reindexPages("root@example.com")).toEqual({ added: 1, total: 1 });
    expect(await fake.sismember("sites", SLUG)).toBe(1);
    expect((await listActivity()).events[0]?.detail).toMatch(/Rebuilt the page index/);
  });
});
