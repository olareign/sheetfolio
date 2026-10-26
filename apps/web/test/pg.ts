import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { PGlite } from "@electric-sql/pglite";
import type { Db, Row, Statement } from "@/lib/db/types";
import { migrate, type Migration } from "@/lib/db/migrate";

/** Reads db/migrations from disk, the same files the real database gets. */
export function readMigrations(dir = path.join(process.cwd(), "db", "migrations")): Migration[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((name) => ({ name, sql: readFileSync(path.join(dir, name), "utf8") }));
}

/** A real Postgres running inside the test process (PGlite), with every migration applied. */
export async function testDb(): Promise<Db & { raw: PGlite }> {
  const raw = new PGlite();
  const db: Db & { raw: PGlite } = {
    raw,
    async query<T extends Row = Row>(text: string, params: readonly unknown[] = []) {
      return (await raw.query<T>(text, [...params])).rows;
    },
    async batch(statements: readonly Statement[]) {
      await raw.transaction(async (tx) => {
        for (const s of statements) await tx.query(s.text, [...(s.params ?? [])]);
      });
    },
  };
  await migrate(db, readMigrations());
  return db;
}
