import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { TailorOverlay } from "@/content/tailor";
import { testDb } from "@/test/pg";
import { tailoredStore, type NewTailored, type TailoredStore } from "./tailored";

/* The tailored-CV bank against a real Postgres (PGlite) with the real migrations applied. */

type Db = Awaited<ReturnType<typeof testDb>>;
let db: Db;
let store: TailoredStore;

beforeAll(async () => {
  db = await testDb();
  store = tailoredStore(() => db);
});
afterAll(async () => {
  await db.raw.close();
});
beforeEach(async () => {
  await db.query("truncate tailored_cvs, tailored_undo");
});

const overlay = (headline = "Frontend Engineer"): TailorOverlay => ({
  headline,
  summary: "Builds interfaces.",
  competencies: ["React"],
  experiences: [{ id: "e1", notes: "Built it." }],
  projects: ["p1"],
  certifications: [],
});
const rec = (id: string, over: Partial<NewTailored> = {}): NewTailored => ({
  id,
  name: `Version ${id}`,
  jobTitle: "Frontend Developer",
  jobCompany: "Globex",
  jobSource: "",
  overlay: overlay(),
  ...over,
});
const NOW = new Date("2026-10-10T09:00:00.000Z");

describe("tailored versions", () => {
  it("saves into the first free slot and lists them in slot order", async () => {
    const a = await store.add("ada", rec("a"), NOW);
    const b = await store.add("ada", rec("b"), NOW);
    expect(a).toMatchObject({ id: "a", slot: 1 });
    expect(b).toMatchObject({ id: "b", slot: 2 });
    expect((await store.list("ada")).map((r) => r.id)).toEqual(["a", "b"]);
  });

  it("keeps at most three per person", async () => {
    for (const id of ["a", "b", "c"]) await store.add("ada", rec(id), NOW);
    expect(await store.add("ada", rec("d"), NOW)).toBe("full");
    expect(await store.list("ada")).toHaveLength(3);
  });

  it("gives a freed slot to the next save", async () => {
    for (const id of ["a", "b", "c"]) await store.add("ada", rec(id), NOW);
    await store.remove("ada", "b");
    expect(await store.add("ada", rec("d"), NOW)).toMatchObject({ id: "d", slot: 2 });
  });

  it("does not let two saves at once take the last slot", async () => {
    await store.add("ada", rec("a"), NOW);
    await store.add("ada", rec("b"), NOW);
    const results = await Promise.all([store.add("ada", rec("c"), NOW), store.add("ada", rec("d"), NOW)]);
    expect(results.filter((r) => r === "full")).toHaveLength(1);
    expect(await store.list("ada")).toHaveLength(3);
  });

  it("counts each person's versions separately", async () => {
    for (const id of ["a", "b", "c"]) await store.add("ada", rec(id), NOW);
    expect(await store.add("bayo", rec("x"), NOW)).toMatchObject({ slot: 1 });
  });

  it("reads one version only from its own page", async () => {
    await store.add("ada", rec("a"), NOW);
    expect((await store.get("ada", "a"))?.name).toBe("Version a");
    expect(await store.get("bayo", "a")).toBeNull();
  });

  it("updates the name and wording, and stamps the time", async () => {
    await store.add("ada", rec("a"), NOW);
    const later = new Date("2026-10-11T09:00:00.000Z");
    expect(await store.update("ada", "a", { name: "Backend", overlay: overlay("Backend Engineer") }, later)).toBe(true);
    const saved = await store.get("ada", "a");
    expect(saved).toMatchObject({ name: "Backend", createdAt: NOW.toISOString(), updatedAt: later.toISOString() });
    expect(saved?.overlay.headline).toBe("Backend Engineer");
  });

  it("will not update or delete another person's version", async () => {
    await store.add("ada", rec("a"), NOW);
    expect(await store.update("bayo", "a", { name: "x", overlay: overlay() }, NOW)).toBe(false);
    expect(await store.remove("bayo", "a")).toBe(false);
    expect(await store.get("ada", "a")).not.toBeNull();
  });

  it("leaves out a row whose overlay no longer reads, without breaking the list", async () => {
    await store.add("ada", rec("a"), NOW);
    await db.query(`update tailored_cvs set overlay = '{"headline": 5}'::jsonb where id = 'a'`);
    await store.add("ada", rec("b"), NOW);
    expect((await store.list("ada")).map((r) => r.id)).toEqual(["b"]);
  });
});

describe("undo snapshot", () => {
  it("keeps one per page and replaces it", async () => {
    expect(await store.getUndo("ada")).toBeNull();
    await store.setUndo("ada", { label: "Frontend", snapshot: overlay("One"), takenAt: NOW.toISOString() });
    await store.setUndo("ada", { label: "Backend", snapshot: overlay("Two"), takenAt: NOW.toISOString() });
    const undo = await store.getUndo("ada");
    expect(undo?.label).toBe("Backend");
    expect(undo?.snapshot.headline).toBe("Two");
    expect(await store.getUndo("bayo")).toBeNull();
  });

  it("clears", async () => {
    await store.setUndo("ada", { label: "x", snapshot: overlay(), takenAt: NOW.toISOString() });
    await store.clearUndo("ada");
    expect(await store.getUndo("ada")).toBeNull();
  });
});
