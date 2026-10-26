import "server-only";
import { env } from "../env";
import { neonDb } from "./neon";
import type { Db } from "./types";

let client: Db | undefined;

/** The app's Postgres (Neon). Only called when a store is set to use it, so Redis-only runs need no DATABASE_URL. */
export function db(): Db {
  if (!client) {
    const { DATABASE_URL } = env();
    if (!DATABASE_URL) throw new Error("DATABASE_URL is not set, but a store is configured to use Postgres");
    client = neonDb(DATABASE_URL);
  }
  return client;
}
