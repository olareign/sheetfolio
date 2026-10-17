import { beforeEach, describe, expect, it, vi } from "vitest";
import { Site } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));

vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});
vi.mock("next/cache", () => ({ unstable_cache: <T>(fn: () => Promise<T>) => fn, revalidateTag: vi.fn() }));

const { getUserRecord, onboard } = await import("./accounts");
const { getDraft } = await import("./site");

const now = new Date("2026-09-28T10:00:00.000Z");
const input = { slug: "idris-rasaq", name: "Rasaq Idris Olawale", firstName: "Idris", headline: "Site Engineer" };
let fake: FakeRedis;

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

    expect(fake.strings.get("slug:idris-rasaq")).toBe("u1");
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
    expect(fake.strings.get("slug:idris-rasaq")).toBe("u1");
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
    expect(fake.strings.has("slug:second")).toBe(false);
  });

  it("releases the slug if a concurrent onboarding for the same email won", async () => {
    // Simulate the race: the user record appears between the existence check and the NX write.
    const realSet = fake.set.bind(fake);
    let injected = false;
    fake.set = async (key, value, opts) => {
      if (!injected && key === "user:a@example.com") {
        injected = true;
        await realSet(key, { id: "u1", slug: "winner", role: "engineer", name: "A", createdAt: now.toISOString() });
      }
      return realSet(key, value, opts);
    };
    const r = await onboard({ userId: "u1", email: "a@example.com", role: "engineer", input, now });
    expect(r).toEqual({ ok: false, reason: "ALREADY_ONBOARDED", slug: "winner" });
    expect(fake.strings.has("slug:idris-rasaq")).toBe(false);
  });

  it("rolls back the slug and user record if creating the draft fails", async () => {
    fake.failNextExec = true;
    await expect(onboard({ userId: "u1", email: "a@example.com", role: "engineer", input, now })).rejects.toThrow();
    expect(fake.strings.has("slug:idris-rasaq")).toBe(false);
    expect(fake.strings.has("user:a@example.com")).toBe(false);
  });

  it("validates input", async () => {
    await expect(
      onboard({ userId: "u1", email: "a@example.com", role: "engineer", input: { ...input, slug: "admin" }, now }),
    ).rejects.toThrow();
  });
});
