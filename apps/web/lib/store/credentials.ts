import { z } from "zod";
import { Username } from "../../content/schemas";
import { isUniqueViolation, iso, type Db } from "../db/types";
import { StoredDataError } from "./errors";
import { read, write, type StoreMode } from "./mode";

/*
 * Sign-in details: the password hash, an optional username, and the "sign everyone out" counter. Short-lived reset
 * tokens are not here: they expire on their own and stay in Redis (see credential-store.ts).
 */

/** The slice of Redis this module needs; the app and the scripts each bind their own client. */
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

// ── Redis ───────────────────────────────────────────────────────────────────

export function redisCredStore(kv: () => KV): CredStore {
  const get = async (email: string): Promise<CredentialRecord | null> => {
    const key = credentialKeys.credentials(email);
    const raw = await kv().get<unknown>(key);
    if (raw === null) return null;
    const parsed = CredentialRecord.safeParse(raw);
    if (!parsed.success) throw new StoredDataError(`Stored ${key} is invalid`, parsed.error.issues);
    return parsed.data;
  };
  return {
    get,
    async save(email, record) {
      const existing = await get(email);
      if (record.username && record.username !== existing?.username) {
        const claimed = await kv().set(credentialKeys.username(record.username), email.toLowerCase(), { nx: true });
        // Re-claiming a name this account already owns (e.g. an interrupted earlier run) is fine.
        if (
          claimed !== "OK" &&
          (await kv().get<string>(credentialKeys.username(record.username))) !== email.toLowerCase()
        ) {
          return { ok: false, reason: "USERNAME_TAKEN" };
        }
      }
      await kv().set(credentialKeys.credentials(email), record);
      if (existing?.username && existing.username !== record.username) {
        await kv().del(credentialKeys.username(existing.username));
      }
      return { ok: true };
    },
    emailFor: (username) => kv().get<string>(credentialKeys.username(username.toLowerCase())),
    async epoch(email) {
      const raw = await kv().get<number>(credentialKeys.sessionEpoch(email));
      return typeof raw === "number" ? raw : 0;
    },
    bumpEpoch: (email) => kv().incr(credentialKeys.sessionEpoch(email)),
  };
}

// ── Postgres ────────────────────────────────────────────────────────────────

type CredRow = { password_hash: string; username: string | null; updated_at: unknown };

export type PgCredStore = CredStore & {
  /** For the backfill: sets the epoch to exactly this number. */
  setEpoch(email: string, epoch: number): Promise<void>;
};

export function pgCredStore(db: () => Db): PgCredStore {
  return {
    async get(email) {
      const rows = await db().query<CredRow>(
        "select password_hash, username, updated_at from credentials where email = $1",
        [email.toLowerCase()],
      );
      const row = rows[0];
      if (!row) return null;
      return {
        hash: row.password_hash,
        ...(row.username && { username: row.username }),
        updatedAt: iso(row.updated_at),
      };
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
    async setEpoch(email, epoch) {
      await db().query(
        `insert into session_epochs (email, epoch) values ($1, $2)
         on conflict (email) do update set epoch = excluded.epoch`,
        [email.toLowerCase(), epoch],
      );
    },
  };
}

// ── Both, according to the mode ─────────────────────────────────────────────

export function credStore(mode: StoreMode, redis: CredStore, pg: CredStore): CredStore {
  return {
    get: (email) => read(mode, { redis: () => redis.get(email), pg: () => pg.get(email) }),
    save: (email, record) =>
      write(
        mode,
        "save sign-in details",
        { redis: () => redis.save(email, record), pg: () => pg.save(email, record) },
        (r) => r.ok,
      ),
    emailFor: (username) => read(mode, { redis: () => redis.emailFor(username), pg: () => pg.emailFor(username) }),
    epoch: (email) => read(mode, { redis: () => redis.epoch(email), pg: () => pg.epoch(email) }),
    bumpEpoch: (email) =>
      write(mode, "sign out everywhere", { redis: () => redis.bumpEpoch(email), pg: () => pg.bumpEpoch(email) }),
  };
}
