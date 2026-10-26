import type { Redis } from "@upstash/redis";
import { UserRecord } from "../../content/schemas";
import { isUniqueViolation, iso, type Db } from "../db/types";
import { keys } from "../redis-keys";
import { read, write, type StoreMode } from "./mode";

/** An account: who owns which page address, and in what role. The email is the account's identity. */

export type NewUser = { email: string; record: UserRecord };
export type CreateUserResult = "ok" | "EMAIL_TAKEN" | "SLUG_TAKEN";

export interface UserStore {
  get(email: string): Promise<UserRecord | null>;
  /** Creates the account. The email and the page address each belong to the first account that takes them. */
  create(user: NewUser): Promise<CreateUserResult>;
  /** Undoes a `create` (used when the rest of setting up an account fails). */
  remove(email: string, slug: string): Promise<void>;
}

// ── Redis ───────────────────────────────────────────────────────────────────

export function redisUserStore(redis: () => Redis): UserStore {
  return {
    async get(email) {
      const key = keys.user(email);
      const raw = await redis().get<unknown>(key);
      if (raw === null) return null;
      const parsed = UserRecord.safeParse(raw);
      if (!parsed.success) throw new Error(`Stored ${key} is invalid`);
      return parsed.data;
    },
    async create({ email, record }) {
      // Each step that can lose a race is NX-guarded; the second releases the first if it loses.
      if ((await redis().set(keys.slug(record.slug), record.id, { nx: true })) !== "OK") return "SLUG_TAKEN";
      if ((await redis().set(keys.user(email), record, { nx: true })) !== "OK") {
        await redis().del(keys.slug(record.slug));
        return "EMAIL_TAKEN";
      }
      return "ok";
    },
    async remove(email, slug) {
      await redis().del(keys.user(email), keys.slug(slug));
    },
  };
}

// ── Postgres ────────────────────────────────────────────────────────────────

type UserRow = { id: string; slug: string; role: string; name: string; created_at: unknown };

export type PgUserStore = UserStore & {
  /** For the backfill: inserts the account, or brings an existing one up to date. */
  upsert(user: NewUser): Promise<void>;
};

export function pgUserStore(db: () => Db): PgUserStore {
  const insert = (u: NewUser, tail = "") =>
    db().query(`insert into users (id, email, slug, role, name, created_at) values ($1, $2, $3, $4, $5, $6) ${tail}`, [
      u.record.id,
      u.email.toLowerCase(),
      u.record.slug,
      u.record.role,
      u.record.name,
      u.record.createdAt,
    ]);
  return {
    async get(email) {
      const rows = await db().query<UserRow>("select id, slug, role, name, created_at from users where email = $1", [
        email.toLowerCase(),
      ]);
      const row = rows[0];
      if (!row) return null;
      return UserRecord.parse({
        id: row.id,
        slug: row.slug,
        role: row.role,
        name: row.name,
        createdAt: iso(row.created_at),
      });
    },
    async create(user) {
      try {
        await insert(user);
        return "ok";
      } catch (err) {
        if (isUniqueViolation(err, "users_slug_key")) return "SLUG_TAKEN";
        if (isUniqueViolation(err, "users_email_key")) return "EMAIL_TAKEN";
        throw err;
      }
    },
    async remove(email) {
      await db().query("delete from users where email = $1", [email.toLowerCase()]);
    },
    async upsert(user) {
      await insert(
        user,
        "on conflict (email) do update set id = excluded.id, slug = excluded.slug, role = excluded.role, name = excluded.name, created_at = excluded.created_at",
      );
    },
  };
}

// ── Both, according to the mode ─────────────────────────────────────────────

export function userStore(mode: StoreMode, redis: UserStore, pg: UserStore): UserStore {
  return {
    get: (email) => read(mode, { redis: () => redis.get(email), pg: () => pg.get(email) }),
    create: (user) =>
      write(mode, "create account", { redis: () => redis.create(user), pg: () => pg.create(user) }, (r) => r === "ok"),
    remove: async (email, slug) => {
      await write(mode, "remove account", {
        redis: () => redis.remove(email, slug),
        pg: () => pg.remove(email, slug),
      });
    },
  };
}
