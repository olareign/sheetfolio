import type { Redis } from "@upstash/redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { Lead, UserRecord } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";
import { testDb } from "@/test/pg";
import { pgCredStore, redisCredStore, type CredentialRecord, type CredStore, type KV } from "./credentials";
import { MAX_LEADS, pgLeadStore, redisLeadStore, type LeadStore } from "./leads";
import { pgSiteStore, redisSiteStore, type SiteStore } from "./sites";
import { pgUserStore, redisUserStore, type UserStore } from "./users";

/*
 * One set of behaviours, run against the Redis stores and the Postgres stores. If a test passes for one and fails for
 * the other, moving the data would change what the app does, so it must fail here first.
 */

type Side = { users: UserStore; creds: CredStore; leads: LeadStore; sites: SiteStore };
type Db = Awaited<ReturnType<typeof testDb>>;

let db: Db;
beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => {
  await db.raw.close();
});

const sides: { name: string; make: () => Promise<Side> }[] = [
  {
    name: "Redis",
    make: async () => {
      const fake = new FakeRedis();
      return {
        users: redisUserStore(() => fake as unknown as Redis),
        creds: redisCredStore(() => fake as unknown as KV),
        leads: redisLeadStore(() => fake as unknown as Redis),
        sites: redisSiteStore(() => fake as unknown as Redis),
      };
    },
  },
  {
    name: "Postgres",
    make: async () => {
      await db.query("truncate users, credentials, session_epochs, leads, sites");
      return {
        users: pgUserStore(() => db),
        creds: pgCredStore(() => db),
        leads: pgLeadStore(() => db),
        sites: pgSiteStore(() => db),
      };
    },
  },
];

const user = (id: string, slug: string, over: Partial<UserRecord> = {}): UserRecord => ({
  id,
  slug,
  role: "engineer",
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

describe.each(sides)("$name: accounts", ({ make }) => {
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

  it("keeps ids that are not UUIDs, such as the seed script's", async () => {
    await s.users.create({ email: "ada@example.com", record: user("seed:ada@example.com", "ada", { role: "admin" }) });
    expect(await s.users.get("ada@example.com")).toMatchObject({ id: "seed:ada@example.com", role: "admin" });
  });
});

describe.each(sides)("$name: sign-in details", ({ make }) => {
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

describe.each(sides)("$name: enquiries", ({ make }) => {
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

describe.each(sides)("$name: pages", ({ make }) => {
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

  it("copies a whole page out and back in, byte for byte in meaning", async () => {
    await s.sites.create("ada-obi", draftDoc(1));
    await s.sites.publish("ada-obi", { doc: publishedDoc(1), publishedAt: "2026-10-01T12:00:00.000Z" });
    const snap = await s.sites.snapshot("ada-obi");
    expect(snap).toEqual({
      draft: draftDoc(1),
      published: publishedDoc(1),
      firstPublishedAt: "2026-10-01T12:00:00.000Z",
    });
    expect(await s.sites.snapshot("nobody")).toBeNull();

    await s.sites.restore("bob", snap!);
    expect(await s.sites.snapshot("bob")).toEqual(snap);
    expect(await s.sites.list()).toContain("bob");
  });

  it("restores a page that was never published, clearing any published copy", async () => {
    await s.sites.create("ada-obi", draftDoc(1));
    await s.sites.publish("ada-obi", { doc: publishedDoc(1), publishedAt: "2026-10-01T12:00:00.000Z" });
    await s.sites.restore("ada-obi", { draft: draftDoc(2), published: null, firstPublishedAt: null });
    expect(await s.sites.snapshot("ada-obi")).toEqual({ draft: draftDoc(2), published: null, firstPublishedAt: null });
  });
});

describe("Postgres only", () => {
  it("refuses to publish a page that has no draft rather than quietly doing nothing", async () => {
    await db.query("truncate sites");
    await expect(
      pgSiteStore(() => db).publish("ghost", { doc: publishedDoc(), publishedAt: "2026-10-01T12:00:00.000Z" }),
    ).rejects.toThrow(/no page in the database/);
  });

  it("rejects page addresses and documents that break the table's rules", async () => {
    const store = pgSiteStore(() => db);
    await expect(store.create("Bad Slug", draftDoc())).rejects.toMatchObject({ code: "23514" });
    await expect(store.create("ada", ["not", "an", "object"])).rejects.toMatchObject({ code: "23514" });
  });

  it("ignores the same enquiry arriving twice (a retry, or the backfill overlapping a live write)", async () => {
    await db.query("truncate leads");
    const store = pgLeadStore(() => db);
    await store.add("ada", lead(1));
    await store.add("ada", lead(1));
    expect(await store.count("ada")).toBe(1);
  });
});
