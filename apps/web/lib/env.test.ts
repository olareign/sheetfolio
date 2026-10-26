import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const base = {
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "token",
  AUTH_SECRET: "x".repeat(32),
};

describe("parseEnv", () => {
  it("treats blank optional values from .env.example as unset", () => {
    const env = parseEnv({
      ...base,
      AUTH_RESEND_KEY: "",
      CLOUDINARY_URL: " ",
      NEXT_PUBLIC_SITE_URL: "",
      ADMIN_EMAILS: "",
      RESEND_FROM: "",
    });
    expect(env.AUTH_RESEND_KEY).toBeUndefined();
    expect(env.CLOUDINARY_URL).toBeUndefined();
    expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined();
    expect(env.ADMIN_EMAILS).toEqual([]);
    expect(env.RESEND_FROM).toBe("Sheetfolio <onboarding@resend.dev>");
  });

  it("normalises admin emails", () => {
    expect(parseEnv({ ...base, ADMIN_EMAILS: " A@x.com, b@y.com ,," }).ADMIN_EMAILS).toEqual(["a@x.com", "b@y.com"]);
  });

  it("requires a Resend key in production only", () => {
    expect(() => parseEnv({ ...base, NODE_ENV: "production" })).toThrow(/AUTH_RESEND_KEY: Required in production/);
    expect(() => parseEnv({ ...base, NODE_ENV: "production", AUTH_RESEND_KEY: "re_x" })).not.toThrow();
  });

  it("lists every missing required variable", () => {
    expect(() => parseEnv({})).toThrow(/UPSTASH_REDIS_REST_URL[\s\S]*UPSTASH_REDIS_REST_TOKEN[\s\S]*AUTH_SECRET/);
  });

  it("rejects a short AUTH_SECRET and a malformed URL", () => {
    expect(() => parseEnv({ ...base, AUTH_SECRET: "short" })).toThrow(/AUTH_SECRET/);
    expect(() => parseEnv({ ...base, UPSTASH_REDIS_REST_URL: "not a url" })).toThrow(/UPSTASH_REDIS_REST_URL/);
  });

  it("accepts the KV_REST_API_* names Vercel's Upstash integration injects", () => {
    const rest = { AUTH_SECRET: base.AUTH_SECRET }; // no UPSTASH_* names at all
    const env = parseEnv({ ...rest, KV_REST_API_URL: "https://kv.upstash.io", KV_REST_API_TOKEN: "kv-token" });
    expect(env.UPSTASH_REDIS_REST_URL).toBe("https://kv.upstash.io");
    expect(env.UPSTASH_REDIS_REST_TOKEN).toBe("kv-token");
  });

  it("prefers the explicit UPSTASH_* names when both are set", () => {
    expect(parseEnv({ ...base, KV_REST_API_URL: "https://other.upstash.io" }).UPSTASH_REDIS_REST_URL).toBe(
      base.UPSTASH_REDIS_REST_URL,
    );
  });
});

describe("store modes", () => {
  it("default to Redis, and need no database", () => {
    const env = parseEnv({ ...base, ACCOUNTS_STORE: "", LEADS_STORE: undefined });
    expect([env.ACCOUNTS_STORE, env.LEADS_STORE, env.DATABASE_URL]).toEqual(["redis", "redis", undefined]);
  });

  it("refuse to start when a store has left Redis but there is no database", () => {
    expect(() => parseEnv({ ...base, ACCOUNTS_STORE: "dual" })).toThrow(
      /DATABASE_URL: Required when ACCOUNTS_STORE is dual/,
    );
    expect(() => parseEnv({ ...base, LEADS_STORE: "postgres" })).toThrow(/Required when LEADS_STORE is postgres/);
  });

  it("accept a database, from DATABASE_URL or Vercel's POSTGRES_URL", () => {
    const url = "postgresql://u:p@ep-x.us-east-1.aws.neon.tech/db?sslmode=require";
    expect(parseEnv({ ...base, ACCOUNTS_STORE: "pg-first", DATABASE_URL: url }).DATABASE_URL).toBe(url);
    expect(parseEnv({ ...base, LEADS_STORE: "dual", POSTGRES_URL: url }).DATABASE_URL).toBe(url);
  });

  it("reject an unknown mode or a database address that is not Postgres", () => {
    expect(() => parseEnv({ ...base, ACCOUNTS_STORE: "both" })).toThrow(/ACCOUNTS_STORE/);
    expect(() => parseEnv({ ...base, DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
  });
});
