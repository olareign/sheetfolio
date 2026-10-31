"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { CollectionNameSchema, Slug, UserPlan } from "@/content/schemas";
import {
  deleteAccount,
  deleteLead,
  reindexPages,
  removeItem,
  resetAllowances,
  setPlan,
  setSuspended,
  signOutEverywhere,
} from "@/lib/admin";
import { requireAdmin } from "@/lib/session";
import { SiteError } from "@/lib/site";

/*
 * Every Server Action here can be called without ever loading an admin page, so each one starts by proving the caller is
 * an admin, then checks its own input, then makes one change that is written to the activity log under the admin's name.
 */

export type AdminResult = { ok: true; message?: string } | { ok: false; error: string };

const INVALID: AdminResult = { ok: false, error: "Invalid request." };

async function guarded(run: (admin: string) => Promise<AdminResult>): Promise<AdminResult> {
  const { email } = await requireAdmin();
  try {
    const result = await run(email);
    if (result.ok) revalidatePath("/admin", "layout");
    return result;
  } catch (err) {
    if (err instanceof SiteError)
      return { ok: false, error: err.code === "NOT_FOUND" ? "That no longer exists." : "Could not do that." };
    throw err;
  }
}

export async function setSuspendedAction(slug: unknown, suspended: unknown): Promise<AdminResult> {
  await requireAdmin(); // before parsing, so a non-admin learns nothing from the validation messages
  const parsed = z.object({ slug: Slug, suspended: z.boolean() }).safeParse({ slug, suspended });
  if (!parsed.success) return INVALID;
  return guarded(async (admin) => {
    await setSuspended(parsed.data.slug, parsed.data.suspended, admin);
    return { ok: true };
  });
}

export async function setPlanAction(slug: unknown, plan: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = z.object({ slug: Slug, plan: UserPlan }).safeParse({ slug, plan });
  if (!parsed.success) return INVALID;
  return guarded(async (admin) => {
    await setPlan(parsed.data.slug, parsed.data.plan, admin);
    return { ok: true, message: `Moved to the ${parsed.data.plan} plan.` };
  });
}

export async function signOutEverywhereAction(slug: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = Slug.safeParse(slug);
  if (!parsed.success) return INVALID;
  return guarded(async (admin) => {
    await signOutEverywhere(parsed.data, admin);
    return { ok: true, message: "Signed out everywhere." };
  });
}

export async function resetAllowancesAction(slug: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = Slug.safeParse(slug);
  if (!parsed.success) return INVALID;
  return guarded(async (admin) => {
    await resetAllowances(parsed.data, admin);
    return { ok: true, message: "Tailoring allowance reset." };
  });
}

/** The admin must type the page address again: a deleted account cannot be brought back. */
export async function deleteAccountAction(slug: unknown, confirmation: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = Slug.safeParse(slug);
  if (!parsed.success || confirmation !== parsed.data) return { ok: false, error: "Type the page address to confirm." };
  return guarded(async (admin) => {
    const result = await deleteAccount(parsed.data, admin);
    if (result.ok) return { ok: true, message: "Account deleted." };
    return {
      ok: false,
      error:
        result.reason === "NOT_FOUND"
          ? "That account no longer exists."
          : result.reason === "SELF"
            ? "You cannot delete your own account here."
            : "Admin accounts cannot be deleted here.",
    };
  });
}

const Item = z.object({ slug: Slug, collection: CollectionNameSchema, id: z.string().min(1).max(64) });

export async function removeItemAction(slug: unknown, collection: unknown, id: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = Item.safeParse({ slug, collection, id });
  if (!parsed.success) return INVALID;
  return guarded(async (admin) => {
    const removed = await removeItem(parsed.data.slug, parsed.data.collection, parsed.data.id, admin);
    return removed
      ? { ok: true, message: "Removed from the page." }
      : { ok: false, error: "That item is already gone." };
  });
}

export async function deleteLeadAction(slug: unknown, id: unknown): Promise<AdminResult> {
  await requireAdmin();
  const parsed = z.object({ slug: Slug, id: z.string().uuid() }).safeParse({ slug, id });
  if (!parsed.success) return INVALID;
  return guarded(async (admin) => {
    const removed = await deleteLead(parsed.data.slug, parsed.data.id, admin);
    return removed ? { ok: true, message: "Enquiry deleted." } : { ok: false, error: "That enquiry is already gone." };
  });
}

export async function reindexPagesAction(): Promise<AdminResult> {
  await requireAdmin();
  return guarded(async (admin) => {
    const { added, total } = await reindexPages(admin);
    return {
      ok: true,
      message: added ? `Added ${added} of ${total} pages to the index.` : "The index already has every page.",
    };
  });
}
