import type { Redis } from "@upstash/redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Lead, UserRecord } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";
import { testDb } from "@/test/pg";
import { adminStore } from "./admin";
import { credStore, type CredentialRecord, type CredStore } from "./credentials";
import { leadStore, MAX_LEADS, type LeadStore } from "./leads";
import { reindexSites, siteStore, type SiteStore } from "./sites";
import { userStore, type UserStore } from "./users";

/* The stores' behaviour against a real Postgres (PGlite) with the real migrations applied. */

type Side = { users: UserStore; creds: CredStore; leads: LeadStore; sites: SiteStore };
type Db = Awaited<ReturnType<typeof testDb>>;

let db: Db;
beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => {
  await db.raw.close();
});

const make = async (): Promise<Side> => {
  await db.query(
    "truncate users, credentials, session_epochs, leads, sites, tailored_cvs, tailored_undo, stats_daily, stats_projects, stats_cv",
  );
  return {
    users: userStore(() => db),
    creds: credStore(() => db),
    leads: leadStore(() => db),
    sites: siteStore(
      () => db,
      async () => {},
    ),
  };
};

const user = (id: string, slug: string, over: Partial<UserRecord> = {}): UserRecord => ({
  id,
  slug,
  role: "engineer",
  plan: "free",
  name: `Name ${id}`,
  createdAt: "2026-10-01T10:00:00.000Z",
  ...over,
});
const cred = (over: Partial<CredentialRecord> = {}): CredentialRecord => ({
  hash: "scrypt$32768$8$1$salt$hash",
  updatedAt: "2026-10-02T10:00:00.000Z",
  ...over,
});
const lead = (n: number, over: Partial<Lead> = {}): Lead => ({
  id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  name: `Client ${n}`,
  email: `c${n}@example.com`,
  message: "Hello",
  read: false,
  createdAt: new Date(Date.UTC(2026, 9, 1, 10, 0, 0) + n * 1000).toISOString(),
  ...over,
});

describe("accounts", () => {
  let s: Side;
  beforeEach(async () => (s = await make()));

  it("creates an account and finds it by email in any case", async () => {
    expect(await s.users.create({ email: "ada@example.com", record: user("u1", "ada") })).toBe("ok");
    expect(await s.users.get("Ada@Example.COM")).toEqual(user("u1", "ada"));
    expect(await s.users.get("nobody@example.com")).toBeNull();
  });

  it("gives an email to the first account only, and leaves the loser's page address free", async () => {
    await s.users.create({ email: "ada@example.com", record: user("u1", "ada") });
    expect(await s.users.create({ email: "ada@example.com", record: user("u2", "ada-two") })).toBe("EMAIL_TAKEN");
    expect(await s.users.get("ada@example.com")).toMatchObject({ id: "u1", slug: "ada" });
    expect(await s.users.create({ email: "bob@example.com", record: user("u3", "ada-two") })).toBe("ok");
  });

  it("gives a page address to the first account only, and creates nothing for the loser", async () => {
    await s.users.create({ email: "ada@example.com", record: user("u1", "ada") });
    expect(await s.users.create({ email: "bob@example.com", record: user("u2", "ada") })).toBe("SLUG_TAKEN");
    expect(await s.users.get("bob@example.com")).toBeNull();
  });

  it("frees both the email and the address when an account is removed", async () => {
    await s.users.create({ email: "ada@example.com", record: user("u1", "ada") });
    await s.users.remove("ada@example.com", "ada");
    expect(await s.users.get("ada@example.com")).toBeNull();
    expect(await s.users.create({ email: "bob@example.com", record: user("u2", "ada") })).toBe("ok");
  });

  it("starts every account on the free plan and keeps a plan it is created with", async () => {
    await s.users.create({ email: "ada@example.com", record: user("u1", "ada") });
    await s.users.create({ email: "bob@example.com", record: user("u2", "bob", { plan: "pro" }) });
    expect(await s.users.get("ada@example.com")).toMatchObject({ plan: "free" });
    expect(await s.users.get("bob@example.com")).toMatchObject({ plan: "pro" });
  });

  it("keeps ids that are not UUIDs, such as the seed script's", async () => {
    await s.users.create({ email: "ada@example.com", record: user("seed:ada@example.com", "ada", { role: "admin" }) });
    expect(await s.users.get("ada@example.com")).toMatchObject({ id: "seed:ada@example.com", role: "admin" });
  });
});

