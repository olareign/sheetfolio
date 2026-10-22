import { describe, expect, it, vi } from "vitest";
import { hasEdits, saveForm } from "./UnsavedChanges";

describe("hasEdits", () => {
  it("is false for a form nobody has touched, even if the form reports itself dirty", () => {
    expect(hasEdits({ dirtyFields: {} })).toBe(false);
  });

  it("is true once a field, including a nested one, has been changed", () => {
    expect(hasEdits({ dirtyFields: { title: true } })).toBe(true);
    expect(hasEdits({ dirtyFields: { profile: { name: true } } })).toBe(true);
  });
});

describe("saveForm", () => {
  // Mimics react-hook-form: `handleSubmit(fn)` returns a submit function that only calls `fn` when validation passes.
  const form = (valid: boolean) =>
    ({
      handleSubmit: (fn: (v: object) => Promise<void>) => async () => {
        if (valid) await fn({ a: 1 });
      },
    }) as never;

  it("resolves true when the save went through", async () => {
    const persist = vi.fn(async () => true);
    expect(await saveForm(form(true), persist)).toBe(true);
    expect(persist).toHaveBeenCalledWith({ a: 1 });
  });

  it("resolves false when the server refused the save", async () => {
    expect(await saveForm(form(true), async () => false)).toBe(false);
  });

  it("resolves false, without saving, when validation fails", async () => {
    const persist = vi.fn(async () => true);
    expect(await saveForm(form(false), persist)).toBe(false);
    expect(persist).not.toHaveBeenCalled();
  });
});
