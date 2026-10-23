import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfilePage } from "@/components/public/ProfilePage";
import { publicSiteUrl } from "@/lib/env";
import { jsonLd, pageDescription, personJsonLd } from "@/lib/seo";
import { getPublished } from "@/lib/site";
import "@/styles/public.css";

type Props = { params: Promise<{ slug: string }> };

// No paths at build time; each page is rendered on first visit, cached, and purged by the
// `site:{slug}` tag when the engineer publishes (PRD §4.3). Zero Redis reads while cached.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const site = await getPublished(slug);
  if (!site) return {};
  const { name, headline, firstName } = site.profile;
  const description = pageDescription(site);
  const title = `${name} · ${headline}`;
  // The link-preview picture comes from ./opengraph-image.tsx: the person's photo with their name and headline.
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/${slug}` },
    openGraph: {
      title,
      description,
      type: "profile",
      url: `/${slug}`,
      firstName,
      lastName: name.replace(firstName, "").trim() || undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function PublicProfile({ params }: Props) {
  const { slug } = await params;
  const site = await getPublished(slug);
  if (!site) notFound(); // unknown, unpublished and suspended sites all 404 (PRD §8.1)
  const url = new URL(`/${slug}`, publicSiteUrl()).toString();
  return (
    <>
      <script
        type="application/ld+json"
        // Structured data for search engines: who this page is about.
        dangerouslySetInnerHTML={{ __html: jsonLd(personJsonLd(site, url)) }}
      />
      <ProfilePage site={site} slug={slug} basePath={`/${slug}`} />
    </>
  );
}
