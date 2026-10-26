/**
 * Applies database migrations (db/migrations/*.sql) to the Postgres in DATABASE_URL. Safe to run again: applied
 * migrations are recorded and skipped.
 *
 *   pnpm db:migrate
 *
 * Reads DATABASE_URL from the environment or .env.local. Prints which database it is talking to (host only).
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { neonDb } from "../lib/db/neon";
import { migrate } from "../lib/db/migrate";

function fail(message: string): never {
  console.error(`migrate: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url) fail("DATABASE_URL is not set");
  const dir = path.join(process.cwd(), "db", "migrations");
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(path.join(dir, name), "utf8") }));

  console.log(`migrate: database ${new URL(url).host}`);
  const applied = await migrate(neonDb(url), files);
  console.log(applied.length ? `migrate: applied ${applied.join(", ")}` : "migrate: already up to date");
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
