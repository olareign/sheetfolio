import "server-only";
import { db } from "../db";
import { redis } from "../redis";
import { keys } from "../redis-keys";
import { credStore, type CredStore, type KV } from "./credentials";
import { kvFor } from "./kv";
import { leadStore, type LeadStore } from "./leads";
import { siteStore, type SiteStore } from "./sites";
import { userStore, type UserStore } from "./users";

/*
 * The stores the app uses. Accounts, sign-in details, enquiries and pages live in Postgres; Redis holds only what is
 * short-lived or rebuildable (reset tokens, view counters, the page index).
 */

export const credentialKv = (): KV => kvFor(redis)();
export const users = (): UserStore => userStore(db);
export const credentialStore = (): CredStore => credStore(db);
export const leads = (): LeadStore => leadStore(db);
export const sites = (): SiteStore =>
  siteStore(db, async (slug) => {
    await redis().sadd(keys.sites(), slug);
  });
