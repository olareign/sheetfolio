import { z } from "zod";
import { Username } from "../../content/schemas";
import { isUniqueViolation, iso, type Db } from "../db/types";

/*
 * Sign-in details: the password hash, an optional username, and the "sign everyone out" counter, all in Postgres.
 * Password-reset tokens are not here: they expire on their own, so they live in Redis (see credential-store.ts).
 */

/** The slice of Redis this module's callers need for reset tokens; the app and the scripts each bind their own client. */
export type KV = {
  get<T>(key: string): Promise<T | null>;
  set(key: string, value: unknown, opts?: { nx: true } | { ex: number }): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
  incr(key: string): Promise<number>;
  /** Read and delete in one step, so a one-time token cannot be used twice. */
  getdel<T>(key: string): Promise<T | null>;
};

/** Redis keys for password-reset tokens. */
export const credentialKeys = {
  /** Password-reset token, keyed by its SHA-256 so a leaked database holds no usable link. */
  resetToken: (hash: string) => `reset:${hash}`,
  /** The one live reset token for an email; a newer request replaces it. */
  resetLatest: (email: string) => `reset-latest:${email.toLowerCase()}`,
} as const;

export const CredentialRecord = z.object({
  hash: z.string().min(1),
  username: Username.optional(),
  updatedAt: z.iso.datetime(),
});
export type CredentialRecord = z.infer<typeof CredentialRecord>;

export type SaveResult = { ok: true } | { ok: false; reason: "USERNAME_TAKEN" };

export interface CredStore {
  get(email: string): Promise<CredentialRecord | null>;
  /**
   * Stores the record as the account's sign-in details. A username belongs to the first account that takes it: another
   * account asking for it gets USERNAME_TAKEN and nothing is written. An account may keep, change or drop its own.
   */
  save(email: string, record: CredentialRecord): Promise<SaveResult>;
  /** The email behind a username, or null. */
  emailFor(username: string): Promise<string | null>;
  epoch(email: string): Promise<number>;
  bumpEpoch(email: string): Promise<number>;
}

type CredRow = { password_hash: string; username: string | null; updated_at: unknown };

export function credStore(db: () => Db): CredStore {
  return {
    async get(email) {
      const rows = await db().query<CredRow>(
        "select password_hash, username, updated_at from credentials where email = $1",
        [email.toLowerCase()],
      );
      const row = rows[0];
      if (!row) return null;
      return { hash: row.password_hash, ...(row.username && { username: row.username }), updatedAt: iso(row.updated_at) };
    },
    async save(email, record) {
      try {
        await db().query(
          `insert into credentials (email, username, password_hash, updated_at) values ($1, $2, $3, $4)
           on conflict (email) do update
             set username = excluded.username, password_hash = excluded.password_hash, updated_at = excluded.updated_at`,
          [email.toLowerCase(), record.username ?? null, record.hash, record.updatedAt],
        );
        return { ok: true };
      } catch (err) {
        if (isUniqueViolation(err, "credentials_username_key")) return { ok: false, reason: "USERNAME_TAKEN" };
        throw err;
      }
    },
    async emailFor(username) {
      const rows = await db().query<{ email: string }>("select email from credentials where username = $1", [
        username.toLowerCase(),
      ]);
      return rows[0]?.email ?? null;
    },
    async epoch(email) {
      const rows = await db().query<{ epoch: number }>("select epoch from session_epochs where email = $1", [
        email.toLowerCase(),
      ]);
      return Number(rows[0]?.epoch ?? 0);
    },
    async bumpEpoch(email) {
      const rows = await db().query<{ epoch: number }>(
        `insert into session_epochs (email, epoch) values ($1, 1)
         on conflict (email) do update set epoch = session_epochs.epoch + 1 returning epoch`,
        [email.toLowerCase()],
      );
      return Number(rows[0]?.epoch);
    },
  };
}
