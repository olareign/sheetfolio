import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/** Every .tsx under these folders, recursively. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".tsx") ? [path] : [];
  });
}

describe("password fields", () => {
  const files = [...sourceFiles("app"), ...sourceFiles("components")].filter(
    (f) => !f.endsWith("components/sp/PasswordInput.tsx"),
  );

  it("are only ever rendered through PasswordInput, so each one has the show/hide eye", () => {
    const raw = files.filter((f) => /type\s*=\s*["'{`]\s*["'`]?password/.test(readFileSync(f, "utf8")));
    expect(raw, 'Use <PasswordInput> from components/sp/PasswordInput instead of a raw type="password" input').toEqual(
      [],
    );
  });

  it("scans real source files (the guard would pass vacuously on an empty list)", () => {
    expect(files.length).toBeGreaterThan(20);
    expect(files.some((f) => f.endsWith("ResetForm.tsx"))).toBe(true);
  });

  it("is used by the sign-in, reset and settings forms", () => {
    for (const file of [
      "app/(auth)/login/LoginForm.tsx",
      "app/(auth)/reset-password/ResetForm.tsx",
      "components/cms/PasswordForm.tsx",
    ]) {
      expect(readFileSync(file, "utf8"), file).toContain("<PasswordInput");
    }
  });
});
