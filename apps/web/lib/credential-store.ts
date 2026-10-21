import { createHash, randomBytes } from "node:crypto";
import { z } from "zod";
import { NewPassword, Username } from "../content/schemas";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "./password";

/** The slice of Redis this module needs; the app and the seed script each bind their own client. */
export type KV = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { nx: true } | { ex: number }): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  /** Read and delete in one step, so a one-time token cannot be used twice. */
  getdel<T>(key: string): Promise<T | null>;
};

/** Defined here, not in redis.ts, so the seed script (which cannot import server-only code) shares them. */
export const credentialKeys = {
  /** Password hash + username for an account, keyed by its sign-in email. */
  credentials: (email: string) => `cred:${email.toLowerCase()}`,
  /** Username → email, so someone can sign in with either. Claimed with NX. */
  username: (username: string) => `username:${username.toLowerCase()}`,
  /** Counter stamped into every session. Bumping it signs the account out everywhere. */
  sessionEpoch: (email: string) => `session-epoch:${email.toLowerCase()}`,
  /** Password-reset token, keyed by its SHA-256 so a leaked database holds no usable link. */
  resetToken: (hash: string) => `reset:${hash}`,
  /** The one live reset token for an email; a newer request replaces it. */
  resetLatest: (email: string) => `reset-latest:${email.toLowerCase()}`,
} as const;

export const RESET_TOKEN_MINUTES = 60;

const CredentialRecord = z.object({
  hash: z.string().min(1),
  username: Username.optional(),
  updatedAt: z.iso.datetime(),
});
export type CredentialRecord = z.infer<typeof CredentialRecord>;

export async function getCredentials(kv: KV, email: string): Promise<CredentialRecord | null> {
  const raw = await kv.get<unknown>(credentialKeys.credentials(email));
  if (raw === null) return null;
  const parsed = CredentialRecord.safeParse(raw);
  if (!parsed.success) throw new Error(`Stored ${credentialKeys.credentials(email)} is invalid`);
  return parsed.data;
}

export type SetPasswordResult = { ok: true; username?: string } | { ok: false; reason: "USERNAME_TAKEN" };

/**
 * Sets (or replaces) the password for `email`. A username is claimed first-come with NX; an account
 * keeps its current username when none is passed. Used by the dashboard (signed-in user, own email)
 * and by the seed script (an operator provisioning an account).
 */
export async function setPassword(
  kv: KV,
  args: {
    email: string;
    password: string;
    username?: string;
    now?: Date;
  },
): Promise<SetPasswordResult> {
  const email = args.email.trim().toLowerCase();
  const password = NewPassword.parse(args.password);
  const existing = await getCredentials(kv, email);
  const username = args.username === undefined ? existing?.username : Username.parse(args.username);

  if (username && username !== existing?.username) {
    const claimed = await kv.set(credentialKeys.username(username), email, { nx: true });
    // Re-claiming a name this account already owns (e.g. an interrupted earlier run) is fine.
    if (claimed !== "OK" && (await kv.get<string>(credentialKeys.username(username))) !== email) {
      return { ok: false, reason: "USERNAME_TAKEN" };
    }
  }

  const record: CredentialRecord = {
    hash: await hashPassword(password),
    ...(username && { username }),
    updatedAt: (args.now ?? new Date()).toISOString(),
  };
  await kv.set(credentialKeys.credentials(email), record);

  if (existing?.username && existing.username !== username) await kv.del(credentialKeys.username(existing.username));
  return { ok: true, username };
}

export type ChangePasswordResult = { ok: true } | { ok: false; reason: "NO_PASSWORD" | "WRONG_PASSWORD" };

export async function changePassword(
  kv: KV,
  email: string,
  currentPassword: string,
  newPassword: string,
  now?: Date,
): Promise<ChangePasswordResult> {
  const existing = await getCredentials(kv, email);
  if (!existing) return { ok: false, reason: "NO_PASSWORD" };
  if (!(await verifyPassword(currentPassword, existing.hash))) return { ok: false, reason: "WRONG_PASSWORD" };
  await setPassword(kv, { email, password: newPassword, now });
  await bumpSessionEpoch(kv, email);
  return { ok: true };
}

/** The email behind a username or an email address, or null when nothing matches. */
export async function resolveEmail(kv: KV, identifier: string): Promise<string | null> {
  const id = identifier.trim().toLowerCase();
  if (id.includes("@")) return id;
  if (!Username.safeParse(id).success) return null;
  return kv.get<string>(credentialKeys.username(id));
}

/**
 * Verifies a username-or-email and password. Returns the account's email on success and null for
 * every failure (unknown account, no password set, wrong password), with the same work done in each
 * case so timing does not reveal which accounts exist.
 */
export async function authenticate(kv: KV, identifier: string, password: string): Promise<{ email: string } | null> {
  const email = await resolveEmail(kv, identifier);
  const record = email ? await getCredentials(kv, email) : null;
  if (!email || !record) {
    await verifyAgainstDummy(password);
    return null;
  }
  return (await verifyPassword(password, record.hash)) ? { email } : null;
}

// ── Sessions ────────────────────────────────────────────────────────────────

/** 0 until the first password change or reset. Sessions without a stamp count as 0, so none are cut off by shipping this. */
export async function getSessionEpoch(kv: KV, email: string): Promise<number> {
  const raw = await kv.get<number>(credentialKeys.sessionEpoch(email));
  return typeof raw === "number" ? raw : 0;
}

/** Invalidates every session issued before now for this account. */
export async function bumpSessionEpoch(kv: KV, email: string): Promise<number> {
  return kv.incr(credentialKeys.sessionEpoch(email));
}

export async function isSessionCurrent(kv: KV, email: string, stamped: number | undefined): Promise<boolean> {
  return (stamped ?? 0) === (await getSessionEpoch(kv, email));
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
export async function resetPassword(kv: KV, token: string, newPassword: string, now?: Date): Promise<ResetResult> {
  const password = NewPassword.parse(newPassword);
  if (!TOKEN_SHAPE.test(token)) return { ok: false, reason: "INVALID_TOKEN" };

  const parsed = ResetRecord.safeParse(await kv.getdel<unknown>(credentialKeys.resetToken(sha256(token))));
  if (!parsed.success) return { ok: false, reason: "INVALID_TOKEN" };

  const { email } = parsed.data;
  await kv.del(credentialKeys.resetLatest(email));
  await setPassword(kv, { email, password, now });
  await bumpSessionEpoch(kv, email);
  return { ok: true, email };
}
