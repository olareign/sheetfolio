"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { issuesToFieldErrors } from "@/content/form-spec";
import { CollectionNameSchema } from "@/content/schemas";
import { signOut } from "@/lib/auth";
import { deleteItem, reorderItems, saveProfile, saveSettings, upsertItem } from "@/lib/collections";
import { requireAccount } from "@/lib/session";
import { markAllLeadsRead, markLeadRead, publish, SiteError } from "@/lib/site";

export type ActionResult =
  { ok: true; id?: string; at: string } | { ok: false; formError?: string; fieldErrors: Record<string, string> };

const ItemId = z.union([z.literal("new"), z.string().min(1).max(64)]);

function failure(err: unknown): ActionResult {
  if (!(err instanceof SiteError)) throw err;
  if (err.code === "INVALID") {
    const { "": pathless, ...fieldErrors } = issuesToFieldErrors(err.issues);
    const formError = pathless ?? (Object.keys(fieldErrors).length ? "Some fields need attention." : err.message);
    return { ok: false, formError, fieldErrors };
  }
  if (err.code === "NOT_FOUND")
    return { ok: false, formError: "This item no longer exists. Reload the page.", fieldErrors: {} };
  return { ok: false, formError: "This site is suspended. Contact support.", fieldErrors: {} };
}

/**
 * Every action: authenticate (Server Actions are public endpoints), act on the caller's own slug only,
 * refresh the dashboard, and turn domain errors into form errors.
 */
async function run(fn: (slug: string) => Promise<string | void>): Promise<ActionResult> {
  const { account } = await requireAccount();
  try {
    const id = (await fn(account.slug)) ?? undefined;
    revalidatePath("/dashboard", "layout");
    return { ok: true, id, at: new Date().toISOString() };
  } catch (err) {
    return failure(err);
  }
}

function badRequest(message: string): ActionResult {
  return { ok: false, formError: message, fieldErrors: {} };
}

export async function saveItemAction(collection: unknown, id: unknown, data: unknown): Promise<ActionResult> {
  const name = CollectionNameSchema.safeParse(collection);
  const itemId = ItemId.safeParse(id);
  if (!name.success || !itemId.success) return badRequest("Unknown item.");
  return run((slug) => upsertItem(slug, name.data, itemId.data, data));
}

export async function deleteItemAction(collection: unknown, id: unknown): Promise<ActionResult> {
  const name = CollectionNameSchema.safeParse(collection);
  const itemId = z.string().min(1).max(64).safeParse(id);
  if (!name.success || !itemId.success) return badRequest("Unknown item.");
  return run((slug) => deleteItem(slug, name.data, itemId.data));
}

export async function reorderAction(collection: unknown, ids: unknown): Promise<ActionResult> {
  const name = CollectionNameSchema.safeParse(collection);
  if (!name.success) return badRequest("Unknown list.");
  return run((slug) => reorderItems(slug, name.data, ids));
}

export async function saveProfileAction(data: unknown): Promise<ActionResult> {
  return run((slug) => saveProfile(slug, data));
}

export async function saveSettingsAction(data: unknown): Promise<ActionResult> {
  return run((slug) => saveSettings(slug, data));
}

export async function publishAction(): Promise<ActionResult> {
  return run(async (slug) => {
    await publish(slug);
  });
}

export async function markLeadReadAction(id: unknown): Promise<ActionResult> {
  const leadId = z.string().uuid().safeParse(id);
  if (!leadId.success) return badRequest("Unknown enquiry.");
  return run(async (slug) => {
    if (!(await markLeadRead(slug, leadId.data))) throw new SiteError("NOT_FOUND", "Lead not found");
  });
}

export async function markAllLeadsReadAction(): Promise<ActionResult> {
  return run((slug) => markAllLeadsRead(slug));
}

export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: "/login" });
}