describe("sign-in details", () => {
  let s: Side;
  beforeEach(async () => (s = await make()));

  it("stores and returns the details, with or without a username", async () => {
    await s.creds.save("ada@example.com", cred({ username: "ada" }));
    await s.creds.save("bob@example.com", cred());
    expect(await s.creds.get("ADA@example.com")).toEqual(cred({ username: "ada" }));
    expect(await s.creds.get("bob@example.com")).toEqual(cred());
    expect(await s.creds.get("nobody@example.com")).toBeNull();
  });

  it("finds the email from a username, in any case", async () => {
    await s.creds.save("ada@example.com", cred({ username: "ada" }));
    expect(await s.creds.emailFor("ADA")).toBe("ada@example.com");
    expect(await s.creds.emailFor("nobody")).toBeNull();
  });

  it("gives a username to the first account and writes nothing for the second", async () => {
    await s.creds.save("ada@example.com", cred({ username: "ada" }));
    expect(await s.creds.save("bob@example.com", cred({ username: "ada" }))).toEqual({
      ok: false,
      reason: "USERNAME_TAKEN",
    });
    expect(await s.creds.get("bob@example.com")).toBeNull();
    expect(await s.creds.emailFor("ada")).toBe("ada@example.com");
  });

  it("lets an account keep its own username, so a script can be run again", async () => {
    await s.creds.save("ada@example.com", cred({ username: "ada" }));
    expect(await s.creds.save("ada@example.com", cred({ username: "ada", hash: "new" }))).toEqual({ ok: true });
    expect((await s.creds.get("ada@example.com"))?.hash).toBe("new");
  });

  it("frees the old username when an account moves to a new one, or drops it", async () => {
    await s.creds.save("ada@example.com", cred({ username: "ada" }));
    await s.creds.save("ada@example.com", cred({ username: "lovelace" }));
    expect(await s.creds.emailFor("ada")).toBeNull();
    expect(await s.creds.emailFor("lovelace")).toBe("ada@example.com");
    expect(await s.creds.save("bob@example.com", cred({ username: "ada" }))).toEqual({ ok: true });

    await s.creds.save("ada@example.com", cred());
    expect(await s.creds.emailFor("lovelace")).toBeNull();
    expect((await s.creds.get("ada@example.com"))?.username).toBeUndefined();
  });

  it("counts sign-out-everywhere per account, from zero", async () => {
    expect(await s.creds.epoch("ada@example.com")).toBe(0);
    expect(await s.creds.bumpEpoch("ada@example.com")).toBe(1);
    expect(await s.creds.bumpEpoch("Ada@Example.com")).toBe(2);
    expect(await s.creds.epoch("ada@example.com")).toBe(2);
    expect(await s.creds.epoch("bob@example.com")).toBe(0);
  });
});

