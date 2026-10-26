import type { Redis } from "@upstash/redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRedis } from "@/test/fake-redis";
import { testDb } from "@/test/pg";
import type { StoreMode } from "./mode";

type Db = Awaited<ReturnType<typeof testDb>>;
const state = vi.hoisted(() => ({
  redis: undefined as unknown,
  db: undefined as unknown,
  mode: "redis" as string,
}));

vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("@/lib/db", () => ({ db: () => state.db }));
vi.mock("@/lib/env", () => ({
  env: () => ({ ACCOUNTS_STORE: state.mode, LEADS_STORE: state.mode, ADMIN_EMAILS: [] }),
}));
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { registerAccount, getUserRecord } = await import("@/lib/accounts");
const { authenticate, changePassword, isSessionCurrent, getSessionEpoch } = await import("@/lib/credentials");
const { addLead, countLeads, getUnreadCount, listLeads, markAllLeadsRead, markLeadRead } = await import("@/lib/site");
const { backfill, verify } = await import("./backfill");
const { pgCredStore } = await import("./credentials");
const { pgLeadStore } = await import("./leads");
const { pgUserStore } = await import("./users");

let db: Db;
let fake: FakeRedis;
beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => db.raw.close());
beforeEach(async () => {
  fake = new FakeRedis();
  state.redis = fake;
  state.db = db;
  await db.query("truncate users, credentials, session_epochs, leads");
});

const EMAIL = "ada@example.com";
const PASSWORD = "a long enough password";
const input = { slug: "ada-obi", name: "Ada Obi", firstName: "Ada", headline: "Engineer" };
const pgCount = async (table: string) =>
  Number((await db.query<{ n: number }>(`select count(*)::int n from ${table}`))[0]?.n);

/** Where the data ended up for each mode: [in Redis, in Postgres]. */
const WHERE: Record<StoreMode, [boolean, boolean]> = {
  redis: [true, false],
  dual: [true, true],
  "pg-first": [true, true],
  postgres: [false, true],
};

describe.each(Object.keys(WHERE) as StoreMode[])("the app in %s mode", (mode) => {
  beforeEach(() => {
    state.mode = mode;
  });

  it("signs up, signs in, changes the password and ends old sessions", async () => {
    const r = await registerAccount({ email: "Ada@Example.com", password: PASSWORD, role: "engineer", input });
    expect(r).toMatchObject({ ok: true, record: { slug: "ada-obi" } });
    expect(await getUserRecord(EMAIL)).toMatchObject({ slug: "ada-obi", name: "Ada Obi" });

    expect(await authenticate("ada-obi", PASSWORD)).toEqual({ email: EMAIL });
    expect(await authenticate(EMAIL, PASSWORD)).toEqual({ email: EMAIL });
    expect(await authenticate(EMAIL, "not the password")).toBeNull();

    expect(await isSessionCurrent(EMAIL, 0)).toBe(true);
    expect(await changePassword(EMAIL, PASSWORD, "another long password")).toEqual({ ok: true });
    expect(await isSessionCurrent(EMAIL, 0)).toBe(false);
    expect(await getSessionEpoch(EMAIL)).toBe(1);
    expect(await authenticate("ada-obi", "another long password")).toEqual({ email: EMAIL });
  });

  it("refuses a second account with the same email or page address", async () => {
    await registerAccount({ email: EMAIL, password: PASSWORD, role: "engineer", input });
    expect(
      await registerAccount({ email: EMAIL, password: PASSWORD, role: "engineer", input: { ...input, slug: "other" } }),
    ).toEqual({ ok: false, reason: "EMAIL_TAKEN" });
    expect(await registerAccount({ email: "bob@example.com", password: PASSWORD, role: "engineer", input })).toEqual({
      ok: false,
      reason: "SLUG_TAKEN",
    });
  });

  it("receives, lists, counts and reads enquiries", async () => {
    await registerAccount({ email: EMAIL, password: PASSWORD, role: "engineer", input });
    const a = await addLead(
      "ada-obi",
      { name: "Client A", email: "a@example.com", message: "Hi" },
      new Date("2026-10-01T10:00:00Z"),
    );
    await addLead(
      "ada-obi",
      { name: "Client B", email: "b@example.com", message: "Hello" },
      new Date("2026-10-01T11:00:00Z"),
    );
    expect((await listLeads("ada-obi", 0)).map((l) => l.name)).toEqual(["Client B", "Client A"]);
    expect([await countLeads("ada-obi"), await getUnreadCount("ada-obi")]).toEqual([2, 2]);

    expect(await markLeadRead("ada-obi", a.id)).toBe(true);
    expect(await getUnreadCount("ada-obi")).toBe(1);
    await markAllLeadsRead("ada-obi");
    expect(await getUnreadCount("ada-obi")).toBe(0);
  });

  it(`keeps the data in ${WHERE[mode][0] ? "Redis" : "no Redis"}${WHERE[mode][1] ? " and Postgres" : ""} as the mode says`, async () => {
    await registerAccount({ email: EMAIL, password: PASSWORD, role: "engineer", input });
    await addLead("ada-obi", { name: "Client A", email: "a@example.com", message: "Hi" });
    await changePassword(EMAIL, PASSWORD, "another long password");

    const [inRedis, inPg] = WHERE[mode];
    expect([
      fake.strings.has(`user:${EMAIL}`),
      fake.strings.has(`cred:${EMAIL}`),
      fake.lists.has("leads:ada-obi"),
    ]).toEqual([inRedis, inRedis, inRedis]);
    expect([await pgCount("users"), await pgCount("credentials"), await pgCount("leads")]).toEqual(
      inPg ? [1, 1, 1] : [0, 0, 0],
    );
    // The page itself is not part of this move yet: it is in Redis in every mode.
    expect(fake.strings.has("site:ada-obi:draft")).toBe(true);
  });
});

