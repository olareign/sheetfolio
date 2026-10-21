import { z } from "zod";
import { NewPassword, Username } from "../content/schemas";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "./password";

/** The slice of Redis this module needs; the app and the seed script each bind their own client. */
export type KV = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { nx: true }): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
};

/** Defined here, not in redis.ts, so the seed script (which cannot import server-only code) shares them. */
export const credentialKeys = {
  /** Password hash + username for an account, keyed by its sign-in email. */
  credentials: (email: string) => `cred:${email.toLowerCase()}`,
  /** Username → email, so someone can sign in with either. Claimed with NX. */
  username: (username: string) => `username:${username.toLowerCase()}`,
} as const;

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
  return { ok: true };
}

/** The email behind a username or an email address, or null when nothing matches. */
async function resolveEmail(kv: KV, identifier: string): Promise<string | null> {
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