describe("enquiries", () => {
  let s: Side;
  beforeEach(async () => (s = await make()));

  it("lists newest first, counts, and counts unread", async () => {
    await s.leads.add("ada", lead(1));
    await s.leads.add("ada", lead(2));
    const list = await s.leads.list("ada", 0, 20);
    expect(list.map((l) => l.name)).toEqual(["Client 2", "Client 1"]);
    expect(list[0]).toEqual(lead(2));
    expect([await s.leads.count("ada"), await s.leads.unread("ada")]).toEqual([2, 2]);
  });

  it("keeps each page's enquiries apart", async () => {
    await s.leads.add("ada", lead(1));
    await s.leads.add("bob", lead(2));
    expect((await s.leads.list("ada", 0, 20)).map((l) => l.name)).toEqual(["Client 1"]);
    expect([await s.leads.count("bob"), await s.leads.count("nobody")]).toEqual([1, 0]);
  });

  it("keeps an optional company, and leaves it out when there is none", async () => {
    await s.leads.add("ada", lead(1, { company: "Acme" }));
    await s.leads.add("ada", lead(2));
    const [two, one] = await s.leads.list("ada", 0, 20);
    expect(one?.company).toBe("Acme");
    expect(two).not.toHaveProperty("company");
  });

  it("pages through them", async () => {
    for (let i = 1; i <= 5; i++) await s.leads.add("ada", lead(i));
    expect((await s.leads.list("ada", 1, 2)).map((l) => l.name)).toEqual(["Client 3", "Client 2"]);
    expect(await s.leads.list("ada", 9, 2)).toEqual([]);
  });

  it("marks one read, once, and says so for an unknown id", async () => {
    await s.leads.add("ada", lead(1));
    await s.leads.add("ada", lead(2));
    expect(await s.leads.markRead("ada", lead(1).id)).toBe(true);
    expect(await s.leads.markRead("ada", lead(1).id)).toBe(true);
    expect(await s.leads.unread("ada")).toBe(1);
    expect((await s.leads.list("ada", 0, 20)).map((l) => [l.name, l.read])).toEqual([
      ["Client 2", false],
      ["Client 1", true],
    ]);
    expect(await s.leads.markRead("ada", lead(99).id)).toBe(false);
    expect(await s.leads.markRead("bob", lead(2).id)).toBe(false); // another page's enquiry
    expect(await s.leads.unread("ada")).toBe(1);
  });

  it("marks all read, and a later enquiry is unread again", async () => {
    await s.leads.add("ada", lead(1));
    await s.leads.add("ada", lead(2));
    await s.leads.markAllRead("ada");
    expect(await s.leads.unread("ada")).toBe(0);
    expect((await s.leads.list("ada", 0, 20)).every((l) => l.read)).toBe(true);
    await s.leads.add("ada", lead(3));
    expect(await s.leads.unread("ada")).toBe(1);
  });

  it(`keeps only the latest ${MAX_LEADS}`, async () => {
    for (let i = 1; i <= MAX_LEADS + 2; i++) await s.leads.add("ada", lead(i));
    expect(await s.leads.count("ada")).toBe(MAX_LEADS);
    expect((await s.leads.list("ada", 0, 1))[0]?.name).toBe(`Client ${MAX_LEADS + 2}`);
    expect((await s.leads.list("ada", MAX_LEADS - 1, 1))[0]?.name).toBe("Client 3");
  });
});

const draftDoc = (n = 1) => ({
  profile: { name: "Ada Obi", headline: "Engineer", summary: `Version ${n}`, nested: { list: [1, 2, { deep: true }] } },
  projects: [{ id: "p1", title: "Clinic" }],
  settings: { theme: "sheet", status: "draft" },
  updatedAt: `2026-10-0${n}T10:00:00.000Z`,
});
const publishedDoc = (n = 1) => ({
  ...draftDoc(n),
  settings: { theme: "sheet", status: "published" },
  publishedAt: `2026-10-0${n}T12:00:00.000Z`,
});

describe("pages", () => {
  let s: Side;
  beforeEach(async () => (s = await make()));

  it("creates a page and reads its draft back exactly, nested data included", async () => {
    await s.sites.create("ada-obi", draftDoc());
    expect(await s.sites.getDraft("ada-obi")).toEqual(draftDoc());
    expect(await s.sites.getDraft("nobody")).toBeNull();
    expect([await s.sites.getPublished("ada-obi"), await s.sites.firstPublishedAt("ada-obi")]).toEqual([null, null]);
  });

  it("lists every registered page address", async () => {
    await s.sites.create("bob", draftDoc());
    await s.sites.create("ada-obi", draftDoc());
    expect((await s.sites.list()).sort()).toEqual(["ada-obi", "bob"]);
  });

  it("replaces the draft and leaves the published copy alone, or replaces both together", async () => {
    await s.sites.create("ada-obi", draftDoc(1));
    await s.sites.publish("ada-obi", { doc: publishedDoc(1), publishedAt: publishedDoc(1).publishedAt });
    await s.sites.put("ada-obi", { draft: draftDoc(2) });
    expect((await s.sites.getDraft("ada-obi")) as object).toEqual(draftDoc(2));
    expect(await s.sites.getPublished("ada-obi")).toEqual(publishedDoc(1));

    await s.sites.put("ada-obi", { draft: draftDoc(3), published: publishedDoc(3) });
    expect(await s.sites.getDraft("ada-obi")).toEqual(draftDoc(3));
    expect(await s.sites.getPublished("ada-obi")).toEqual(publishedDoc(3));
  });

  it("remembers the first time a page went live, and only the first", async () => {
    await s.sites.create("ada-obi", draftDoc());
    await s.sites.publish("ada-obi", { doc: publishedDoc(1), publishedAt: "2026-10-01T12:00:00.000Z" });
    await s.sites.publish("ada-obi", { doc: publishedDoc(2), publishedAt: "2026-10-02T12:00:00.000Z" });
    expect(await s.sites.firstPublishedAt("ada-obi")).toBe("2026-10-01T12:00:00.000Z");
    expect(await s.sites.getPublished("ada-obi")).toEqual(publishedDoc(2));
  });
});

