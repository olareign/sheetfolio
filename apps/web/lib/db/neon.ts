import { neon } from "@neondatabase/serverless";
import type { Db, Row, Statement } from "./types";

/** Neon over HTTP: one request per query, which suits serverless functions (no connection to keep open). */
export function neonDb(url: string): Db {
  const sql = neon(url);
  return {
    async query<T extends Row = Row>(text: string, params: readonly unknown[] = []) {
      return (await sql.query(text, [...params])) as T[];
    },
    async batch(statements: readonly Statement[]) {
      if (statements.length === 0) return;
      await sql.transaction(statements.map((s) => sql.query(s.text, [...(s.params ?? [])])));
    },
  };
}
