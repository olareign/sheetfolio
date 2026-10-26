/**
 * Copies accounts, sign-in details and enquiries from Redis into Postgres, and checks the copy. Redis is only read.
 *
 *   pnpm db:backfill              # dry run: says what it would copy
 *   pnpm db:backfill --apply      # copies (safe to repeat: every write is an upsert)
 *   pnpm db:backfill --verify     # compares the two; exits 1 if anything differs
 *
 * Reads UPSTASH_REDIS_REST_URL / _TOKEN and DATABASE_URL from the environment or .env.local. Reports counts and
 * non-identifying labels only: never an email address, password hash or message.
 */
import { existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { Redis } from "@upstash/redis";
import { neonDb } from "../lib/db/neon";
import { backfill, verify, type Targets } from "../lib/store/backfill";
import { pgCredStore } from "../lib/store/credentials";
import { pgLeadStore } from "../lib/store/leads";
import { pgSiteStore } from "../lib/store/sites";
import { pgUserStore } from "../lib/store/users";

function fail(message: string): never {
  console.error(`backfill: ${message}`);
  process.exit(1);
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: { apply: { type: "boolean", default: false }, verify: { type: "boolean", default: false } },
  });
  if (values.apply && values.verify) fail("choose --apply or --verify, not both");
  if (existsSync(".env.local")) process.loadEnvFile(".env.local");
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  const databaseUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!url || !token) fail("UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set");
  if (!databaseUrl) fail("DATABASE_URL must be set");

  const redis = new Redis({ url, token });
  const db = neonDb(databaseUrl);
  const targets: Targets = {
    users: pgUserStore(() => db),
    creds: pgCredStore(() => db),
    leads: pgLeadStore(() => db),
    sites: pgSiteStore(() => db),
  };
  console.log(`backfill: Redis ${new URL(url).host}  ->  Postgres ${new URL(databaseUrl).host}`);

  if (values.verify) {
    const verdict = await verify(redis, targets, db);
    console.log("backfill: checked", verdict.checked);
    if (Object.values(verdict.extraInPostgres).some((n) => n > 0)) {
      console.log("backfill: rows only in Postgres (normal once writes go there)", verdict.extraInPostgres);
    }
    for (const d of verdict.differences) console.log(`backfill: ${d.kind}: ${d.what} ${d.label}`);
    console.log(
      verdict.ok ? "backfill: Postgres matches Redis." : `backfill: ${verdict.differences.length} difference(s).`,
    );
    process.exit(verdict.ok ? 0 : 1);
  }

  const counts = await backfill(redis, targets, { apply: values.apply });
  console.log(values.apply ? "backfill: copied" : "backfill: would copy (dry run, nothing written)", counts);
  if (!values.apply) console.log("backfill: run again with --apply to copy.");
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
