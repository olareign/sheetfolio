import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));

vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});

const { authenticate, changePassword, getCredentials, setPassword } = await import("./credentials");

const email = "ada@example.com";
const now = new Date("2026-10-21T09:00:00.000Z");
let fake: FakeRedis;

beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
});

describe("setPassword", () => {
  it("stores a hash, never the password, and claims the username", async () => {
    const r = await setPassword({ email: "Ada@Example.com", password: "a long password", username: "Ada", now });
    expect(r).toEqual({ ok: true, username: "ada" });

    const stored = fake.strings.get("cred:ada@example.com") ?? "";
    expect(stored).not.toContain("a long password");
    expect(await getCredentials(email)).toMatchObject({ username: "ada", updatedAt: now.toISOString() });
    expect(fake.strings.get("username:ada")).toBe(email);
  });

  it("refuses a username another account owns and writes nothing", async () => {
    await setPassword({ email, password: "a long password", username: "ada" });
    const r = await setPassword({ email: "bob@example.com", password: "another long one", username: "ada" });
    expect(r).toEqual({ ok: false, reason: "USERNAME_TAKEN" });
    expect(await getCredentials("bob@example.com")).toBeNull();
  });

  it("lets an account re-claim its own username, so a seed can be re-run", async () => {
    await setPassword({ email, password: "first password!", username: "ada" });
    const r = await setPassword({ email, password: "second password!", username: "ada" });
    expect(r).toEqual({ ok: true, username: "ada" });
  });

  it("keeps the current username when none is passed", async () => {
    await setPassword({ email, password: "first password!", username: "ada" });
    await setPassword({ email, password: "second password!" });
    expect((await getCredentials(email))?.username).toBe("ada");
  });

  it("frees the old username when the account moves to a new one", async () => {
    await setPassword({ email, password: "first password!", username: "ada" });
    await setPassword({ email, password: "first password!", username: "lovelace" });
    expect(fake.strings.has("username:ada")).toBe(false);
    expect(fake.strings.get("username:lovelace")).toBe(email);
  });

  it.each([["short"], ["x".repeat(129)]])("rejects a password outside 10–128 characters", async (password) => {
    await expect(setPassword({ email, password })).rejects.toThrow();
  });

  it("rejects a malformed username", async () => {
    await expect(setPassword({ email, password: "a long password", username: "no spaces" })).rejects.toThrow();
  });
});

describe("authenticate", () => {
  beforeEach(async () => {
    await setPassword({ email, password: "correct horse battery", username: "ada" });
  });

  it("accepts the username or the email, in any case", async () => {
    expect(await authenticate("ada", "correct horse battery")).toEqual({ email });
    expect(await authenticate("  ADA@Example.com ", "correct horse battery")).toEqual({ email });
  });

  it("returns null for a wrong password, unknown account, bad handle and blank input", async () => {
    expect(await authenticate("ada", "wrong horse battery")).toBeNull();
    expect(await authenticate("nobody", "correct horse battery")).toBeNull();
    expect(await authenticate("nobody@example.com", "correct horse battery")).toBeNull();
    expect(await authenticate("not a handle!", "correct horse battery")).toBeNull();
    expect(await authenticate("", "")).toBeNull();
  });

  it("returns null for an account that has no password set", async () => {
    expect(await authenticate("magic@example.com", "anything at all")).toBeNull();
  });
});

describe("changePassword", () => {
  beforeEach(async () => {
    await setPassword({ email, password: "correct horse battery", username: "ada" });
  });

  it("replaces the password when the current one is right, keeping the username", async () => {
    expect(await changePassword(email, "correct horse battery", "a brand new password")).toEqual({ ok: true });
    expect(await authenticate("ada", "a brand new password")).toEqual({ email });
    expect(await authenticate("ada", "correct horse battery")).toBeNull();
  });

  it("refuses a wrong current password and changes nothing", async () => {
    expect(await changePassword(email, "not the password", "a brand new password")).toEqual({
      ok: false,
      reason: "WRONG_PASSWORD",
    });
    expect(await authenticate("ada", "correct horse battery")).toEqual({ email });
  });

  it("reports an account with no password", async () => {
    expect(await changePassword("magic@example.com", "x", "a brand new password")).toEqual({
      ok: false,
      reason: "NO_PASSWORD",
    });
  });
});
