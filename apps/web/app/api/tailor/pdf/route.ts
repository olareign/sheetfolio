import { NextResponse } from "next/server";
import { z } from "zod";
import { cvModel } from "@/content/cv";
import { offeredCvTemplates, parseCvTemplate } from "@/content/cv-templates";
import { cvSite, reconcileOverlay, tailoredFileName, TailorOverlay } from "@/content/tailor";
import { getUserRecord } from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { renderCv } from "@/lib/cv-pdf";
import { env } from "@/lib/env";
import { getDraft } from "@/lib/site";
import { tailored } from "@/lib/store";

const Body = z.object({
  /** A saved version, or the overlay being reviewed (not saved yet). */
  id: z.string().max(64).optional(),
  overlay: z.unknown().optional(),
  label: z.string().max(80).optional(),
  template: z.string().max(40).optional(),
});

/**
 * One tailored CV as a PDF, in any of the layouts, from the owner's saved page with the version laid over it. A saved
 * version or one still being reviewed; either way nothing is stored and the page is not changed. Private and never
 * cached: it is the owner's own document.
 */
export async function POST(request: Request): Promise<Response> {
  const email = (await auth())?.user?.email?.toLowerCase();
  const account = email ? await getUserRecord(email) : null;
  if (!account) return NextResponse.json({ error: "Sign in again to download your CV." }, { status: 401 });

  const body = Body.safeParse(await request.json().catch(() => null));
  if (!body.success) return NextResponse.json({ error: "Choose a version to download." }, { status: 400 });
  const draft = await getDraft(account.slug);
  if (!draft) return NextResponse.json({ error: "We could not find your page." }, { status: 404 });

  let overlay: TailorOverlay;
  let label = body.data.label ?? "";
  if (body.data.id) {
    const saved = await tailored().get(account.slug, body.data.id);
    if (!saved) return NextResponse.json({ error: "That version no longer exists." }, { status: 404 });
    overlay = saved.overlay;
    label = saved.name;
  } else {
    const parsed = TailorOverlay.safeParse(body.data.overlay);
    if (!parsed.success)
      return NextResponse.json({ error: "Some details in this version need fixing." }, { status: 400 });
    overlay = parsed.data;
  }

  const template = parseCvTemplate(body.data.template ?? null) ?? offeredCvTemplates(draft.settings)[0] ?? "modern";
  const origin = (env().NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin).replace(/\/$/, "");
  const pdf = await renderCv(
    cvModel(cvSite(draft, reconcileOverlay(draft, overlay)), `${origin}/${account.slug}`),
    template,
  );

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${tailoredFileName(draft.profile.name, label)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
