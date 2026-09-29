"use server";

import { revalidatePath } from "next/cache";
import { Slug } from "@/content/schemas";
import { setSuspended } from "@/lib/admin";
import { requireAdmin } from "@/lib/session";
import { SiteError } from "@/lib/site";

export type AdminResult = { ok: true } | { ok: false; error: string };

export async function setSuspendedAction(slug: unknown, suspended: unknown): Promise<AdminResult> {
  await requireAdmin(); // re-checked here: Server Actions are callable without the page
  const parsed = Slug.safeParse(slug);
  if (!parsed.success || typeof suspended !== "boolean") return { ok: false, error: "Invalid request." };
  try {
    await setSuspended(parsed.data, suspended);
  } catch (err) {
    if (err instanceof SiteError) return { ok: false, error: `Couldn't update /${parsed.data}.` };
    throw err;
  }
  revalidatePath("/admin");
  return { ok: true };
}
