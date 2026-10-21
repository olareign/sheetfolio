import { cvFileName, cvModel } from "@/content/cv";
import { parseCvTemplate } from "@/content/cv-templates";
import { renderCv } from "@/lib/cv-pdf";
import { env } from "@/lib/env";
import { getPublished } from "@/lib/site";

/**
 * CV PDF from the published document (PRD §3.5), in the layout asked for by `?template=`. Links carry
 * `?v={publishedAt}`: a request for the current version is cached forever by the CDN, and a new publish
 * produces a new URL. Each template is its own URL, so each is cached separately.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const site = await getPublished(slug);
  if (!site) return new Response("Not found", { status: 404 });

  const query = new URL(request.url).searchParams;
  // ?template=classic|modern|projects|minimal; anything else gets the page owner's default.
  const template = parseCvTemplate(query.get("template")) ?? site.settings.cvTemplate;
  const origin = env().NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const pdf = await renderCv(cvModel(site, `${origin.replace(/\/$/, "")}/${slug}`), template);
  const current = query.get("v") === site.publishedAt;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${cvFileName(site.profile.name, template)}"`,
      "Cache-Control": current ? "public, max-age=31536000, immutable" : "public, max-age=0, s-maxage=300",
    },
  });
}
