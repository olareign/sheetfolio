import { createHash } from "node:crypto";
import type { Redis } from "@upstash/redis";
import type { Lead } from "../../content/schemas";
import type { Db } from "../db/types";
import { redisCredStore, type CredentialRecord, type KV, type PgCredStore } from "./credentials";
import { MAX_LEADS, redisLeadStore, type PgLeadStore } from "./leads";
import { redisUserStore, type PgUserStore } from "./users";

/*
 * Copies accounts, sign-in details and enquiries from Redis into Postgres, and checks the copy. Safe to run again and
 * again: every write is an upsert, and Redis is never changed. Run it while the store is in `dual` mode (Redis is the
 * truth), once to fill Postgres and once more just before switching reads over.
 */

export type Targets = { users: PgUserStore; creds: PgCredStore; leads: PgLeadStore };
export type Counts = { users: number; credentials: number; epochs: number; leads: number };

async function scanKeys(redis: Redis, match: string): Promise<string[]> {
  const found: string[] = [];
  let cursor = "0";
  do {
    const [next, batch] = await redis.scan(cursor, { match, count: 200 });
    cursor = String(next);
    found.push(...batch);
  } while (cursor !== "0");
  return found;
}

const emailOf = (key: string, prefix: string) => key.slice(prefix.length);
/** A short stable label for an account that shows in reports without printing the email address. */
const tag = (email: string) => createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 8);

type Source = {
  users: { email: string; record: Awaited<ReturnType<ReturnType<typeof redisUserStore>["get"]>> & object }[];
  credentials: { email: string; record: CredentialRecord }[];
  epochs: { email: string; epoch: number }[];
  leads: { slug: string; lead: Lead }[];
};

/** Reads everything the Postgres side is meant to hold, from Redis. */
export async function readSource(redis: Redis): Promise<Source> {
  const kv = redis as unknown as KV;
  const userStore = redisUserStore(() => redis);
  const credStore = redisCredStore(() => kv);
  const leadStore = redisLeadStore(() => redis);

  const users: Source["users"] = [];
  for (const key of await scanKeys(redis, "user:*")) {
    const email = emailOf(key, "user:");
    const record = await userStore.get(email);
    if (record) users.push({ email, record });
  }

  const credentials: Source["credentials"] = [];
  for (const key of await scanKeys(redis, "cred:*")) {
    const email = emailOf(key, "cred:");
    const record = await credStore.get(email);
    if (record) credentials.push({ email, record });
  }

  const epochs: Source["epochs"] = [];
  for (const key of await scanKeys(redis, "session-epoch:*")) {
    const email = emailOf(key, "session-epoch:");
    epochs.push({ email, epoch: await credStore.epoch(email) });
  }

  // Enquiries are keyed by page address: every registered page, and every account's page.
  const slugs = new Set<string>([...(await redis.smembers("sites")), ...users.map((u) => u.record.slug)]);
  const leads: Source["leads"] = [];
  for (const slug of [...slugs].sort()) {
    for (const lead of await leadStore.list(slug, 0, MAX_LEADS)) leads.push({ slug, lead });
  }
  return { users, credentials, epochs, leads };
}

export async function backfill(redis: Redis, to: Targets, opts: { apply: boolean }): Promise<Counts> {
  const src = await readSource(redis);
  if (opts.apply) {
    for (const u of src.users) await to.users.upsert(u);
    for (const c of src.credentials) await to.creds.save(c.email, c.record);
    for (const e of src.epochs) await to.creds.setEpoch(e.email, e.epoch);
    for (const l of src.leads) await to.leads.upsert(l.slug, l.lead);
  }
  return {
    users: src.users.length,
    credentials: src.credentials.length,
    epochs: src.epochs.length,
    leads: src.leads.length,
  };
}

export type Difference = {
  kind: "missing" | "different";
  what: "account" | "sign-in" | "epoch" | "enquiry";
  label: string;
};
export type Verdict = { ok: boolean; checked: Counts; differences: Difference[]; extraInPostgres: Counts };

/** Compares Redis with Postgres. `differences` is what is wrong; `extraInPostgres` is rows Redis does not have (normal after a switch). */
export async function verify(redis: Redis, to: Targets, db: Db): Promise<Verdict> {
  const src = await readSource(redis);
  const differences: Difference[] = [];

  for (const { email, record } of src.users) {
    const got = await to.users.get(email);
    if (!got) differences.push({ kind: "missing", what: "account", label: record.slug });
    else if (JSON.stringify(got) !== JSON.stringify(record))
      differences.push({ kind: "different", what: "account", label: record.slug });
  }
  for (const { email, record } of src.credentials) {
    const got = await to.creds.get(email);
    const same =
      got && got.hash === record.hash && got.username === record.username && got.updatedAt === record.updatedAt;
    if (!got) differences.push({ kind: "missing", what: "sign-in", label: tag(email) });
    else if (!same) differences.push({ kind: "different", what: "sign-in", label: tag(email) });
  }
  for (const { email, epoch } of src.epochs) {
    if ((await to.creds.epoch(email)) !== epoch)
      differences.push({ kind: "different", what: "epoch", label: tag(email) });
  }
  const bySlug = new Map<string, Lead[]>();
  for (const { slug, lead } of src.leads) bySlug.set(slug, [...(bySlug.get(slug) ?? []), lead]);
  for (const [slug, expected] of bySlug) {
    const got = new Map((await to.leads.list(slug, 0, MAX_LEADS)).map((l) => [l.id, l]));
    for (const lead of expected) {
      const have = got.get(lead.id);
      if (!have) differences.push({ kind: "missing", what: "enquiry", label: `${slug}#${lead.id}` });
      else if (JSON.stringify(have) !== JSON.stringify(lead))
        differences.push({ kind: "different", what: "enquiry", label: `${slug}#${lead.id}` });
    }
  }

  const counts = async (table: string) =>
    Number((await db.query<{ n: number }>(`select count(*)::int as n from ${table}`))[0]?.n ?? 0);
  const [users, credentials, epochs, leads] = await Promise.all([
    counts("users"),
    counts("credentials"),
    counts("session_epochs"),
    counts("leads"),
  ]);
  const checked = {
    users: src.users.length,
    credentials: src.credentials.length,
    epochs: src.epochs.length,
    leads: src.leads.length,
  };
  return {
    ok: differences.length === 0,
    checked,
    differences,
    extraInPostgres: {
      users: Math.max(0, users - checked.users),
      credentials: Math.max(0, credentials - checked.credentials),
      epochs: Math.max(0, epochs - checked.epochs),
      leads: Math.max(0, leads - checked.leads),
    },
  };
}
