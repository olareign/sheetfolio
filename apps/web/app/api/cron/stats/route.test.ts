import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { FakeRedis } from "@/test/fake-redis";
import { testDb } from "@/test/pg";

const SECRET = "s".repeat(40);
type Db = Awaited<ReturnType<typeof testDb>>;
const state = vi.hoisted(() => ({
  env: {} as { CRON_SECRET?: string; DATABASE_URL?: string },
  redis: undefined as unknown,
  db: undefined as unknown,
}));
vi.mock("@/lib/env", () => ({ env: () => state.env }));
vi.mock("@/lib/redis", () => ({ redis: () => state.redis, keys: {} }));
vi.mock("@/lib/db", () => ({ db: () => state.db }));

const { GET } = await import("./route");

let db: Db;
beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => db.raw.close());
beforeEach(async () => {
  state.env = { CRON_SECRET: SECRET, DATABASE_URL: "postgresql://x" };
  state.redis = new FakeRedis();
  state.db = db;
  await db.query("truncate stats_daily, stats_projects, stats_cv");
});

const call = (authorization?: string) =>
  GET(new Request("https://sheetfolio.example/api/cron/stats", { headers: authorization ? { authorization } : {} }));

describe("GET /api/cron/stats", () => {
  it("refuses a caller without the secret, or with the wrong one", async () => {
    expect((await call()).status).toBe(401);
    expect((await call("Bearer nope")).status).toBe(401);
    expect((await call(`Bearer ${SECRET}x`)).status).toBe(401);
    expect((await call(SECRET)).status).toBe(401); // the scheme is part of the secret
  });

  it("is switched off until both the secret and the database are configured", async () => {
    state.env = { DATABASE_URL: "postgresql://x" };
    expect((await call(`Bearer ${SECRET}`)).status).toBe(503);
    state.env = { CRON_SECRET: SECRET };
    expect((await call(`Bearer ${SECRET}`)).status).toBe(503);
  });

  it("copies the live totals to Postgres for the right caller, and says how many", async () => {
    const fake = state.redis as FakeRedis;
    await fake.set("views:ada:2026-10-25", 7);
    await fake.set("cv:ada:downloads", 3);
    const res = await call(`Bearer ${SECRET}`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, copied: { daily: 1, projects: 0, cv: 1 } });
    expect(res.headers.get("cache-control")).toBe("no-store");
    expect(await db.query("select views from stats_daily")).toEqual([{ views: 7 }]);
  });
});
