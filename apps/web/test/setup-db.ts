import { afterAll, beforeEach, vi } from "vitest";
import type { Db } from "@/lib/db/types";
import { testDb } from "./pg";

/*
 * Gives every test file the app's database (`db()` from @/lib/db) as an in-process Postgres with the real migrations
 * applied. It starts the first time something queries it, so files that never touch the database pay nothing, and it is
 * emptied before each test so tests cannot see each other's rows.
 */

let started: ReturnType<typeof testDb> | undefined;
const instance = () => (started ??= testDb());

const lazy: Db = {
  query: async (text, params) => (await instance()).query(text, params),
  batch: async (statements) => (await instance()).batch(statements),
};

vi.mock("@/lib/db", () => ({ db: () => lazy }));

beforeEach(async () => {
  if (!started) return;
  const pg = await started;
  const tables = await pg.query<{ tablename: string }>(
    "select tablename from pg_tables where schemaname = 'public' and tablename <> 'schema_migrations'",
  );
  if (tables.length > 0) {
    await pg.query(`truncate ${tables.map((t) => `"${t.tablename}"`).join(", ")} restart identity cascade`);
  }
});

afterAll(async () => {
  if (started) await (await started).raw.close();
});
