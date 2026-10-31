import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  isAdmin: true,
  admin: {
    setSuspended: vi.fn(),
    setPlan: vi.fn(),
    signOutEverywhere: vi.fn(),
    resetAllowances: vi.fn(),
    deleteAccount: vi.fn(),
    removeItem: vi.fn(),
    deleteLead: vi.fn(),
    reindexPages: vi.fn(),
  },
}));

class NotFound extends Error {}
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/lib/session", () => ({
  requireAdmin: async () => {
    if (!state.isAdmin) throw new NotFound("not found");
    return { id: "a1", email: "root@example.com" };
  },
}));
vi.mock("@/lib/admin", () => state.admin);

const actions = await import("./actions");
const { SiteError } = await import("@/lib/site");

const LEAD = "00000000-0000-4000-8000-000000000001";

beforeEach(() => {
  state.isAdmin = true;
  for (const fn of Object.values(state.admin)) fn.mockReset();
  state.admin.deleteAccount.mockResolvedValue({ ok: true });
  state.admin.removeItem.mockResolvedValue(true);
  state.admin.deleteLead.mockResolvedValue(true);
  state.admin.reindexPages.mockResolvedValue({ added: 2, total: 5 });
});

/** Every action, called with valid input. */
const calls: [string, () => Promise<unknown>][] = [
  ["setSuspendedAction", () => actions.setSuspendedAction("ada", true)],
  ["setPlanAction", () => actions.setPlanAction("ada", "pro")],
  ["signOutEverywhereAction", () => actions.signOutEverywhereAction("ada")],
  ["resetAllowancesAction", () => actions.resetAllowancesAction("ada")],
  ["deleteAccountAction", () => actions.deleteAccountAction("ada", "ada")],
  ["removeItemAction", () => actions.removeItemAction("ada", "projects", "p-001")],
  ["deleteLeadAction", () => actions.deleteLeadAction("ada", LEAD)],
  ["reindexPagesAction", () => actions.reindexPagesAction()],
];

describe("every admin action", () => {
  it.each(calls)("%s does nothing for someone who is not an admin", async (_name, call) => {
    state.isAdmin = false;
    await expect(call()).rejects.toBeInstanceOf(NotFound);
    for (const fn of Object.values(state.admin)) expect(fn).not.toHaveBeenCalled();
  });

  it.each(calls)("%s names the admin who did it", async (_name, call) => {
    await call();
    const used = Object.values(state.admin).find((fn) => fn.mock.calls.length > 0)!;
    expect(used.mock.calls[0]).toContain("root@example.com");
  });
});

describe("input checks", () => {
  it("refuses bad addresses, plans, collections and ids without touching anything", async () => {
    expect(await actions.setSuspendedAction("Not A Slug!", true)).toEqual({ ok: false, error: "Invalid request." });
    expect(await actions.setSuspendedAction("ada", "yes")).toEqual({ ok: false, error: "Invalid request." });
    expect(await actions.setPlanAction("ada", "gold")).toEqual({ ok: false, error: "Invalid request." });
    expect(await actions.removeItemAction("ada", "passwords", "x")).toEqual({ ok: false, error: "Invalid request." });
    expect(await actions.deleteLeadAction("ada", "not-a-uuid")).toEqual({ ok: false, error: "Invalid request." });
    expect(await actions.signOutEverywhereAction(42)).toEqual({ ok: false, error: "Invalid request." });
    for (const fn of Object.values(state.admin)) expect(fn).not.toHaveBeenCalled();
  });

  it("deletes an account only when the page address is typed again", async () => {
    expect(await actions.deleteAccountAction("ada", "")).toMatchObject({ ok: false });
    expect(await actions.deleteAccountAction("ada", "bob")).toMatchObject({ ok: false });
    expect(state.admin.deleteAccount).not.toHaveBeenCalled();
    expect(await actions.deleteAccountAction("ada", "ada")).toEqual({ ok: true, message: "Account deleted." });
  });
});

describe("results", () => {
  it("explains why an account could not be deleted", async () => {
    state.admin.deleteAccount.mockResolvedValue({ ok: false, reason: "ADMIN" });
    expect(await actions.deleteAccountAction("ada", "ada")).toMatchObject({
      error: expect.stringMatching(/Admin accounts/),
    });
    state.admin.deleteAccount.mockResolvedValue({ ok: false, reason: "SELF" });
    expect(await actions.deleteAccountAction("ada", "ada")).toMatchObject({ error: expect.stringMatching(/your own/) });
    state.admin.deleteAccount.mockResolvedValue({ ok: false, reason: "NOT_FOUND" });
    expect(await actions.deleteAccountAction("ada", "ada")).toMatchObject({
      error: expect.stringMatching(/no longer exists/),
    });
  });

  it("turns a missing account into a message instead of an error page", async () => {
    state.admin.setPlan.mockRejectedValue(new SiteError("NOT_FOUND", "gone"));
    expect(await actions.setPlanAction("ada", "pro")).toEqual({ ok: false, error: "That no longer exists." });
  });

  it("reports an item or enquiry that was already removed, and describes the index rebuild", async () => {
    state.admin.removeItem.mockResolvedValue(false);
    state.admin.deleteLead.mockResolvedValue(false);
    expect(await actions.removeItemAction("ada", "projects", "p-001")).toMatchObject({ ok: false });
    expect(await actions.deleteLeadAction("ada", LEAD)).toMatchObject({ ok: false });
    expect(await actions.reindexPagesAction()).toEqual({ ok: true, message: "Added 2 of 5 pages to the index." });
  });

  it("lets an unexpected failure surface instead of hiding it", async () => {
    state.admin.signOutEverywhere.mockRejectedValue(new Error("database down"));
    await expect(actions.signOutEverywhereAction("ada")).rejects.toThrow("database down");
  });
});
