import "server-only";
import { redis } from "./redis";
import * as store from "./credential-store";

export { RESET_TOKEN_MINUTES } from "./credential-store";
export type { ChangePasswordResult, CredentialRecord, ResetResult, SetPasswordResult } from "./credential-store";

/** The app's Redis client, narrowed to what the credential store needs. */
export function credentialKv(): store.KV {
  const client = redis();
  return {
    get: (key) => client.get(key),
    set: (key, value, opts) => client.set(key, value, opts),
    del: (...keys) => client.del(...keys),
    incr: (key) => client.incr(key),
    getdel: (key) => client.getdel(key),
  };
}

export const getCredentials = (email: string) => store.getCredentials(credentialKv(), email);
export const setPassword = (args: Parameters<typeof store.setPassword>[1]) => store.setPassword(credentialKv(), args);
export const changePassword = (email: string, current: string, next: string, now?: Date) =>
  store.changePassword(credentialKv(), email, current, next, now);
export const authenticate = (identifier: string, password: string) =>
  store.authenticate(credentialKv(), identifier, password);
export const resolveEmail = (identifier: string) => store.resolveEmail(credentialKv(), identifier);
export const getSessionEpoch = (email: string) => store.getSessionEpoch(credentialKv(), email);
export const isSessionCurrent = (email: string, stamped: number | undefined) =>
  store.isSessionCurrent(credentialKv(), email, stamped);
export const createResetToken = (email: string) => store.createResetToken(credentialKv(), email);
export const peekResetToken = (token: string) => store.peekResetToken(credentialKv(), token);
export const resetPassword = (token: string, newPassword: string) =>
  store.resetPassword(credentialKv(), token, newPassword);
