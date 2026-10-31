import { UserRecord } from "../../content/schemas";
import { isUniqueViolation, iso, type Db } from "../db/types";

/** An account: who owns which page address, and in what role. The email is the account's identity. */

export type NewUser = { email: string; record: UserRecord };
export type CreateUserResult = "ok" | "EMAIL_TAKEN" | "SLUG_TAKEN";

export interface UserStore {
  get(email: string): Promise<UserRecord | null>;
  /** The account that owns a page address, with its email. */
  getBySlug(slug: string): Promise<NewUser | null>;
  /** Moves an account to a plan. False when there is no such account. */
  setPlan(email: string, plan: UserRecord["plan"]): Promise<boolean>;
  /** Creates the account. The email and the page address each belong to the first account that takes them. */
  create(user: NewUser): Promise<CreateUserResult>;
  /** Undoes a `create` (used when the rest of setting up an account fails). */
  remove(email: string, slug: string): Promise<void>;
  /** Every account, newest first (the admin overview). */
  list(): Promise<NewUser[]>;
}

type UserRow = {
  id: string;
  email: string;
  slug: string;
  role: string;
  plan: string;
  name: string;
  created_at: unknown;
};

const toRecord = (row: UserRow): UserRecord =>
  UserRecord.parse({
    id: row.id,
    slug: row.slug,
    role: row.role,
    plan: row.plan,
    name: row.name,
    createdAt: iso(row.created_at),
  });

export function userStore(db: () => Db): UserStore {
  return {
    async get(email) {
      const rows = await db().query<UserRow>(
        "select id, email, slug, role, plan, name, created_at from users where email = $1",
        [email.toLowerCase()],
      );
      return rows[0] ? toRecord(rows[0]) : null;
    },
    async getBySlug(slug) {
      const rows = await db().query<UserRow>(
        "select id, email, slug, role, plan, name, created_at from users where slug = $1",
        [slug],
      );
      return rows[0] ? { email: rows[0].email, record: toRecord(rows[0]) } : null;
    },
    async setPlan(email, plan) {
      const rows = await db().query("update users set plan = $2 where email = $1 returning email", [
        email.toLowerCase(),
        plan,
      ]);
      return rows.length > 0;
    },
    async create({ email, record }) {
      try {
        await db().query(
          "insert into users (id, email, slug, role, plan, name, created_at) values ($1, $2, $3, $4, $5, $6, $7)",
          [record.id, email.toLowerCase(), record.slug, record.role, record.plan, record.name, record.createdAt],
        );
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
    async list() {
      const rows = await db().query<UserRow>(
        "select id, email, slug, role, plan, name, created_at from users order by created_at desc, email",
      );
      return rows.map((row) => ({ email: row.email, record: toRecord(row) }));
    },
  };
}
