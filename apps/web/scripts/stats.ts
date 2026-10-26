/**
 * The view and download totals: copy them to Postgres, or put them back into Redis after a loss.
 *
 *   pnpm db:stats flush               # copy the live totals from Redis into Postgres (the daily job does this too)
 *   pnpm db:stats restore             # dry run: how much Redis is missing compared with Postgres
 *   pnpm db:stats restore --apply     # fill in what Redis is missing (never lowers a live count)
 *
 * Reads UPSTASH_REDIS_REST_URL / _TOKEN and DATABASE_URL from the environment or .env.local. `restore --apply` is the only
 * thing here that writes to Redis.
 */
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { Redis } from "@upstash/redis";
import { neonDb } from "../lib/db/neon";
import { flushStats, pgStatsArchive, restoreStats } from "../lib/store/stats";

function fail(message: string): never {
  console.error(`stats: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: { apply: { type: "boolean", default: false } },
  });
  const command = positionals[0];
  if (command !== "flush" && command !== "restore") fail("usage: pnpm db:stats flush | restore [--apply]");
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url || !token) fail("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set");
  if (!databaseUrl) fail("DATABASE_URL must be set");

  const redis = new Redis({ url, token });
  const db = neonDb(databaseUrl);
  const archive = pgStatsArchive(() => db);
  console.log(`stats: Redis ${new URL(url).host}  <->  Postgres ${new URL(databaseUrl).host}`);

  if (command === "flush") {
    console.log("stats: copied to Postgres", await flushStats(redis, archive));
    return;
  }
  const counts = await restoreStats(redis, archive, { apply: values.apply });
  console.log(
    values.apply ? "stats: restored into Redis" : "stats: would restore into Redis (dry run, nothing written)",
    counts,
  );
  if (!values.apply) console.log("stats: run again with --apply to restore.");
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
