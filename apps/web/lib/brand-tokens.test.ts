import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BRAND_TOKEN_SOURCE, BRAND_TOKENS } from "./brand-tokens";

describe("brand colour mirror", () => {
  it("matches the sheet theme in styles/tokens.css", () => {
    const css = readFileSync("styles/tokens.css", "utf8");
    const sheet = css.slice(0, css.indexOf('[data-theme="blueprint"]'));
    for (const [key, token] of Object.entries(BRAND_TOKEN_SOURCE)) {
      const match = sheet.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`));
      expect(match?.[1]?.toLowerCase(), token).toBe(BRAND_TOKENS[key as keyof typeof BRAND_TOKENS]);
    }
  });
});
