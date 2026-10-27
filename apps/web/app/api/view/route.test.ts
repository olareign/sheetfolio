import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = vi.hoisted(() => ({ view: [] as unknown[][], cv: [] as string[] }));
vi.mock("@/lib/site", () => ({
  recordView: async (...args: unknown[]) => void calls.view.push(args),
  recordCvDownload: async (slug: string) => void calls.cv.push(slug),
}));

const { POST } = await import("./route");

const post = (body: string) => POST(new Request("https://dosinex.example/api/view", { method: "POST", body }));

beforeEach(() => {
  calls.view = [];
  calls.cv = [];
});

describe("POST /api/view", () => {
  it("counts a page view by default", async () => {
    const res = await post(JSON.stringify({ slug: "idris-rasaq" }));
    expect(res.status).toBe(204);
    expect(calls.view).toEqual([["idris-rasaq", undefined]]);
    expect(calls.cv).toEqual([]);
  });

  it("counts a project view", async () => {
    await post(JSON.stringify({ slug: "idris-rasaq", projectId: "p-1" }));
    expect(calls.view).toEqual([["idris-rasaq", "p-1"]]);
  });

  it("counts a CV download, not a page view, when kind is cv", async () => {
    const res = await post(JSON.stringify({ slug: "idris-rasaq", kind: "cv" }));
    expect(res.status).toBe(204);
    expect(calls.cv).toEqual(["idris-rasaq"]);
    expect(calls.view).toEqual([]);
  });

  it("rejects malformed bodies and unknown kinds without counting", async () => {
    expect((await post("not json")).status).toBe(400);
    expect((await post(JSON.stringify({ slug: "x", kind: "lead" }))).status).toBe(400);
    expect((await post(JSON.stringify({ kind: "cv" }))).status).toBe(400);
    expect(calls.view).toEqual([]);
    expect(calls.cv).toEqual([]);
  });
});
