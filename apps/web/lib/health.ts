import type { Db } from "./db/types";

export type Health = { ok: boolean; postgres: "up" | "down" };

const CACHE_MS = 30_000;
let cached: { at: number; up: boolean } | undefined;

/**
 * Whether the database answers. It is pinged at most every 30 seconds however often this is called, so a public health
 * address cannot be used to keep the database awake (and billing).
 */
export async function checkHealth(db: () => Db, now: number = Date.now()): Promise<Health> {
  if (!cached || now - cached.at >= CACHE_MS) {
    try {
      await db().query("select 1");
      cached = { at: now, up: true };
    } catch {
      cached = { at: now, up: false };
    }
  }
  return { ok: cached.up, postgres: cached.up ? "up" : "down" };
}

/** For tests. */
export function resetHealthCache(): void {
  cached = undefined;
}
