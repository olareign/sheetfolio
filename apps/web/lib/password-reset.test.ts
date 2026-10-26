import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/db";
import { FakeRedis } from "@/test/fake-redis";
import { peekResetToken, setPassword, type CredStore, type KV } from "./credential-store";
import { credStore } from "./store/credentials";
import { requestPasswordReset, sendPasswordChangedNotice } from "./password-reset";

const origin = "https://sheetfolio.app/";
const now = new Date("2026-10-21T09:30:00.000Z");
let fake: FakeRedis;
let kv: KV;
let creds: CredStore;

beforeEach(async () => {
  fake = new FakeRedis();
  kv = fake as unknown as KV;
  creds = credStore(db);
  await setPassword(creds, { email: "ada@example.com", password: "correct horse battery", username: "ada" });
});

type Deps = Parameters<typeof requestPasswordReset>[1];

/** Working defaults; `send` is always a mock so tests can inspect what would have been emailed. */
const deps = (over: Partial<Deps> = {}) =>
  ({
    kv,
    creds,
    accountExists: async () => true,
    allow: async () => true,
    send: vi.fn().mockResolvedValue(undefined),
    origin,
    now,
    ...over,
  }) as Deps & { send: ReturnType<typeof vi.fn> };

describe("requestPasswordReset", () => {
  it("emails a working one-time link to the account, found by username or email", async () => {
    for (const identifier of ["ada", " ADA@example.com "]) {
      const d = deps();
      await requestPasswordReset(identifier, d);

      expect(d.send).toHaveBeenCalledOnce();
      const mail = d.send.mock.calls[0]?.[0] as { to: string; subject: string; text: string };
      expect(mail).toMatchObject({ to: "ada@example.com", subject: "Reset your Sheetfolio password" });
      const link = mail.text.match(/https:\/\/sheetfolio\.app\/reset-password\?token=([\w-]+)/);
      expect(link).not.toBeNull();
      expect(await peekResetToken(kv, link?.[1] as string)).toBe("ada@example.com");
    }
  });

  it("does nothing, silently, for an account that does not exist", async () => {
    const d = deps({ accountExists: async () => false });
    await expect(requestPasswordReset("nobody@example.com", d)).resolves.toBeUndefined();
    expect(d.send).not.toHaveBeenCalled();
    expect([...fake.strings.keys()].some((k) => k.startsWith("reset"))).toBe(false);
  });

  it("does nothing for an unknown username, a blank or an oversized identifier", async () => {
    const d = deps();
    for (const identifier of ["nobody", "", "   ", "x".repeat(300)]) await requestPasswordReset(identifier, d);
    expect(d.send).not.toHaveBeenCalled();
  });

  it("sends nothing and issues no token when rate limited", async () => {
    const d = deps({ allow: async () => false });
    await requestPasswordReset("ada", d);
    expect(d.send).not.toHaveBeenCalled();
    expect([...fake.strings.keys()].some((k) => k.startsWith("reset"))).toBe(false);
  });

  it("swallows a failed send and logs without the address", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const d = deps({ send: vi.fn().mockRejectedValue(new Error("Resend responded 403")) });

    await expect(requestPasswordReset("ada@example.com", d)).resolves.toBeUndefined();

    expect(log).toHaveBeenCalledOnce();
    expect(String(log.mock.calls[0])).toContain("Resend responded 403");
    expect(String(log.mock.calls[0])).not.toContain("ada@example.com");
    log.mockRestore();
  });

  it("swallows a store failure too, so the caller can always show the same answer", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const brokenDb = { query: () => Promise.reject(new Error("database down")), batch: async () => {} };
    const broken = { ...kv, get: () => Promise.reject(new Error("redis down")) } as unknown as KV;
    await expect(
      requestPasswordReset("ada", deps({ kv: broken, creds: credStore(() => brokenDb) })),
    ).resolves.toBeUndefined();
    log.mockRestore();
  });
});

describe("sendPasswordChangedNotice", () => {
  it("emails the owner with a link back to the forgot-password page", async () => {
    const send = vi.fn().mockResolvedValue(undefined);
    await sendPasswordChangedNotice("ada@example.com", { send, origin, now });

    const mail = send.mock.calls[0]?.[0] as { to: string; subject: string; text: string };
    expect(mail).toMatchObject({ to: "ada@example.com", subject: "Your Sheetfolio password was changed" });
    expect(mail.text).toContain("https://sheetfolio.app/forgot-password");
    expect(mail.text).toContain("21 Oct 2026 09:30:00 UTC");
  });

  it("never throws when the email cannot be sent, because the change already happened", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const send = vi.fn().mockRejectedValue(new Error("Resend unreachable"));
    await expect(sendPasswordChangedNotice("ada@example.com", { send, origin })).resolves.toBeUndefined();
    expect(String(log.mock.calls[0])).not.toContain("ada@example.com");
    log.mockRestore();
  });
});
