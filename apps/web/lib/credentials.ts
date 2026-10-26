import "server-only";
import { credentialKv, credentialStore } from "./store";
import * as store from "./credential-store";

export { RESET_TOKEN_MINUTES } from "./credential-store";
export type { ChangePasswordResult, CredentialRecord, ResetResult, SetPasswordResult } from "./credential-store";
export { credentialKv };

export const getCredentials = (email: string) => store.getCredentials(credentialStore(), email);
export const setPassword = (args: Parameters<typeof store.setPassword>[1]) =>
  store.setPassword(credentialStore(), args);
export const changePassword = (email: string, current: string, next: string, now?: Date) =>
  store.changePassword(credentialStore(), email, current, next, now);
export const authenticate = (identifier: string, password: string) =>
  store.authenticate(credentialStore(), identifier, password);
export const resolveEmail = (identifier: string) => store.resolveEmail(credentialStore(), identifier);
export const getSessionEpoch = (email: string) => store.getSessionEpoch(credentialStore(), email);
export const isSessionCurrent = (email: string, stamped: number | undefined) =>
  store.isSessionCurrent(credentialStore(), email, stamped);
export const createResetToken = (email: string) => store.createResetToken(credentialKv(), email);
export const peekResetToken = (token: string) => store.peekResetToken(credentialKv(), token);
export const resetPassword = (token: string, newPassword: string) =>
  store.resetPassword(credentialKv(), credentialStore(), token, newPassword);
