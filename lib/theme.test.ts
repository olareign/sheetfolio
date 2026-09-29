import { describe, expect, it } from "vitest";
import { isTheme, resolveTheme, ROOT_THEME_SCRIPT, SCOPE_THEME_SCRIPT, THEME_KEY } from "./theme";

describe("resolveTheme", () => {
  it("prefers the viewer's explicit choice over everything", () => {
    expect(resolveTheme("sheet", "blueprint", true)).toBe("sheet");
    expect(resolveTheme("blueprint", "sheet", false)).toBe("blueprint");
  });
  it("falls back to the page default (the engineer's theme) before the OS setting", () => {
    expect(resolveTheme(null, "blueprint", false)).toBe("blueprint");
    expect(resolveTheme(null, "sheet", true)).toBe("sheet");
  });
  it("uses the OS setting on app screens with no default", () => {
    expect(resolveTheme(null, undefined, true)).toBe("blueprint");
    expect(resolveTheme(null, undefined, false)).toBe("sheet");
  });
});

describe("isTheme", () => {
  it("accepts only the two design-system themes", () => {
    expect(isTheme("sheet")).toBe(true);
    expect(isTheme("blueprint")).toBe(true);
    for (const v of ["dark", "", null, undefined, 1]) expect(isTheme(v)).toBe(false);
  });
});

describe("pre-paint scripts", () => {
  it("read the same storage key and validate the stored value", () => {
    for (const script of [ROOT_THEME_SCRIPT, SCOPE_THEME_SCRIPT]) {
      expect(script).toContain(`"${THEME_KEY}"`);
      expect(script).toContain('p==="sheet"||p==="blueprint"');
      expect(script).toContain("catch"); // storage may be blocked
      expect(() => new Function(script)).not.toThrow(); // valid JS
    }
  });
});
