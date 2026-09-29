import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PublishableSite, type Site } from "@/content/schemas";
import type { Email } from "@/lib/email";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { submitEnquiry } = await import("./enquiry");
const { listLeads, getUnreadCount } = await import("./site");

const seed = JSON.parse(readFileSync("seed/idris.json", "utf8")) as { site: object };
const site: Site = PublishableSite.parse({ ...seed.site, updatedAt: "2026-09-28T00:00:00.000Z" });
const SLUG = "idris-rasaq";
const valid = {
  name: "Ada Client",
  email: "ada@example.com",
  company: "Acme",
  message: "Need a site engineer <b>now</b>",
};
let fake: FakeRedis;

const deps = (over: Partial<Parameters<typeof submitEnquiry>[2]> = {}) => ({
  getSite: async () => site,
  allow: async () => true,
  send: vi.fn(async () => {}),
  ...over,
});

beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
});

describe("submitEnquiry", () => {
  it("stores the lead and emails the engineer with reply-to set to the visitor", async () => {
    const send = vi.fn<(email: Email) => Promise<void>>(async () => {});
    expect(await submitEnquiry(SLUG, valid, deps({ send }))).toEqual({ ok: true, emailed: true });
    expect(await listLeads(SLUG, 0)).toEqual([expect.objectContaining({ name: "Ada Client", read: false })]);
    expect(await getUnreadCount(SLUG)).toBe(1);
    const email = send.mock.calls[0]?.[0];
    expect(email).toMatchObject({ to: "Ridrisolawale@gmail.com", replyTo: "ada@example.com" });
    expect(email?.html).toContain("&lt;b&gt;now&lt;/b&gt;"); // visitor text is escaped
    expect(email?.html).not.toContain("<b>now</b>");
  });

  it("keeps the lead when the email fails (inbox is the backup)", async () => {
    const d = deps({ send: vi.fn(async () => Promise.reject(new Error("Resend responded 500"))) });
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(await submitEnquiry(SLUG, valid, d)).toEqual({ ok: true, emailed: false });
    expect(await listLeads(SLUG, 0)).toHaveLength(1);
    expect(spy.mock.calls.flat().join(" ")).not.toContain("ada@example.com"); // no PII in logs
    spy.mockRestore();
  });

  it("rejects invalid input per field without storing anything", async () => {
    const r = await submitEnquiry(SLUG, { name: "", email: "nope", message: "" }, deps());
    expect(r).toEqual({
      ok: false,
      reason: "INVALID",
      fieldErrors: { name: "Required", email: "Enter a valid email address", message: "Required" },
    });
    expect(fake.lists.size).toBe(0);
  });

  it("stops at the rate limit before storing", async () => {
    expect(await submitEnquiry(SLUG, valid, deps({ allow: async () => false }))).toEqual({
      ok: false,
      reason: "RATE_LIMITED",
    });
    expect(fake.lists.size).toBe(0);
  });

  it("refuses sites that aren't published (or are suspended)", async () => {
    const allow = vi.fn(async () => true);
    expect(await submitEnquiry(SLUG, valid, deps({ getSite: async () => null, allow }))).toEqual({
      ok: false,
      reason: "UNAVAILABLE",
    });
    expect(allow).not.toHaveBeenCalled(); // no rate-limit token spent on a dead page
  });
});
