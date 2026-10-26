import type { Db } from "./types";

/*
 * Forward-only migrations. A migration is a .sql file in db/migrations, named NNNN_what_it_does.sql; applied files are
 * recorded in `schema_migrations` and never run again. Never edit a file once it has been applied anywhere: add a new one.
 */

export type Migration = { name: string; sql: string };

/**
 * Splits a migration into statements: a statement ends at a semicolon at the end of a line. Lines starting with `--`
 * are comments. So migrations stay plain DDL: no semicolons inside strings, no function bodies.
 */
export function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let current: string[] = [];
  for (const line of sql.split("\n")) {
    if (line.trim().startsWith("--")) continue;
    current.push(line);
    if (line.trimEnd().endsWith(";")) {
      statements.push(current.join("\n").trim().replace(/;$/, ""));
      current = [];
    }
  }
  const rest = current.join("\n").trim();
  if (rest) throw new Error(`Migration ends without a closing semicolon: ${rest.slice(0, 60)}`);
  return statements.filter(Boolean);
}

/** Applies every migration not yet recorded, in name order, each in its own transaction. Returns the names it applied. */
export async function migrate(db: Db, migrations: readonly Migration[]): Promise<string[]> {
  await db.query(
    "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
  );
  const done = new Set((await db.query<{ name: string }>("select name from schema_migrations")).map((r) => r.name));
  const applied: string[] = [];
  for (const m of [...migrations].sort((a, b) => a.name.localeCompare(b.name))) {
    if (done.has(m.name)) continue;
    await db.batch([
      ...splitStatements(m.sql).map((text) => ({ text })),
      { text: "insert into schema_migrations (name) values ($1)", params: [m.name] },
    ]);
    applied.push(m.name);
  }
  return applied;
}
