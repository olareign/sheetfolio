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
      BLOB_READ_WRITE_TOKEN: " ",
      NEXT_PUBLIC_SITE_URL: "",
      ADMIN_EMAILS: "",
      RESEND_FROM: "",
    });
    expect(env.AUTH_RESEND_KEY).toBeUndefined();
    expect(env.BLOB_READ_WRITE_TOKEN).toBeUndefined();
    expect(env.NEXT_PUBLIC_SITE_URL).toBeUndefined();
    expect(env.ADMIN_EMAILS).toEqual([]);
    expect(env.RESEND_FROM).toBe("Siteproof <onboarding@resend.dev>");
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
});
