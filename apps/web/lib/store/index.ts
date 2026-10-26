import "server-only";
import { db } from "../db";
import { env } from "../env";
import { redis } from "../redis";
import type { CredStore, KV } from "./credentials";
import type { LeadStore } from "./leads";
import type { SiteStore } from "./sites";
import type { UserStore } from "./users";
import { kvFor, wireStores } from "./wire";

/*
 * The stores the app uses, each wired to the Redis and Postgres sides according to its mode setting
 * (ACCOUNTS_STORE, LEADS_STORE, SITES_STORE: see lib/store/mode.ts). Postgres is only touched when a mode asks for it.
 */

const stores = () => {
  const e = env();
  return wireStores({ redis, db, modes: { accounts: e.ACCOUNTS_STORE, leads: e.LEADS_STORE, sites: e.SITES_STORE } });
};

export const credentialKv = (): KV => kvFor(redis)();
export const users = (): UserStore => stores().users;
export const credentialStore = (): CredStore => stores().credentials;
export const leads = (): LeadStore => stores().leads;
export const sites = (): SiteStore => stores().sites;