describe("constraints and edge cases", () => {
  it("refuses to publish a page that has no draft rather than quietly doing nothing", async () => {
    await db.query("truncate sites");
    await expect(
      siteStore(
        () => db,
        async () => {},
      ).publish("ghost", { doc: publishedDoc(), publishedAt: "2026-10-01T12:00:00.000Z" }),
    ).rejects.toThrow(/no page in the database/);
  });

  it("rejects page addresses and documents that break the table's rules", async () => {
    const store = siteStore(
      () => db,
      async () => {},
    );
    await expect(store.create("Bad Slug", draftDoc())).rejects.toMatchObject({ code: "23514" });
    await expect(store.create("ada", ["not", "an", "object"])).rejects.toMatchObject({ code: "23514" });
  });

  it("ignores the same enquiry arriving twice (a retry)", async () => {
    await db.query("truncate leads");
    const store = leadStore(() => db);
    await store.add("ada", lead(1));
    await store.add("ada", lead(1));
    expect(await store.count("ada")).toBe(1);
  });
});

describe("page registration", () => {
  it("adds a new page to the Redis index, and survives that index being unavailable", async () => {
    await db.query("truncate sites");
    const added: string[] = [];
    const store = siteStore(
      () => db,
      async (slug) => {
        added.push(slug);
      },
    );
    await store.create("ada-obi", draftDoc());
    expect(added).toEqual(["ada-obi"]);

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const broken = siteStore(
      () => db,
      async () => Promise.reject(new Error("redis down")),
    );
    await expect(broken.create("bob", draftDoc())).resolves.toBeUndefined();
    expect(await broken.getDraft("bob")).toEqual(draftDoc());
    log.mockRestore();
  });

  it("rebuilds the Redis index from the database, adding only what is missing", async () => {
    await db.query("truncate sites");
    const store = siteStore(
      () => db,
      async () => {},
    );
    await store.create("ada-obi", draftDoc());
    await store.create("bob", draftDoc());
    const fake = new FakeRedis();
    fake.sets.set("sites", new Set(["ada-obi", "stale-page"]));

    expect(await reindexSites(fake as unknown as Redis, store)).toEqual({ added: 1, total: 2 });
    expect([...(fake.sets.get("sites") ?? [])].sort()).toEqual(["ada-obi", "bob", "stale-page"]);
    expect(await reindexSites(fake as unknown as Redis, store)).toEqual({ added: 0, total: 2 });
  });
});

