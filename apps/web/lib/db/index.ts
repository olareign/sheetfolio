import "server-only";
import { env } from "../env";
import { neonDb } from "./neon";
import type { Db } from "./types";

let client: Db | undefined;

/** The app's Postgres (Neon). */
export function db(): Db {
  if (!client) {
    const { DATABASE_URL } = env();
    client = neonDb(DATABASE_URL);
  }
  return client;
}
