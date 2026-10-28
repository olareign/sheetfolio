import { describe, expect, it } from "vitest";
import { parseEnv } from "./env";

const base = {
  UPSTASH_REDIS_REST_URL: "https://example.upstash.io",
  UPSTASH_REDIS_REST_TOKEN: "token",
  AUTH_SECRET: "x".repeat(32),
  DATABASE_URL: "postgresql://u:p@ep-x.us-east-1.aws.neon.tech/db?sslmode=require",
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
    expect(env.RESEND_FROM).toBe("Dosinex <onboarding@resend.dev>");
  });

  it("leaves AI tailoring switched off without a key, and defaults the model", () => {
    const env = parseEnv({ ...base, ANTHROPIC_API_KEY: "", ANTHROPIC_MODEL: "" });
    expect(env.ANTHROPIC_API_KEY).toBeUndefined();
    expect(env.ANTHROPIC_MODEL).toBe("claude-opus-5-5");
    expect(parseEnv({ ...base, ANTHROPIC_API_KEY: "sk-ant-x", ANTHROPIC_MODEL: "claude-sonnet-5-5" })).toMatchObject({
      ANTHROPIC_API_KEY: "sk-ant-x",
      ANTHROPIC_MODEL: "claude-sonnet-5-5",
    });
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
    const rest = { AUTH_SECRET: base.AUTH_SECRET, DATABASE_URL: base.DATABASE_URL }; // no UPSTASH_* names at all
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

describe("DATABASE_URL", () => {
  it("is required, so a deploy without a database fails at startup", () => {
    expect(() => parseEnv({ ...base, DATABASE_URL: undefined })).toThrow(/DATABASE_URL/);
  });

  it("can come from Vercel's POSTGRES_URL", () => {
    expect(parseEnv({ ...base, DATABASE_URL: undefined, POSTGRES_URL: base.DATABASE_URL }).DATABASE_URL).toBe(
      base.DATABASE_URL,
    );
  });

  it("must be a Postgres address", () => {
    expect(() => parseEnv({ ...base, DATABASE_URL: "mysql://x" })).toThrow(/DATABASE_URL/);
  });
});

describe("CRON_SECRET", () => {
  it("is optional, and must be long enough to be a secret", () => {
    expect(parseEnv(base).CRON_SECRET).toBeUndefined();
    expect(() => parseEnv({ ...base, CRON_SECRET: "short" })).toThrow(/CRON_SECRET/);
    expect(parseEnv({ ...base, CRON_SECRET: "c".repeat(32) }).CRON_SECRET).toBe("c".repeat(32));
  });
});
