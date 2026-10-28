import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  register: vi.fn(),
  signIn: vi.fn(),
  allowed: true,
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next-auth", () => ({ AuthError: class AuthError extends Error {} }));
vi.mock("@/lib/accounts", () => ({ registerAccount: state.register }));
vi.mock("@/lib/auth", () => ({ signIn: state.signIn }));
vi.mock("@/lib/env", () => ({ isAdminEmail: () => false }));
vi.mock("@/lib/ratelimit", () => ({ allowSignup: async () => state.allowed, clientIp: () => "203.0.113.9" }));

const { signUp } = await import("./actions");

const form = (over: Record<string, string | null> = {}) => {
  const data = new FormData();
  const fields: Record<string, string | null> = {
    name: "Ada Obi",
    email: "ada@example.com",
    slug: "ada-obi",
    headline: "Software Engineer",
    password: "a-long-enough-password",
    agree: "on",
    ...over,
  };
  for (const [key, value] of Object.entries(fields)) if (value !== null) data.set(key, value);
  return data;
};

beforeEach(() => {
  state.register.mockReset().mockResolvedValue({ ok: true });
  // The real signIn ends in a redirect, which Next throws; the action lets that through.
  state.signIn.mockReset().mockRejectedValue(new Error("NEXT_REDIRECT"));
  state.allowed = true;
});

describe("signUp: agreeing to the terms", () => {
  it("creates nothing when the box is not ticked", async () => {
    const result = await signUp({}, form({ agree: null }));
    expect(result.fieldErrors?.agree).toMatch(/Terms of service and Privacy policy/);
    expect(state.register).not.toHaveBeenCalled();
    expect(state.signIn).not.toHaveBeenCalled();
  });

  it("does not take any other value as agreement", async () => {
    for (const agree of ["", "off", "true", "1", "ON"]) {
      const result = await signUp({}, form({ agree }));
      expect(result.fieldErrors?.agree, agree).toBeDefined();
    }
    expect(state.register).not.toHaveBeenCalled();
  });

  it("keeps what was typed, and the tick, when something else is wrong", async () => {
    const result = await signUp({}, form({ email: "nope" }));
    expect(result.fieldErrors?.email).toBeDefined();
    expect(result.values).toMatchObject({ name: "Ada Obi", slug: "ada-obi", agree: true });
  });

  it("asks for the tick even when everything else is right, and says nothing else is wrong", async () => {
    const result = await signUp({}, form({ agree: null }));
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(["agree"]);
    expect(result.values?.agree).toBe(false);
  });

  it("creates the account once the box is ticked", async () => {
    await expect(signUp({}, form())).rejects.toThrow("NEXT_REDIRECT");
    expect(state.register).toHaveBeenCalledTimes(1);
    expect(state.register.mock.calls[0]![0]).toMatchObject({ email: "ada@example.com" });
    expect(state.signIn).toHaveBeenCalledTimes(1);
  });

  it("does not spend the sign-up allowance on someone who has not agreed", async () => {
    state.allowed = false;
    const result = await signUp({}, form({ agree: null }));
    expect(result.fieldErrors?.agree).toBeDefined();
    expect(result.formError).toBeUndefined();
  });
});
