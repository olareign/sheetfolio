import "server-only";
import { db } from "../db";
import { env } from "../env";
import { redis } from "../redis";
import { credStore, pgCredStore, redisCredStore, type CredStore, type KV } from "./credentials";
import { leadStore, pgLeadStore, redisLeadStore, type LeadStore } from "./leads";
import { pgUserStore, redisUserStore, userStore, type UserStore } from "./users";

/*
 * The stores the app uses, each wired to the Redis and Postgres sides according to its mode setting
 * (ACCOUNTS_STORE, LEADS_STORE: see lib/store/mode.ts). Postgres is only touched when a mode asks for it.
 */

/** Redis, narrowed to what the credential store and reset tokens need. */
export function credentialKv(): KV {
  const client = redis();
  return {
    get: (key) => client.get(key),
    set: (key, value, opts) => client.set(key, value, opts),
    del: (...keys) => client.del(...keys),
    incr: (key) => client.incr(key),
    getdel: (key) => client.getdel(key),
  };
}

export const accountsMode = () => env().ACCOUNTS_STORE;
export const leadsMode = () => env().LEADS_STORE;

export function users(): UserStore {
  return userStore(accountsMode(), redisUserStore(redis), pgUserStore(db));
}

export function credentialStore(): CredStore {
  return credStore(accountsMode(), redisCredStore(credentialKv), pgCredStore(db));
}

export function leads(): LeadStore {
  return leadStore(leadsMode(), redisLeadStore(redis), pgLeadStore(db));
}
