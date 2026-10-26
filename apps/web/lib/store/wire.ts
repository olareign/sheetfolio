import type { Redis } from "@upstash/redis";
import type { Db } from "../db/types";
import { keys } from "../redis-keys";
import { credStore, pgCredStore, redisCredStore, type CredStore, type KV } from "./credentials";
import { leadStore, pgLeadStore, redisLeadStore, type LeadStore } from "./leads";
import type { StoreMode } from "./mode";
import { pgSiteStore, redisSiteStore, siteStore, type SiteStore } from "./sites";
import { pgUserStore, redisUserStore, userStore, type UserStore } from "./users";

/*
 * Builds the stores from a Redis client, a database and the three mode settings. No server-only imports, so the app
 * (lib/store/index.ts) and the operator scripts (seed, backfill) wire themselves the same way.
 */

export type Modes = { accounts: StoreMode; leads: StoreMode; sites: StoreMode };
export type Wiring = { redis: () => Redis; db: () => Db; modes: Modes };

/** Redis, narrowed to what the credential store and reset tokens need. */
export function kvFor(redis: () => Redis): () => KV {
  return () => {
    const client = redis();
    return {
      get: (key) => client.get(key),
      set: (key, value, opts) => client.set(key, value, opts),
      del: (...ks) => client.del(...ks),
      incr: (key) => client.incr(key),
      getdel: (key) => client.getdel(key),
    };
  };
}

export type Stores = { users: UserStore; credentials: CredStore; leads: LeadStore; sites: SiteStore };

export function wireStores({ redis, db, modes }: Wiring): Stores {
  return {
    users: userStore(modes.accounts, redisUserStore(redis), pgUserStore(db)),
    credentials: credStore(modes.accounts, redisCredStore(kvFor(redis)), pgCredStore(db)),
    leads: leadStore(modes.leads, redisLeadStore(redis), pgLeadStore(db)),
    sites: siteStore(modes.sites, redisSiteStore(redis), pgSiteStore(db), async (slug) => {
      await redis().sadd(keys.sites(), slug);
    }),
  };
}

const MODE_NAMES = ["redis", "dual", "pg-first", "postgres"] as const;

/** Modes from plain environment variables (for scripts): unset means redis, anything unknown is an error. */
export function modesFromEnv(source: Record<string, string | undefined>): Modes {
  const pick = (name: string): StoreMode => {
    const v = source[name]?.trim();
    if (!v) return "redis";
    if ((MODE_NAMES as readonly string[]).includes(v)) return v as StoreMode;
    throw new Error(`${name} must be one of ${MODE_NAMES.join(", ")} (got "${v}")`);
  };
  return { accounts: pick("ACCOUNTS_STORE"), leads: pick("LEADS_STORE"), sites: pick("SITES_STORE") };
}
