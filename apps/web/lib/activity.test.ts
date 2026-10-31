import { beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRedis } from "@/test/fake-redis";

const state = vi.hoisted(() => ({ redis: undefined as unknown }));
vi.mock("@/lib/redis", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/redis")>()),
  redis: () => state.redis,
}));

const { countActivitySince, FEED_MAX, listActivity, recordActivity, USER_MAX } = await import("./activity");

let fake: FakeRedis;
beforeEach(() => {
  fake = new FakeRedis();
  state.redis = fake;
});

const at = (n: number) => new Date(Date.UTC(2026, 9, 1, 10, 0, n));

describe("recordActivity and listActivity", () => {
  it("lists the newest events first, in the platform log and in the account's own", async () => {
    await recordActivity({ type: "signup", slug: "ada", email: "ada@example.com", at: at(1) });
    await recordActivity({ type: "publish", slug: "ada", detail: "Published the page", at: at(2) });
    await recordActivity({ type: "signup", slug: "bob", at: at(3) });

    const all = await listActivity();
    expect(all.events.map((e) => `${e.type}:${e.slug}`)).toEqual(["signup:bob", "publish:ada", "signup:ada"]);
    const ada = await listActivity({ slug: "ada" });
    expect(ada.events.map((e) => e.type)).toEqual(["publish", "signup"]);
  });

  it("pages with an offset and says when there is more", async () => {
    for (let i = 0; i < 5; i++) await recordActivity({ type: "login", slug: "ada", at: at(i) });
    const first = await listActivity({ limit: 2 });
    expect(first.events).toHaveLength(2);
    expect(first.more).toBe(true);
    const last = await listActivity({ limit: 2, offset: 4 });
    expect(last.events).toHaveLength(1);
    expect(last.more).toBe(false);
  });

  it("filters by type", async () => {
    await recordActivity({ type: "signup", slug: "ada", at: at(1) });
    await recordActivity({ type: "lead", slug: "ada", at: at(2) });
    await recordActivity({ type: "tailor", slug: "ada", at: at(3) });
    const result = await listActivity({ type: "lead" });
    expect(result.events.map((e) => e.type)).toEqual(["lead"]);
  });

  it("keeps only the newest events", async () => {
    expect(FEED_MAX).toBeGreaterThan(USER_MAX);
    for (let i = 0; i < USER_MAX + 5; i++) await recordActivity({ type: "login", slug: "ada", at: at(i % 50) });
    expect(await fake.llen("activity:user:ada")).toBe(USER_MAX);
  });

  it("ignores something that is not an event, and never throws when Redis is down", async () => {
    await fake.lpush("activity:feed", "not json", JSON.stringify({ type: "nope" }));
    expect((await listActivity()).events).toEqual([]);

    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.redis = {
      pipeline: () => {
        throw new Error("redis is down");
      },
    };
    await expect(recordActivity({ type: "login", slug: "ada" })).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });

  it("drops an event with an invalid shape instead of storing it", async () => {
    await recordActivity({ type: "login", slug: "x".repeat(200) });
    expect(await fake.llen("activity:feed")).toBe(0);
  });
});

describe("countActivitySince", () => {
  it("counts one type since a moment", async () => {
    await recordActivity({ type: "tailor", slug: "ada", at: at(1) });
    await recordActivity({ type: "tailor", slug: "ada", at: at(30) });
    await recordActivity({ type: "lead", slug: "ada", at: at(31) });
    expect(await countActivitySince("tailor", at(10))).toBe(1);
    expect(await countActivitySince("tailor", at(0))).toBe(2);
  });
});
