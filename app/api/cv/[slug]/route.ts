import { cvFileName, cvModel } from "@/content/cv";
import { renderCv } from "@/lib/cv-pdf";
import { env } from "@/lib/env";
import { getPublished } from "@/lib/site";

/**
 * CV PDF from the published document (PRD §3.5). Links carry `?v={publishedAt}`: a request for the
 * current version is cached forever by the CDN, and a new publish produces a new URL.
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }): Promise<Response> {
  const { slug } = await params;
  const site = await getPublished(slug);
  if (!site) return new Response("Not found", { status: 404 });

  const origin = env().NEXT_PUBLIC_SITE_URL ?? new URL(request.url).origin;
  const pdf = await renderCv(cvModel(site, `${origin.replace(/\/$/, "")}/${slug}`));
  const current = new URL(request.url).searchParams.get("v") === site.publishedAt;

  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${cvFileName(site.profile.name)}"`,
      "Cache-Control": current ? "public, max-age=31536000, immutable" : "public, max-age=0, s-maxage=300",
    },
  });
}