describe("the copy never fails the request, and the backfill repairs it", () => {
  it("still signs someone up when Postgres is down in dual mode", async () => {
    state.mode = "dual";
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    state.db = {
      query: () => Promise.reject(new Error("connection refused")),
      batch: () => Promise.reject(new Error("connection refused")),
    };

    expect(await registerAccount({ email: EMAIL, password: PASSWORD, role: "engineer", input })).toMatchObject({
      ok: true,
    });
    expect(await authenticate(EMAIL, PASSWORD)).toEqual({ email: EMAIL });
    await addLead("ada-obi", { name: "Client A", email: "a@example.com", message: "Hi" });
    expect(await countLeads("ada-obi")).toBe(1);
    expect(error).toHaveBeenCalled();
    expect(error.mock.calls.flat().join(" ")).not.toContain(EMAIL);

    state.db = db;
    error.mockRestore();
    const targets = { users: pgUserStore(() => db), creds: pgCredStore(() => db), leads: pgLeadStore(() => db) };
    const before = await verify(fake as unknown as Redis, targets, db);
    expect(before.ok).toBe(false);
    expect(before.differences.map((d) => d.what).sort()).toEqual(["account", "enquiry", "sign-in"]);

    expect(await backfill(fake as unknown as Redis, targets, { apply: true })).toEqual({
      users: 1,
      credentials: 1,
      epochs: 0,
      leads: 1,
    });
    const after = await verify(fake as unknown as Redis, targets, db);
    expect(after).toMatchObject({ ok: true, differences: [], checked: { users: 1, credentials: 1, leads: 1 } });
  });

  it("copies existing data across, again and again without duplicating, and carries the read state", async () => {
    state.mode = "redis";
    await registerAccount({ email: EMAIL, password: PASSWORD, role: "engineer", input });
    await changePassword(EMAIL, PASSWORD, "another long password");
    const a = await addLead(
      "ada-obi",
      { name: "Client A", email: "a@example.com", message: "Hi" },
      new Date("2026-10-01T10:00:00Z"),
    );
    await addLead(
      "ada-obi",
      { name: "Client B", email: "b@example.com", message: "Hello" },
      new Date("2026-10-01T11:00:00Z"),
    );
    await markLeadRead("ada-obi", a.id);

    const targets = { users: pgUserStore(() => db), creds: pgCredStore(() => db), leads: pgLeadStore(() => db) };
    const dry = await backfill(fake as unknown as Redis, targets, { apply: false });
    expect(dry).toEqual({ users: 1, credentials: 1, epochs: 1, leads: 2 });
    expect(await pgCount("users")).toBe(0);

    await backfill(fake as unknown as Redis, targets, { apply: true });
    await backfill(fake as unknown as Redis, targets, { apply: true });
    expect([
      await pgCount("users"),
      await pgCount("credentials"),
      await pgCount("session_epochs"),
      await pgCount("leads"),
    ]).toEqual([1, 1, 1, 2]);
    expect(await verify(fake as unknown as Redis, targets, db)).toMatchObject({ ok: true });

    // Reading from Postgres now gives the same answers as Redis did.
    state.mode = "postgres";
    expect(await authenticate("ada-obi", "another long password")).toEqual({ email: EMAIL });
    expect(await getSessionEpoch(EMAIL)).toBe(1);
    expect((await listLeads("ada-obi", 0)).map((l) => [l.name, l.read])).toEqual([
      ["Client B", false],
      ["Client A", true],
    ]);
    expect(await getUnreadCount("ada-obi")).toBe(1);
  });

  it("reports a difference when the copy has drifted, naming it without printing an email address", async () => {
    state.mode = "redis";
    await registerAccount({ email: EMAIL, password: PASSWORD, role: "engineer", input });
    const targets = { users: pgUserStore(() => db), creds: pgCredStore(() => db), leads: pgLeadStore(() => db) };
    await backfill(fake as unknown as Redis, targets, { apply: true });
    await db.query("update credentials set password_hash = 'tampered'");
    const verdict = await verify(fake as unknown as Redis, targets, db);
    expect(verdict.ok).toBe(false);
    expect(verdict.differences).toEqual([
      { kind: "different", what: "sign-in", label: expect.stringMatching(/^[0-9a-f]{8}$/) },
    ]);
  });
});
