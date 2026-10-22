import { beforeEach, describe, expect, it, vi } from "vitest";
import { createEmptySite } from "@/content/schemas";
import { FakeRedis } from "@/test/fake-redis";

// A data cache that behaves like Next's: it keeps what the function returns (by key) and nothing from a throw.
const state = vi.hoisted(() => ({ redis: undefined as unknown, memo: new Map<string, unknown>() }));
vi.mock("next/cache", () => ({
  unstable_cache:
    <A extends unknown[], T>(fn: (...args: A) => Promise<T>, keyParts: string[]) =>
    async (...args: A): Promise<T> => {
      const key = JSON.stringify([keyParts, args]);
      if (state.memo.has(key)) return state.memo.get(key) as T;
      const value = await fn(...args);
      state.memo.set(key, value);
      return value;
    },
  revalidateTag: vi.fn(() => state.memo.clear()),
}));
vi.mock("@/lib/redis", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/redis")>();
  return { ...actual, redis: () => state.redis };
});

const { getPublished, publish } = await import("./site");

const SLUG = "taofeeq-abdulrasaq";
let fake: FakeRedis;

beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
  state.memo.clear();
});

function seedReadyDraft() {
  const site = createEmptySite({
    name: "Taofeeq Abdulrasaq",
    firstName: "Taofeeq",
    headline: "Engineer",
    publicEmail: "t@example.com",
    now: new Date("2026-10-22T08:00:00.000Z"),
  });
  site.profile = { ...site.profile, summary: "Engineer.", location: "Lagos, Nigeria", whatsapp: "2347033435818" };
  fake.strings.set(`site:${SLUG}:draft`, JSON.stringify(site));
  fake.sets.set("sites", new Set([SLUG]));
}

describe("a page that is visited before it is published", () => {
  it("is a 404 at first, then shows as soon as it is published", async () => {
    seedReadyDraft();
    expect(await getPublished(SLUG)).toBeNull();

    await publish(SLUG, new Date("2026-10-22T09:00:00.000Z"));
    expect((await getPublished(SLUG))?.profile.name).toBe("Taofeeq Abdulrasaq");
  });

  it("is not stuck on 404 even when the page was written without going through publish", async () => {
    expect(await getPublished(SLUG)).toBeNull();
    seedReadyDraft();
    const draft = JSON.parse(String(fake.strings.get(`site:${SLUG}:draft`)));
    fake.strings.set(
      `site:${SLUG}:published`,
      JSON.stringify({
        ...draft,
        publishedAt: "2026-10-22T09:00:00.000Z",
        settings: { ...draft.settings, status: "published" },
      }),
    );
    expect(await getPublished(SLUG)).not.toBeNull();
  });
});
