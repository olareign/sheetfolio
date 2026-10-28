import "server-only";
import { z } from "zod";
import { applyOverlayToSite, overlayFromSite, reconcileOverlay, TailorOverlay } from "../../content/tailor";
import { mutateDraft } from "../collections";
import { getDraft, SiteError } from "../site";
import { tailored } from "../store";
import type { TailoredRecord, UndoRecord } from "../store/tailored";

/*
 * Keeping tailored CVs and using one on the page. Saving, editing and deleting a version never touches the page; only
 * `applyTailored` does, and it first keeps what the page said so `undoApply` can put it back.
 */

const Name = z.string().trim().min(1, "Give this version a name").max(40, "At most 40 characters");

const fail = (message: string, path: (string | number)[] = []) =>
  new SiteError("INVALID", message, [{ code: "custom", path, message }]);

async function draftOf(slug: string) {
  const draft = await getDraft(slug);
  if (!draft) throw new SiteError("NOT_FOUND", `No draft for ${slug}`);
  return draft;
}

export type SaveInput = {
  name: unknown;
  overlay: unknown;
  job?: { title?: string; company?: string; source?: string };
};

function checked(input: SaveInput) {
  const name = Name.safeParse(input.name);
  if (!name.success)
    throw new SiteError(
      "INVALID",
      "Invalid name",
      name.error.issues.map((i) => ({ ...i, path: ["name"] })),
    );
  const overlay = TailorOverlay.safeParse(input.overlay);
  if (!overlay.success) throw new SiteError("INVALID", "Invalid version", overlay.error.issues);
  return { name: name.data, overlay: overlay.data };
}

export const listTailored = (slug: string): Promise<TailoredRecord[]> => tailored().list(slug);
export const tailoredUndo = (slug: string): Promise<UndoRecord | null> => tailored().getUndo(slug);

/** Saves a new version. The overlay is checked against the page as it is now, so it never keeps ids that are gone. */
export async function saveTailored(slug: string, input: SaveInput, now: Date = new Date()): Promise<TailoredRecord> {
  const { name, overlay } = checked(input);
  const draft = await draftOf(slug);
  const saved = await tailored().add(
    slug,
    {
      id: crypto.randomUUID(),
      name,
      jobTitle: (input.job?.title ?? "").trim().slice(0, 160),
      jobCompany: (input.job?.company ?? "").trim().slice(0, 160),
      jobSource: (input.job?.source ?? "").trim().slice(0, 2000),
      overlay: reconcileOverlay(draft, overlay),
    },
    now,
  );
  if (saved === "full") throw fail("You already have 3 saved versions. Delete one to save another.");
  return saved;
}

/** Changes the name and wording of a saved version. */
export async function updateTailored(
  slug: string,
  id: string,
  input: SaveInput,
  now: Date = new Date(),
): Promise<void> {
  const { name, overlay } = checked(input);
  const draft = await draftOf(slug);
  const ok = await tailored().update(slug, id, { name, overlay: reconcileOverlay(draft, overlay) }, now);
  if (!ok) throw new SiteError("NOT_FOUND", "Version not found");
}

export async function deleteTailored(slug: string, id: string): Promise<void> {
  if (!(await tailored().remove(slug, id))) throw new SiteError("NOT_FOUND", "Version not found");
}

/**
 * Puts a saved version's headline, summary, skills, notes and order on the page. Nothing is removed from the page, and
 * what it said before the first version was used is kept, so "restore" always goes back to the person's own wording,
 * however many versions they try in between.
 */
export async function applyTailored(slug: string, id: string, now: Date = new Date()): Promise<void> {
  const version = await tailored().get(slug, id);
  if (!version) throw new SiteError("NOT_FOUND", "Version not found");
  const draft = await draftOf(slug);
  // Kept first: if the page cannot be saved, nothing was lost; if keeping fails, the page is not touched.
  if (!(await tailored().getUndo(slug))) {
    await tailored().setUndo(slug, {
      label: version.name,
      snapshot: overlayFromSite(draft),
      takenAt: now.toISOString(),
    });
  }
  await mutateDraft(slug, (current) => applyOverlayToSite(current, version.overlay), now);
}

/** Puts back what the page said before the first "use on my page". */
export async function undoApply(slug: string, now: Date = new Date()): Promise<void> {
  const undo = await tailored().getUndo(slug);
  if (!undo) throw new SiteError("NOT_FOUND", "There is nothing to undo");
  await mutateDraft(slug, (current) => applyOverlayToSite(current, undo.snapshot), now);
  await tailored().clearUndo(slug);
}

/** The person is happy with the page as it is now: forget the wording to restore. */
export async function discardUndo(slug: string): Promise<void> {
  await tailored().clearUndo(slug);
}
