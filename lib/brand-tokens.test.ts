import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CV_TOKEN_SOURCE, CV_TOKENS } from "./cv-tokens";

describe("CV colour mirror", () => {
  it("matches the sheet theme in styles/tokens.css", () => {
    const css = readFileSync("styles/tokens.css", "utf8");
    const sheet = css.slice(0, css.indexOf('[data-theme="blueprint"]'));
    for (const [key, token] of Object.entries(CV_TOKEN_SOURCE)) {
      const match = sheet.match(new RegExp(`${token}:\\s*(#[0-9a-fA-F]{6})`));
      expect(match?.[1]?.toLowerCase(), token).toBe(CV_TOKENS[key as keyof typeof CV_TOKENS]);
    }
  });
});
