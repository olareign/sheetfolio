import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { NewPassword, Username } from "../content/schemas";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "./password";
import { credentialKeys, type CredentialRecord, type CredStore, type KV } from "./store/credentials";

/*
 * Sign-in rules: passwords, usernames, sessions and reset links. Where the details are kept is the `CredStore`'s
 * business (Redis or Postgres, see lib/store); reset tokens expire on their own, so they always live in Redis (`KV`).
 */

export { credentialKeys, type CredentialRecord, type CredStore, type KV } from "./store/credentials";

export const RESET_TOKEN_MINUTES = 60;

export function getCredentials(creds: CredStore, email: string): Promise<CredentialRecord | null> {
  return creds.get(email);
}

export type SetPasswordResult = { ok: true; username?: string } | { ok: false; reason: "USERNAME_TAKEN" };

/**
 * Sets (or replaces) the password for `email`. A username is claimed first-come; an account keeps its
 * current username when none is passed. Used by the dashboard (signed-in user, own email)
 * and by the seed script (an operator provisioning an account).
 */
export async function setPassword(
  creds: CredStore,
  args: {
    email: string;
    password: string;
    username?: string;
    now?: Date;
  },
): Promise<SetPasswordResult> {
  const email = args.email.trim().toLowerCase();
  const password = NewPassword.parse(args.password);
  const existing = await creds.get(email);
  const username = args.username === undefined ? existing?.username : Username.parse(args.username);

  const record: CredentialRecord = {
    hash: await hashPassword(password),
    ...(username && { username }),
    updatedAt: (args.now ?? new Date()).toISOString(),
  };
  const saved = await creds.save(email, record);
  return saved.ok ? { ok: true, username } : saved;
}

export type ChangePasswordResult = { ok: true } | { ok: false; reason: "NO_PASSWORD" | "WRONG_PASSWORD" };

export async function changePassword(
  creds: CredStore,
  email: string,
  currentPassword: string,
  newPassword: string,
  now?: Date,
): Promise<ChangePasswordResult> {
  const existing = await creds.get(email);
  if (!existing) return { ok: false, reason: "NO_PASSWORD" };
  if (!(await verifyPassword(currentPassword, existing.hash))) return { ok: false, reason: "WRONG_PASSWORD" };
  await setPassword(creds, { email, password: newPassword, now });
  await creds.bumpEpoch(email);
  return { ok: true };
}

/** The email behind a username or an email address, or null when nothing matches. */
export async function resolveEmail(creds: CredStore, identifier: string): Promise<string | null> {
  const id = identifier.trim().toLowerCase();
  if (id.includes("@")) return id;
  if (!Username.safeParse(id).success) return null;
  return creds.emailFor(id);
}

/**
 * Verifies a username-or-email and password. Returns the account's email on success and null for
 * every failure (unknown account, no password set, wrong password), with the same work done in each
 * case so timing does not reveal which accounts exist.
 */
export async function authenticate(
  creds: CredStore,
  identifier: string,
  password: string,
): Promise<{ email: string } | null> {
  const email = await resolveEmail(creds, identifier);
  const record = email ? await creds.get(email) : null;
  if (!email || !record) {
    await verifyAgainstDummy(password);
    return null;
  }
  return (await verifyPassword(password, record.hash)) ? { email } : null;
}

// ── Sessions ────────────────────────────────────────────────────────────────

/** 0 until the first password change or reset. Sessions without a stamp count as 0, so none are cut off by shipping this. */
export function getSessionEpoch(creds: CredStore, email: string): Promise<number> {
  return creds.epoch(email);
}

export async function isSessionCurrent(creds: CredStore, email: string, stamped: number | undefined): Promise<boolean> {
  return (stamped ?? 0) === (await creds.epoch(email));
}

// ── Password reset ──────────────────────────────────────────────────────────

const TOKEN_SHAPE = /^[A-Za-z0-9_-]{20,100}$/;
const ResetRecord = z.object({ email: z.email(), createdAt: z.iso.datetime() });

const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

/**
 * Issues a single-use reset token valid for an hour. Only its hash is stored, and a newer token
 * replaces the previous one, so an old email can never reset the password after a fresh request.
 */
export async function createResetToken(kv: KV, email: string, now: Date = new Date()): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const token = randomBytes(32).toString("base64url");
  const hash = sha256(token);
  const ttl = { ex: RESET_TOKEN_MINUTES * 60 };

  const previous = await kv.get<string>(credentialKeys.resetLatest(normalized));
  if (previous) await kv.del(credentialKeys.resetToken(previous));
  await kv.set(credentialKeys.resetToken(hash), { email: normalized, createdAt: now.toISOString() }, ttl);
  await kv.set(credentialKeys.resetLatest(normalized), hash, ttl);
  return token;
}

/** The email a token belongs to, without using it up (for showing the reset page), or null. */
export async function peekResetToken(kv: KV, token: string): Promise<string | null> {
  if (!TOKEN_SHAPE.test(token)) return null;
  const parsed = ResetRecord.safeParse(await kv.get<unknown>(credentialKeys.resetToken(sha256(token))));
  return parsed.success ? parsed.data.email : null;
}

export type ResetResult = { ok: true; email: string } | { ok: false; reason: "INVALID_TOKEN" };

/**
 * Spends the token, sets the new password (keeping the username) and signs the account out
 * everywhere. The password is validated before the token is spent, so a too-short password
 * does not burn the link.
 */
export async function resetPassword(
  kv: KV,
  creds: CredStore,
  token: string,
  newPassword: string,
  now?: Date,
): Promise<ResetResult> {
  const password = NewPassword.parse(newPassword);
  if (!TOKEN_SHAPE.test(token)) return { ok: false, reason: "INVALID_TOKEN" };

  const parsed = ResetRecord.safeParse(await kv.getdel<unknown>(credentialKeys.resetToken(sha256(token))));
  if (!parsed.success) return { ok: false, reason: "INVALID_TOKEN" };

  const { email } = parsed.data;
  await kv.del(credentialKeys.resetLatest(email));
  await setPassword(creds, { email, password, now });
  await creds.bumpEpoch(email);
  return { ok: true, email };
}
