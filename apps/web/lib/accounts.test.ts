import { beforeEach, describe, expect, it, vi } from "vitest";
import { Site } from "@/content/schemas";
import { db } from "@/lib/db";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));

vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { getUserRecord, onboard, registerAccount } = await import("./accounts");
const { authenticate } = await import("./credentials");
const { getDraft } = await import("./site");

const now = new Date("2026-09-28T10:00:00.000Z");
const input = { slug: "idris-rasaq", name: "Rasaq Idris Olawale", firstName: "Idris", headline: "Site Engineer" };
let fake: FakeRedis;

const count = async (table: string) =>
  Number((await db().query<{ n: number }>(`select count(*)::int as n from ${table}`))[0]?.n);
const ownerOf = async (slug: string) =>
  (await db().query<{ id: string }>("select id from users where slug = $1", [slug]))[0]?.id;

beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
});

describe("onboard", () => {
  it("claims the slug, writes the user record, and getDraft returns an empty valid Site", async () => {
    const r = await onboard({ userId: "u1", email: "Ridrisolawale@Gmail.com", role: "engineer", input, now });
    expect(r).toEqual({
      ok: true,
      record: expect.objectContaining({ id: "u1", slug: "idris-rasaq", role: "engineer" }),
    });

    expect(await ownerOf("idris-rasaq")).toBe("u1");
    expect(await getUserRecord("ridrisolawale@gmail.com")).toMatchObject({ slug: "idris-rasaq" });
    expect(fake.sets.get("sites")?.has("idris-rasaq")).toBe(true);

    const draft = await getDraft("idris-rasaq");
    expect(draft).not.toBeNull();
    expect(Site.safeParse(draft).success).toBe(true);
    expect(draft?.profile.publicEmail).toBe("ridrisolawale@gmail.com");
    expect(draft?.projects).toEqual([]);
  });

  it("reports a taken slug without touching the other user's data", async () => {
    await onboard({ userId: "u1", email: "a@example.com", role: "engineer", input, now });
    const r = await onboard({ userId: "u2", email: "b@example.com", role: "engineer", input, now });
    expect(r).toEqual({ ok: false, reason: "SLUG_TAKEN" });
    expect(await ownerOf("idris-rasaq")).toBe("u1");
    expect(await getUserRecord("b@example.com")).toBeNull();
  });

  it("won't give one account a second slug", async () => {
    await onboard({ userId: "u1", email: "a@example.com", role: "engineer", input, now });
    const r = await onboard({
      userId: "u1",
      email: "a@example.com",
      role: "engineer",
      input: { ...input, slug: "second" },
      now,
    });
    expect(r).toEqual({ ok: false, reason: "ALREADY_ONBOARDED", slug: "idris-rasaq" });
    expect(await ownerOf("second")).toBeUndefined();
  });

  it("gives a concurrent sign-up for the same email to the first, and releases the loser's page address", async () => {
    const [first, second] = await Promise.all([
      onboard({ userId: "u1", email: "a@example.com", role: "engineer", input, now }),
      onboard({ userId: "u2", email: "a@example.com", role: "engineer", input: { ...input, slug: "second" }, now }),
    ]);
    expect(first.ok).toBe(true);
    expect(second).toEqual({ ok: false, reason: "ALREADY_ONBOARDED", slug: "idris-rasaq" });
    expect(await ownerOf("second")).toBeUndefined();
    expect(await count("users")).toBe(1);
  });

  it("rolls back the user record if creating the draft fails", async () => {
    // Take the pages table away for the duration so that creating the draft throws.
    await db().query("alter table sites rename to sites_away");
    try {
      await expect(onboard({ userId: "u1", email: "a@example.com", role: "engineer", input, now })).rejects.toThrow();
    } finally {
      await db().query("alter table sites_away rename to sites");
    }
    expect(await ownerOf("idris-rasaq")).toBeUndefined();
    expect(await getUserRecord("a@example.com")).toBeNull();
  });

  it("validates input", async () => {
    await expect(
      onboard({ userId: "u1", email: "a@example.com", role: "engineer", input: { ...input, slug: "admin" }, now }),
    ).rejects.toThrow();
  });
});

describe("registerAccount", () => {
  const signup = {
    email: "Ada@Example.com",
    password: "a-long-enough-password",
    role: "engineer" as const,
    input,
    now,
  };

  it("creates the page and a password that works with the email or the page address", async () => {
    const r = await registerAccount(signup);
    expect(r).toMatchObject({ ok: true, record: { slug: "idris-rasaq", role: "engineer" } });
    expect(await getUserRecord("ada@example.com")).toMatchObject({ slug: "idris-rasaq" });
    expect(fake.sets.get("sites")?.has("idris-rasaq")).toBe(true);

    expect(await authenticate("ada@example.com", signup.password)).toEqual({ email: "ada@example.com" });
    expect(await authenticate("idris-rasaq", signup.password)).toEqual({ email: "ada@example.com" });
    expect(await authenticate("ada@example.com", "not-the-password")).toBeNull();
  });

  it("refuses an email that already has an account, and leaves its password alone", async () => {
    await registerAccount(signup);
    const again = await registerAccount({
      ...signup,
      password: "another-long-password",
      input: { ...input, slug: "second" },
    });
    expect(again).toEqual({ ok: false, reason: "EMAIL_TAKEN" });
    expect(await ownerOf("second")).toBeUndefined();
    expect(await authenticate("ada@example.com", signup.password)).not.toBeNull();
    expect(await authenticate("ada@example.com", "another-long-password")).toBeNull();
  });

  it("will not let a sign-up set a password on an existing account that has none", async () => {
    await onboard({ userId: "u1", email: "ada@example.com", role: "engineer", input, now });
    const r = await registerAccount({ ...signup, input: { ...input, slug: "second" } });
    expect(r).toEqual({ ok: false, reason: "EMAIL_TAKEN" });
    expect(await authenticate("ada@example.com", signup.password)).toBeNull();
  });

  it("reports a taken address without creating credentials", async () => {
    await registerAccount(signup);
    const r = await registerAccount({ ...signup, email: "b@example.com" });
    expect(r).toEqual({ ok: false, reason: "SLUG_TAKEN" });
    expect(await getUserRecord("b@example.com")).toBeNull();
    expect(await authenticate("b@example.com", signup.password)).toBeNull();
  });

  it("still creates the account when the page address is already someone's username", async () => {
    await db().query(
      "insert into credentials (email, username, password_hash, updated_at) values ('other@example.com', 'idris-rasaq', 'x', now())",
    );
    const r = await registerAccount(signup);
    expect(r.ok).toBe(true);
    expect(await authenticate("ada@example.com", signup.password)).not.toBeNull();
    expect(await authenticate("idris-rasaq", signup.password)).toBeNull();
  });

  it("rejects a short password before touching anything", async () => {
    await expect(registerAccount({ ...signup, password: "short" })).rejects.toThrow();
    expect([await count("users"), await count("credentials"), await count("sites")]).toEqual([0, 0, 0]);
  });
});
