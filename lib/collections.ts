import "server-only";
import { z } from "zod";
import {
  collections,
  ProfileEditorInput,
  SettingsInput,
  type CollectionName,
  type Site,
  type SiteInput,
} from "@/content/schemas";
import { getDraft, saveDraft, SiteError } from "./site";

type Item = { id: string };

function invalid(path: string, message: string): SiteError {
  return new SiteError("INVALID", message, [{ code: "custom", path: path.split("."), message, input: undefined }]);
}

/** Read the draft, apply `fn`, validate and save it in one write. */
export async function mutateDraft(slug: string, fn: (draft: Site) => SiteInput, now: Date = new Date()): Promise<Site> {
  const draft = await getDraft(slug);
  if (!draft) throw new SiteError("NOT_FOUND", `No draft for ${slug}`);
  return saveDraft(slug, fn(draft), now);
}

/** Rules that span more than one item, which the per-item schema can't see. */
function checkCrossItemRules(name: CollectionName, item: Item & Record<string, unknown>, draft: Site): void {
  if (name !== "projects") return;
  const project = item as Item & { drawingNo: string; experienceId?: string };
  if (draft.projects.some((p) => p.id !== project.id && p.drawingNo === project.drawingNo)) {
    throw invalid("drawingNo", `${project.drawingNo} is already used by another project`);
  }
  if (project.experienceId && !draft.experiences.some((e) => e.id === project.experienceId)) {
    throw invalid("experienceId", "That employer no longer exists");
  }
}

/** First photo is the cover (DESIGN §3.3), so `isCover` is derived from order rather than trusted. */
function normalise(name: CollectionName, item: Record<string, unknown>): Record<string, unknown> {
  if (name !== "projects" || !Array.isArray(item.images)) return item;
  return { ...item, images: item.images.map((img: Record<string, unknown>, i) => ({ ...img, isCover: i === 0 })) };
}

/**
 * Creates (`id === "new"`, appended to the end) or replaces an item in place.
 * Returns the saved item's id.
 */
export async function upsertItem(
  slug: string,
  name: CollectionName,
  id: string,
  data: unknown,
  now: Date = new Date(),
): Promise<string> {
  const raw = typeof data === "object" && data !== null ? (data as Record<string, unknown>) : {};
  const itemId = id === "new" ? crypto.randomUUID() : id;
  const parsed = collections[name].schema.safeParse(normalise(name, { ...raw, id: itemId }));
  if (!parsed.success) throw new SiteError("INVALID", `Invalid ${name} item`, parsed.error.issues);
  const item = parsed.data as Item & Record<string, unknown>;

  await mutateDraft(
    slug,
    (draft) => {
      const items = draft[name] as Item[];
      const index = items.findIndex((i) => i.id === itemId);
      if (id !== "new" && index === -1) throw new SiteError("NOT_FOUND", `No ${name} item ${id}`);
      checkCrossItemRules(name, item, draft);
      const next = index === -1 ? [...items, item] : items.map((i) => (i.id === itemId ? item : i));
      return { ...draft, [name]: next };
    },
    now,
  );
  return itemId;
}

/** Deletes an item. Deleting an employer unlinks its projects rather than leaving dangling ids. */
export async function deleteItem(
  slug: string,
  name: CollectionName,
  id: string,
  now: Date = new Date(),
): Promise<void> {
  await mutateDraft(
    slug,
    (draft) => {
      const items = draft[name] as Item[];
      if (!items.some((i) => i.id === id)) throw new SiteError("NOT_FOUND", `No ${name} item ${id}`);
      const next: SiteInput = { ...draft, [name]: items.filter((i) => i.id !== id) };
      if (name === "experiences") {
        next.projects = draft.projects.map((p) => (p.experienceId === id ? { ...p, experienceId: undefined } : p));
      }
      return next;
    },
    now,
  );
}

/** Applies a new order. `ids` must be exactly the current ids, in any order. */
export async function reorderItems(
  slug: string,
  name: CollectionName,
  ids: unknown,
  now: Date = new Date(),
): Promise<void> {
  const parsed = z.array(z.string()).safeParse(ids);
  if (!parsed.success) throw new SiteError("INVALID", "Invalid order", parsed.error.issues);
  await mutateDraft(
    slug,
    (draft) => {
      const items = draft[name] as Item[];
      const byId = new Map(items.map((i) => [i.id, i]));
      const order = parsed.data;
      if (order.length !== items.length || new Set(order).size !== order.length || !order.every((id) => byId.has(id))) {
        // The list on screen is stale (e.g. edited in another tab): refuse rather than drop items.
        throw new SiteError("INVALID", "The list changed since it was loaded. Reload and try again.");
      }
      return { ...draft, [name]: order.map((id) => byId.get(id)) };
    },
    now,
  );
}

export async function saveProfile(slug: string, data: unknown, now: Date = new Date()): Promise<void> {
  const parsed = ProfileEditorInput.safeParse(data);
  if (!parsed.success) throw new SiteError("INVALID", "Invalid profile", parsed.error.issues);
  const { profile, competencies, research } = parsed.data;
  // Assign every editable key explicitly: a cleared optional field is absent from `profile`,
  // and spreading it over the old profile would silently keep the old value.
  const editable = Object.keys(ProfileEditorInput.shape.profile.shape) as (keyof typeof profile)[];
  const patch = Object.fromEntries(editable.map((k) => [k, profile[k]]));
  await mutateDraft(
    slug,
    (draft) => ({ ...draft, profile: { ...draft.profile, ...patch }, competencies, research }),
    now,
  );
}

export async function saveSettings(slug: string, data: unknown, now: Date = new Date()): Promise<void> {
  const parsed = SettingsInput.safeParse(data);
  if (!parsed.success) throw new SiteError("INVALID", "Invalid settings", parsed.error.issues);
  const { theme, ...contact } = parsed.data;
  await mutateDraft(
    slug,
    (draft) => ({ ...draft, profile: { ...draft.profile, ...contact }, settings: { ...draft.settings, theme } }),
    now,
  );
}
