/*
 * The one shape of "a Postgres connection" the app uses. Production binds it to Neon (lib/db/neon.ts); tests bind it to
 * an in-process Postgres (test/pg.ts). Every query is parameterised: values go in `params`, never into the SQL text.
 */

export type Row = Record<string, unknown>;
export type Statement = { text: string; params?: readonly unknown[] };

export interface Db {
  query<T extends Row = Row>(text: string, params?: readonly unknown[]): Promise<T[]>;
  /** Runs the statements as one transaction: all of them happen, or none do. */
  batch(statements: readonly Statement[]): Promise<void>;
}

/** True for Postgres "unique violation" (23505), optionally for one named constraint. */
export function isUniqueViolation(err: unknown, constraint?: string): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as { code?: unknown; constraint?: unknown };
  return e.code === "23505" && (constraint === undefined || e.constraint === constraint);
}

/** A timestamp column as an ISO string, whatever the driver returned (Date, or text from some drivers). */
export function iso(value: unknown): string {
  return new Date(value as string | number | Date).toISOString();
}
