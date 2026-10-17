import { describe, expect, it } from "vitest";
import { parseEnv } from "./env.js";

const prod = { NODE_ENV: "production", RESEND_API_KEY: "re_test", WEB_ORIGIN: "https://sheetfolio.vercel.app" };

describe("parseEnv", () => {
  it("applies development defaults when nothing is set", () => {
    const env = parseEnv({});
    expect(env).toMatchObject({
      NODE_ENV: "development",
      PORT: 4000,
      RESEND_FROM: "Sheetfolio <onboarding@resend.dev>",
    });
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it("treats blank values as unset", () => {
    const env = parseEnv({ RESEND_API_KEY: "  ", RESEND_FROM: "", WEB_ORIGIN: "" });
    expect(env.RESEND_API_KEY).toBeUndefined();
    expect(env.WEB_ORIGIN).toBeUndefined();
    expect(env.RESEND_FROM).toBe("Sheetfolio <onboarding@resend.dev>");
  });

  it("coerces PORT and rejects out-of-range ports", () => {
    expect(parseEnv({ PORT: "8080" }).PORT).toBe(8080);
    expect(() => parseEnv({ PORT: "70000" })).toThrow(/PORT/);
    expect(() => parseEnv({ PORT: "abc" })).toThrow(/PORT/);
  });

  it("accepts a complete production configuration", () => {
    expect(parseEnv(prod).RESEND_API_KEY).toBe("re_test");
  });

  it("refuses production without a Resend key or web origin, naming both", () => {
    expect(() => parseEnv({ NODE_ENV: "production" })).toThrow(/RESEND_API_KEY[\s\S]*WEB_ORIGIN/);
  });

  it("rejects a malformed web origin", () => {
    expect(() => parseEnv({ ...prod, WEB_ORIGIN: "not a url" })).toThrow(/WEB_ORIGIN/);
  });
});
