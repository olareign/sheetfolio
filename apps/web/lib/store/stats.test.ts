import type { Redis } from "@upstash/redis";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { FakeRedis } from "@/test/fake-redis";
import { testDb } from "@/test/pg";
import { DAILY_TTL_SECONDS, flushStats, pgStatsArchive, readLiveStats, restoreStats } from "./stats";

type Db = Awaited<ReturnType<typeof testDb>>;
let db: Db;
let fake: FakeRedis;
const redis = () => fake as unknown as Redis;
const archive = () => pgStatsArchive(() => db);

beforeAll(async () => {
  db = await testDb();
});
afterAll(async () => db.raw.close());
beforeEach(async () => {
  fake = new FakeRedis();
  await db.query("truncate stats_daily, stats_projects, stats_cv");
});

const NOW = new Date("2026-10-26T12:00:00.000Z");

describe("readLiveStats", () => {
  it("reads daily, project and CV counters, including project ids that contain colons", async () => {
    await fake.set("views:ada:2026-10-25", 7);
    await fake.set("views:ada:p:p-1", 12);
    await fake.set("views:ada:p:odd:id", 3);
    await fake.set("cv:ada:downloads", 5);
    expect(await readLiveStats(redis())).toEqual({
      daily: [{ slug: "ada", day: "2026-10-25", views: 7 }],
      projects: [
        { slug: "ada", projectId: "p-1", views: 12 },
        { slug: "ada", projectId: "odd:id", views: 3 },
      ],
      cv: [{ slug: "ada", downloads: 5 }],
    });
  });

  it("ignores keys of other shapes and counters that are zero or not numbers", async () => {
    await fake.set("views:ada:notadate", 9);
    await fake.set("cv:ada:other", 9);
    await fake.set("user:ada@example.com", "x");
    await fake.set("views:ada:2026-10-25", 0);
    await fake.set("views:ada:2026-10-24", "garbage");
    await fake.set("cv:ada:downloads", -4);
    expect(await readLiveStats(redis())).toEqual({ daily: [], projects: [], cv: [] });
  });
});

describe("flushStats", () => {
  it("copies every live counter to Postgres and says how many it saw", async () => {
    await fake.set("views:ada:2026-10-25", 7);
    await fake.set("views:ada:2026-10-26", 2);
    await fake.set("views:bob:p:p-1", 12);
    await fake.set("cv:bob:downloads", 5);
    expect(await flushStats(redis(), archive())).toEqual({ daily: 2, projects: 1, cv: 1 });
    expect(await archive().load()).toEqual({
      daily: [
        { slug: "ada", day: "2026-10-25", views: 7 },
        { slug: "ada", day: "2026-10-26", views: 2 },
      ],
      projects: [{ slug: "bob", projectId: "p-1", views: 12 }],
      cv: [{ slug: "bob", downloads: 5 }],
    });
  });

  it("can be repeated without changing anything, and raises a total as the live count grows", async () => {
    await fake.set("views:ada:2026-10-26", 2);
    await flushStats(redis(), archive());
    await flushStats(redis(), archive());
    expect((await archive().load()).daily).toEqual([{ slug: "ada", day: "2026-10-26", views: 2 }]);
    await fake.set("views:ada:2026-10-26", 9);
    await flushStats(redis(), archive());
    expect((await archive().load()).daily[0]?.views).toBe(9);
  });

  it("never lowers a stored total, whatever Redis now holds", async () => {
    await fake.set("views:ada:2026-10-26", 50);
    await fake.set("cv:ada:downloads", 8);
    await flushStats(redis(), archive());
    await fake.set("views:ada:2026-10-26", 3);
    await fake.set("cv:ada:downloads", 1);
    await flushStats(redis(), archive());
    const saved = await archive().load();
    expect([saved.daily[0]?.views, saved.cv[0]?.downloads]).toEqual([50, 8]);
  });

  it("keeps a day after Redis has let it expire", async () => {
    await fake.set("views:ada:2026-01-05", 40);
    await flushStats(redis(), archive());
    fake = new FakeRedis(); // Redis forgot it
    await flushStats(redis(), archive());
    expect((await archive().load()).daily).toEqual([{ slug: "ada", day: "2026-01-05", views: 40 }]);
  });

  it("handles more rows than one batch", async () => {
    for (let i = 0; i < 1200; i++) await fake.set(`views:ada:p:p-${i}`, i + 1);
    expect((await flushStats(redis(), archive())).projects).toBe(1200);
    expect((await archive().load()).projects).toHaveLength(1200);
  });

  it("copes with an empty Redis", async () => {
    expect(await flushStats(redis(), archive())).toEqual({ daily: 0, projects: 0, cv: 0 });
  });
});

describe("restoreStats", () => {
  const seedArchive = () =>
    archive().save({
      daily: [
        { slug: "ada", day: "2026-10-20", views: 30 },
        { slug: "ada", day: "2026-01-02", views: 99 }, // older than Redis keeps counters
      ],
      projects: [{ slug: "ada", projectId: "p-1", views: 40 }],
      cv: [{ slug: "ada", downloads: 6 }],
    });

  it("puts back what Redis has lost, with the expiry Redis would have given it", async () => {
    await seedArchive();
    expect(await restoreStats(redis(), archive(), { apply: true, now: NOW })).toEqual({ daily: 1, projects: 1, cv: 1 });
    expect(await fake.get("views:ada:2026-10-20")).toBe(30);
    expect(await fake.get("views:ada:p:p-1")).toBe(40);
    expect(await fake.get("cv:ada:downloads")).toBe(6);
    expect(await fake.get("views:ada:2026-01-02")).toBeNull();
    const expected = Math.floor((Date.parse("2026-10-20T00:00:00Z") + DAILY_TTL_SECONDS * 1000 - NOW.getTime()) / 1000);
    expect(fake.ttls.get("views:ada:2026-10-20")).toBe(expected);
  });

  it("never lowers a live count, only fills in what is lower or missing", async () => {
    await seedArchive();
    await fake.set("views:ada:2026-10-20", 500);
    await fake.set("views:ada:p:p-1", 10);
    await restoreStats(redis(), archive(), { apply: true, now: NOW });
    expect(await fake.get("views:ada:2026-10-20")).toBe(500);
    expect(await fake.get("views:ada:p:p-1")).toBe(40);
  });

  it("only counts, and changes nothing, on a dry run; and is a no-op the second time", async () => {
    await seedArchive();
    expect(await restoreStats(redis(), archive(), { apply: false, now: NOW })).toEqual({
      daily: 1,
      projects: 1,
      cv: 1,
    });
    expect(fake.strings.size).toBe(0);
    await restoreStats(redis(), archive(), { apply: true, now: NOW });
    expect(await restoreStats(redis(), archive(), { apply: true, now: NOW })).toEqual({ daily: 0, projects: 0, cv: 0 });
  });
});
