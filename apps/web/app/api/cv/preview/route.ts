import { cvFileName, cvModel } from "@/content/cv";
import { offeredCvTemplates, parseCvTemplate } from "@/content/cv-templates";
import { getUserRecord } from "@/lib/accounts";
import { auth } from "@/lib/auth";
import { renderCv } from "@/lib/cv-pdf";
import { env } from "@/lib/env";
import { getDraft } from "@/lib/site";

/**
 * The signed-in owner's CV from their saved draft, in any of the four layouts, shown inline in the dashboard
 * (Dashboard → CV). Never cached or indexed: it is private and changes with every save. Visitors get the published
 * CV from /api/cv/{slug} instead.
 */
export async function GET(request: Request): Promise<Response> {
  const email = (await auth())?.user?.email?.toLowerCase();
  if (!email) return new Response("Sign in to preview your CV", { status: 401 });
  const account = await getUserRecord(email);
  const draft = account ? await getDraft(account.slug) : null;
  if (!account || !draft) return new Response("Not found", { status: 404 });

  const requested = parseCvTemplate(new URL(request.url).searchParams.get("template"));
  const template = requested ?? offeredCvTemplates(draft.settings)[0] ?? "modern";
  const origin = env().NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const pdf = await renderCv(cvModel(draft, `${origin.replace(/\/$/, "")}/${account.slug}`), template);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${cvFileName(draft.profile.name, template)}"`,
      "Cache-Control": "private, no-store",
      "X-Robots-Tag": "noindex",
    },
  });
}
