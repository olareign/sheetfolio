import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "./db/types";
import { checkHealth, resetHealthCache } from "./health";

const fakeDb =
  (query: Db["query"]): (() => Db) =>
  () => ({ query, batch: async () => {} });

beforeEach(resetHealthCache);

describe("checkHealth", () => {
  it("reports up when the database answers", async () => {
    const query = vi.fn(async () => []);
    expect(await checkHealth(fakeDb(query))).toEqual({ ok: true, postgres: "up" });
    expect(query).toHaveBeenCalledOnce();
  });

  it("reports down, not an error, when the database does not answer", async () => {
    const h = await checkHealth(fakeDb(async () => Promise.reject(new Error("refused"))));
    expect(h).toEqual({ ok: false, postgres: "down" });
    expect(JSON.stringify(h)).not.toContain("refused");
  });

  it("asks the database at most once every 30 seconds", async () => {
    const query = vi.fn(async () => []);
    await checkHealth(fakeDb(query), 1_000);
    await checkHealth(fakeDb(query), 20_000);
    expect(query).toHaveBeenCalledTimes(1);
    await checkHealth(fakeDb(query), 31_001);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
