import { describe, expect, it } from "vitest";
import { readMigrations, testDb } from "@/test/pg";
import { migrate, splitStatements } from "./migrate";

describe("splitStatements", () => {
  it("splits on a semicolon at the end of a line and drops comments", () => {
    expect(splitStatements("-- hello\ncreate table a (\n  x int\n);\n\n-- more\ncreate index i on a (x);\n")).toEqual([
      "create table a (\n  x int\n)",
      "create index i on a (x)",
    ]);
  });

  it("refuses a migration whose last statement has no semicolon", () => {
    expect(() => splitStatements("create table a (x int)")).toThrow(/semicolon/);
  });
});

describe("migrate", () => {
  it("applies the real migrations, records them, and does nothing the second time", async () => {
    const db = await testDb();
    const files = readMigrations();
    expect(files.length).toBeGreaterThan(0);
    expect(await migrate(db, files)).toEqual([]);
    const recorded = await db.query<{ name: string }>("select name from schema_migrations order by name");
    expect(recorded.map((r) => r.name)).toEqual(files.map((f) => f.name));
  });

  it("applies only the new migration when one is added", async () => {
    const db = await testDb();
    const next = { name: "9999_extra.sql", sql: "create table extra (id int);\n" };
    expect(await migrate(db, [...readMigrations(), next])).toEqual(["9999_extra.sql"]);
    expect(await db.query("select * from extra")).toEqual([]);
  });

  it("rolls a failing migration back completely and does not record it", async () => {
    const db = await testDb();
    const bad = { name: "9998_bad.sql", sql: "create table half (id int);\ninsert into no_such_table values (1);\n" };
    await expect(migrate(db, [...readMigrations(), bad])).rejects.toThrow();
    await expect(db.query("select * from half")).rejects.toThrow();
    expect((await db.query("select name from schema_migrations where name = $1", [bad.name])).length).toBe(0);
  });

  it("enforces the rules the app relies on", async () => {
    const db = await testDb();
    const user = (id: string, email: string, slug: string) =>
      db.query("insert into users (id, email, slug, role, name, created_at) values ($1,$2,$3,'engineer','N',now())", [
        id,
        email,
        slug,
      ]);
    await user("1", "a@x.com", "ada");
    await expect(user("2", "a@x.com", "bob")).rejects.toMatchObject({ code: "23505", constraint: "users_email_key" });
    await expect(user("3", "b@x.com", "ada")).rejects.toMatchObject({ code: "23505", constraint: "users_slug_key" });
    await expect(user("4", "C@x.com", "cat")).rejects.toMatchObject({ code: "23514" });
    await expect(user("5", "d@x.com", "Bad Slug")).rejects.toMatchObject({ code: "23514" });
  });
});
