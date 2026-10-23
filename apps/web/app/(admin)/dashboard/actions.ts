"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { issuesToFieldErrors } from "@/content/form-spec";
import { CollectionNameSchema } from "@/content/schemas";
import { signOut } from "@/lib/auth";
import { deleteItem, reorderItems, saveCvLayouts, saveProfile, saveSettings, upsertItem } from "@/lib/collections";
import { applyCvImport } from "@/lib/cv-import/apply";
import { refreshProjectPreview } from "@/lib/project-preview";
import { requireAccount } from "@/lib/session";
import { saveSetupProfile, type SetupPart } from "@/lib/setup";
import { getDraft, markAllLeadsRead, markLeadRead, publish, SiteError } from "@/lib/site";

export type ActionResult =
  | {
      ok: true;
      id?: string;
      at: string;
      /** Saved fine, but something worth telling the owner. */ notice?: string;
      /** The item as stored, when the server changed it after the save (a filled-in description). */ values?: Record<
        string,
        unknown
      >;
    }
  | { ok: false; formError?: string; fieldErrors: Record<string, string> };

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
async function run(
  fn: (slug: string) => Promise<string | void | { id?: string; notice?: string; values?: Record<string, unknown> }>,
): Promise<ActionResult> {
  const { account } = await requireAccount();
  try {
    const out = await fn(account.slug);
    const { id, notice, values } =
      typeof out === "object" && out !== null ? out : { id: out ?? undefined, notice: undefined, values: undefined };
    revalidatePath("/dashboard", "layout");
    return { ok: true, id, at: new Date().toISOString(), notice, values };
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
  return run(async (slug) => {
    const saved = await upsertItem(slug, name.data, itemId.data, data);
    if (name.data !== "projects") return saved;
    const notice = await previewNotice(slug, saved);
    const stored = (await getDraft(slug))?.projects.find((p) => p.id === saved);
    return { id: saved, notice, values: stored as Record<string, unknown> | undefined };
  });
}

const PREVIEW_BUDGET_MS = 10_000;

/**
 * Reads the project's website for a picture, title and description. The project is already saved, so this
 * never fails the save: a slow, broken or blocked site comes back as a notice for the owner instead.
 */
async function previewNotice(slug: string, projectId: string): Promise<string | undefined> {
  const slow = new Promise<{ notice: string }>((resolve) =>
    setTimeout(
      () =>
        resolve({
          notice: "Saved. The website is slow to answer, so its preview isn't ready yet. Save again in a moment.",
        }),
      PREVIEW_BUDGET_MS,
    ),
  );
  try {
    return (await Promise.race([refreshProjectPreview(slug, projectId), slow])).notice;
  } catch (err) {
    console.error("[project-preview] failed:", err instanceof Error ? err.message : err);
    return "Saved, but the website preview failed. Upload a cover photo, or try saving again.";
  }
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

export async function saveCvLayoutsAction(data: unknown): Promise<ActionResult> {
  return run((slug) => saveCvLayouts(slug, data));
}

export async function saveSetupAction(part: SetupPart, data: unknown): Promise<ActionResult> {
  if (part !== "about" && part !== "contact") return badRequest("Unknown step.");
  return run((slug) => saveSetupProfile(slug, part, data));
}

export async function applyCvImportAction(data: unknown): Promise<ActionResult> {
  return run(async (slug) => {
    const added = await applyCvImport(slug, data);
    const parts = [
      added.experiences && `${added.experiences} ${added.experiences === 1 ? "role" : "roles"}`,
      added.education && `${added.education} ${added.education === 1 ? "qualification" : "qualifications"}`,
      added.certifications &&
        `${added.certifications} ${added.certifications === 1 ? "certification" : "certifications"}`,
      added.profile && "your details",
    ].filter(Boolean);
    return { notice: parts.length ? `Added ${parts.join(", ")}.` : "Everything in that CV was already on your page." };
  });
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
