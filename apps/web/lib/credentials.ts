import "server-only";
import { redis } from "./redis";
import * as store from "./credential-store";

export type { ChangePasswordResult, CredentialRecord, SetPasswordResult } from "./credential-store";

/** The app's Redis client, narrowed to what the credential store needs. */
function kv(): store.KV {
  const client = redis();
  return {
    get: (key) => client.get(key),
    set: (key, value, opts) => client.set(key, value, opts),
    del: (...keys) => client.del(...keys),
  };
}

export const getCredentials = (email: string) => store.getCredentials(kv(), email);
export const setPassword = (args: Parameters<typeof store.setPassword>[1]) => store.setPassword(kv(), args);
export const changePassword = (email: string, current: string, next: string, now?: Date) =>
  store.changePassword(kv(), email, current, next, now);
export const authenticate = (identifier: string, password: string) => store.authenticate(kv(), identifier, password);
