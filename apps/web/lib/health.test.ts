import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Db } from "./db/types";
import { checkHealth, resetHealthCache } from "./health";

const fakeDb =
  (query: Db["query"]): (() => Db) =>
  () => ({ query, batch: async () => {} });

beforeEach(resetHealthCache);

describe("checkHealth", () => {
  it("never touches the database while everything is on Redis", async () => {
    const query = vi.fn();
    const h = await checkHealth({ accounts: "redis", leads: "redis", sites: "redis" }, fakeDb(query));
    expect(h).toEqual({ ok: true, stores: { accounts: "redis", leads: "redis", sites: "redis" }, postgres: "unused" });
    expect(query).not.toHaveBeenCalled();
  });

  it("pings the database when only the pages are off Redis", async () => {
    const query = vi.fn(async () => []);
    const h = await checkHealth({ accounts: "redis", leads: "redis", sites: "dual" }, fakeDb(query));
    expect(h.postgres).toBe("up");
    expect(query).toHaveBeenCalledOnce();
  });

  it("reports the database as up when it answers, and says which mode each store is in", async () => {
    const h = await checkHealth(
      { accounts: "dual", leads: "redis", sites: "redis" },
      fakeDb(async () => []),
    );
    expect(h).toEqual({ ok: true, stores: { accounts: "dual", leads: "redis", sites: "redis" }, postgres: "up" });
  });

  it("reports down, not an error, when the database does not answer", async () => {
    const h = await checkHealth(
      { accounts: "dual", leads: "dual", sites: "dual" },
      fakeDb(async () => Promise.reject(new Error("refused"))),
    );
    expect(h).toMatchObject({ ok: false, postgres: "down" });
    expect(JSON.stringify(h)).not.toContain("refused");
  });

  it("asks the database at most once every 30 seconds", async () => {
    const query = vi.fn(async () => []);
    const modes = { accounts: "dual", leads: "dual", sites: "dual" } as const;
    await checkHealth(modes, fakeDb(query), 1_000);
    await checkHealth(modes, fakeDb(query), 20_000);
    expect(query).toHaveBeenCalledTimes(1);
    await checkHealth(modes, fakeDb(query), 31_001);
    expect(query).toHaveBeenCalledTimes(2);
  });
});
