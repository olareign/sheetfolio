import { describe, expect, it } from "vitest";
import { hashPassword, verifyAgainstDummy, verifyPassword } from "./password";

describe("password hashing", () => {
  it("verifies the right password and rejects a wrong one", async () => {
    const hash = await hashPassword("correct horse battery");
    expect(await verifyPassword("correct horse battery", hash)).toBe(true);
    expect(await verifyPassword("correct horse batterz", hash)).toBe(false);
    expect(await verifyPassword("", hash)).toBe(false);
  });

  it("never stores the password and salts every hash", async () => {
    const a = await hashPassword("same password here");
    const b = await hashPassword("same password here");
    expect(a).not.toContain("same password here");
    expect(a).not.toBe(b);
    expect(a.startsWith("scrypt$32768$8$1$")).toBe(true);
  });

  it("treats composed and decomposed unicode as the same password", async () => {
    const hash = await hashPassword("café-password");
    expect(await verifyPassword("café-password", hash)).toBe(true);
  });

  it.each([
    ["empty", ""],
    ["wrong scheme", "bcrypt$10$abc$def"],
    ["missing parts", "scrypt$32768$8$1$c2FsdA=="],
    ["non-numeric cost", "scrypt$x$8$1$c2FsdA==$aGFzaA=="],
    ["cost scrypt refuses", "scrypt$3$8$1$c2FsdA==$aGFzaA=="],
  ])("returns false, not an error, for a malformed stored hash (%s)", async (_name, stored) => {
    expect(await verifyPassword("anything at all", stored)).toBe(false);
  });

  it("the dummy check always fails", async () => {
    expect(await verifyAgainstDummy("whatever password")).toBe(false);
  });
});
