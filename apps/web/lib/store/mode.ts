/*
 * Where a kind of data lives while it moves from Redis to Postgres. One setting per kind (accounts, enquiries, ...), so
 * each can be moved, and moved back, on its own:
 *
 *   redis     Redis only. The default, and what runs until a move is started.
 *   dual      Redis is the truth; every write is copied to Postgres. Used to fill Postgres and watch it for problems.
 *   pg-first  Postgres is the truth; every write is also copied to Redis, so going back loses nothing.
 *   postgres  Postgres only. The finished state.
 */

export const STORE_MODES = ["redis", "dual", "pg-first", "postgres"] as const;
export type StoreMode = (typeof STORE_MODES)[number];
export type Side = "redis" | "pg";

/** The side reads come from, and which a write must succeed on. */
export function primaryOf(mode: StoreMode): Side {
  return mode === "redis" || mode === "dual" ? "redis" : "pg";
}

/** The side a write is copied to afterwards, if any. A failure there is logged, not raised. */
export function mirrorOf(mode: StoreMode): Side | null {
  if (mode === "dual") return "pg";
  if (mode === "pg-first") return "redis";
  return null;
}

type Both<T> = { redis: () => Promise<T>; pg: () => Promise<T> };

export function read<T>(mode: StoreMode, impl: Both<T>): Promise<T> {
  return impl[primaryOf(mode)]();
}

/**
 * Runs a write on the primary side and returns its result, then repeats it on the mirror side. The mirror never makes
 * the request fail: the person's action has succeeded, and a gap in the copy is what the backfill is for. The log names
 * the operation, never the data.
 *
 * `mirrorIf` decides, from the primary's result, whether the copy should happen at all (not when the write was refused).
 */
export async function write<T>(
  mode: StoreMode,
  label: string,
  impl: Both<T>,
  mirrorIf: (result: T) => boolean = () => true,
): Promise<T> {
  const result = await impl[primaryOf(mode)]();
  const mirror = mirrorOf(mode);
  if (mirror && mirrorIf(result)) {
    try {
      await impl[mirror]();
    } catch (err) {
      console.error(`[store] ${label}: copy to ${mirror} failed:`, err instanceof Error ? err.message : err);
    }
  }
  return result;
}
