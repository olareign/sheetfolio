import type { Db } from "./db/types";
import type { StoreMode } from "./store/mode";

export type Health = {
  ok: boolean;
  stores: { accounts: StoreMode; leads: StoreMode };
  /** "unused" while every store is on Redis, so a Redis-only setup never wakes the database. */
  postgres: "unused" | "up" | "down";
};

const CACHE_MS = 30_000;
let cached: { at: number; up: boolean } | undefined;

/**
 * Whether the app can reach what it is configured to use. The database is pinged at most every 30 seconds however
 * often this is called, so a public health address cannot be used to keep the database awake (and billing).
 */
export async function checkHealth(
  modes: { accounts: StoreMode; leads: StoreMode },
  db: () => Db,
  now: number = Date.now(),
): Promise<Health> {
  if (modes.accounts === "redis" && modes.leads === "redis") {
    return { ok: true, stores: modes, postgres: "unused" };
  }
  if (!cached || now - cached.at >= CACHE_MS) {
    try {
      await db().query("select 1");
      cached = { at: now, up: true };
    } catch {
      cached = { at: now, up: false };
    }
  }
  return { ok: cached.up, stores: modes, postgres: cached.up ? "up" : "down" };
}

/** For tests. */
export function resetHealthCache(): void {
  cached = undefined;
}
