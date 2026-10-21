import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));

vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});

const {
  authenticate,
  changePassword,
  createResetToken,
  getCredentials,
  getSessionEpoch,
  isSessionCurrent,
  peekResetToken,
  resetPassword,
  setPassword,
} = await import("./credentials");

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

describe("session epoch", () => {
  it("starts at 0, and a session with no stamp counts as 0, so shipping this signs nobody out", async () => {
    expect(await getSessionEpoch(email)).toBe(0);
    expect(await isSessionCurrent(email, undefined)).toBe(true);
    expect(await isSessionCurrent(email, 0)).toBe(true);
  });

  it("a password change moves the epoch on, which ends every session stamped earlier", async () => {
    await setPassword({ email, password: "correct horse battery", username: "ada" });
    expect(await isSessionCurrent(email, 0)).toBe(true); // setting a first password signs nobody out

    await changePassword(email, "correct horse battery", "a brand new password");

    expect(await getSessionEpoch(email)).toBe(1);
    expect(await isSessionCurrent(email, 0)).toBe(false);
    expect(await isSessionCurrent(email, undefined)).toBe(false);
    expect(await isSessionCurrent(email, 1)).toBe(true);
  });

  it("a refused password change leaves sessions alone", async () => {
    await setPassword({ email, password: "correct horse battery" });
    await changePassword(email, "not the password", "a brand new password");
    expect(await getSessionEpoch(email)).toBe(0);
  });
});

describe("password reset", () => {
  beforeEach(async () => {
    await setPassword({ email, password: "correct horse battery", username: "ada" });
  });

  it("stores only a hash of the token, and it expires in an hour", async () => {
    const token = await createResetToken(email);

    const stored = [...fake.strings.keys()].filter((k) => k.startsWith("reset:"));
    expect(stored).toHaveLength(1);
    expect(stored[0]).not.toContain(token);
    expect([...fake.strings.values()].join(" ")).not.toContain(token);
    expect(fake.ttls.get(stored[0] as string)).toBe(3600);
    expect(fake.ttls.get("reset-latest:ada@example.com")).toBe(3600);
  });

  it("peeks the owner without using the token up", async () => {
    const token = await createResetToken(email);
    expect(await peekResetToken(token)).toBe(email);
    expect(await peekResetToken(token)).toBe(email);
  });

  it.each([
    ["unknown", "x".repeat(43)],
    ["too short", "abc"],
    ["wrong characters", "a b".repeat(10)],
    ["empty", ""],
  ])("rejects a %s token", async (_name, token) => {
    expect(await peekResetToken(token)).toBeNull();
    expect(await resetPassword(token, "a brand new password")).toEqual({ ok: false, reason: "INVALID_TOKEN" });
  });

  it("a newer request replaces the older link", async () => {
    const first = await createResetToken(email);
    const second = await createResetToken(email);

    expect(await peekResetToken(first)).toBeNull();
    expect(await peekResetToken(second)).toBe(email);
    expect(await resetPassword(first, "a brand new password")).toEqual({ ok: false, reason: "INVALID_TOKEN" });
  });

  it("sets the new password, keeps the username, and signs the account out everywhere", async () => {
    const token = await createResetToken(email);

    expect(await resetPassword(token, "a brand new password")).toEqual({ ok: true, email });

    expect(await authenticate("ada", "a brand new password")).toEqual({ email });
    expect(await authenticate("ada", "correct horse battery")).toBeNull();
    expect(await getSessionEpoch(email)).toBe(1);
  });

  it("works only once", async () => {
    const token = await createResetToken(email);
    await resetPassword(token, "a brand new password");

    expect(await resetPassword(token, "yet another password")).toEqual({ ok: false, reason: "INVALID_TOKEN" });
    expect(await authenticate("ada", "a brand new password")).toEqual({ email });
  });

  it("a too-short password is refused without burning the link", async () => {
    const token = await createResetToken(email);

    await expect(resetPassword(token, "short")).rejects.toThrow();

    expect(await resetPassword(token, "a perfectly fine password")).toEqual({ ok: true, email });
  });

  it("can set the first password for an account that signs in by email link", async () => {
    const token = await createResetToken("magic@example.com");

    expect(await resetPassword(token, "a brand new password")).toEqual({ ok: true, email: "magic@example.com" });
    expect(await authenticate("magic@example.com", "a brand new password")).toEqual({ email: "magic@example.com" });
  });
});