describe("admin: accounts, enquiries across pages, and removing an account", () => {
  it("finds an account by its page address, and moves it between plans", async () => {
    const s = await make();
    await s.users.create({ email: "Ada@Example.com", record: user("u1", "ada") });
    expect(await s.users.getBySlug("ada")).toMatchObject({ email: "ada@example.com", record: { slug: "ada" } });
    expect(await s.users.getBySlug("nobody")).toBeNull();

    expect(await s.users.setPlan("ADA@example.com", "pro")).toBe(true);
    expect((await s.users.get("ada@example.com"))?.plan).toBe("pro");
    expect(await s.users.setPlan("nobody@example.com", "pro")).toBe(false);
  });

  it("rejects a plan that does not exist", async () => {
    const s = await make();
    await s.users.create({ email: "ada@example.com", record: user("u1", "ada") });
    await expect(s.users.setPlan("ada@example.com", "gold" as "pro")).rejects.toThrow();
  });

  it("searches enquiries across pages, pages through them and counts them", async () => {
    const s = await make();
    await s.leads.add("ada", lead(1, { name: "Zed Client", message: "Need a bridge" }));
    await s.leads.add("ada", lead(2, { company: "Acme 100%", read: true }));
    await s.leads.add("bob", lead(3, { email: "pat@example.org" }));

    const all = await s.leads.search({ page: 0, pageSize: 10 });
    expect(all.total).toBe(3);
    expect(all.rows.map((r) => `${r.slug}:${r.name}`)).toEqual(["bob:Client 3", "ada:Client 2", "ada:Zed Client"]);

    expect((await s.leads.search({ q: "bridge", page: 0, pageSize: 10 })).rows.map((r) => r.slug)).toEqual(["ada"]);
    expect((await s.leads.search({ q: "pat@example", page: 0, pageSize: 10 })).total).toBe(1);
    expect((await s.leads.search({ slug: "bob", page: 0, pageSize: 10 })).total).toBe(1);
    expect((await s.leads.search({ unreadOnly: true, page: 0, pageSize: 10 })).total).toBe(2);
    // A typed % is a character, not a wildcard.
    expect((await s.leads.search({ q: "100%", page: 0, pageSize: 10 })).total).toBe(1);
    expect((await s.leads.search({ q: "%", page: 0, pageSize: 10 })).total).toBe(1);
    expect((await s.leads.search({ page: 1, pageSize: 2 })).rows).toHaveLength(1);

    expect(await s.leads.totals()).toEqual({ total: 3, unread: 2 });
    expect(await s.leads.countsBySlug()).toEqual(
      new Map([
        ["ada", { total: 2, unread: 1 }],
        ["bob", { total: 1, unread: 1 }],
      ]),
    );
  });

  it("deletes one enquiry, only on its own page", async () => {
    const s = await make();
    await s.leads.add("ada", lead(1));
    expect(await s.leads.remove("bob", lead(1).id)).toBe(false);
    expect(await s.leads.remove("ada", lead(1).id)).toBe(true);
    expect(await s.leads.count("ada")).toBe(0);
  });

  it("returns every page's documents in one query", async () => {
    const s = await make();
    await s.sites.create("ada", { name: "Ada" });
    await s.sites.create("bob", { name: "Bob" });
    await s.sites.publish("bob", { doc: { name: "Bob live" }, publishedAt: "2026-10-02T10:00:00.000Z" });
    const docs = await s.sites.listDocs();
    expect(docs.map((d) => [d.slug, d.published !== null])).toEqual([
      ["ada", false],
      ["bob", true],
    ]);
  });

  it("counts the platform, and removes one account with everything it owns and nothing else", async () => {
    const s = await make();
    const store = adminStore(() => db);
    await s.users.create({ email: "ada@example.com", record: user("u1", "ada", { plan: "pro" }) });
    await s.users.create({ email: "bob@example.com", record: user("u2", "bob") });
    await s.creds.save("ada@example.com", cred());
    await s.creds.save("bob@example.com", cred());
    await s.creds.bumpEpoch("ada@example.com");
    await s.sites.create("ada", { settings: { status: "suspended" } });
    await s.sites.create("bob", { settings: { status: "draft" } });
    await s.leads.add("ada", lead(1));
    await s.leads.add("bob", lead(2));
    await db.query(
      "insert into tailored_cvs (id, slug, slot, name, overlay, created_at, updated_at) values ('v1','ada',1,'x','{}'::jsonb, now(), now())",
    );
    await db.query("insert into stats_daily (slug, day, views) values ('ada','2026-10-01',3),('bob','2026-10-01',4)");

    expect(await store.totals()).toEqual({
      users: 2,
      proUsers: 1,
      pages: 2,
      publishedPages: 0,
      suspendedPages: 1,
      savedVersions: 1,
    });

    await store.purgeAccount({ email: "ADA@example.com", slug: "ada" });

    expect(await s.users.get("ada@example.com")).toBeNull();
    expect(await s.creds.get("ada@example.com")).toBeNull();
    expect(await s.creds.epoch("ada@example.com")).toBe(0);
    expect(await s.sites.getDraft("ada")).toBeNull();
    expect(await s.leads.count("ada")).toBe(0);
    const counts = await store.tableCounts();
    expect(counts).toMatchObject({ users: 1, credentials: 1, sites: 1, leads: 1, tailored_cvs: 0, stats_daily: 1 });
    // The other account is untouched.
    expect(await s.users.get("bob@example.com")).not.toBeNull();
    expect(await s.leads.count("bob")).toBe(1);
  });
});
