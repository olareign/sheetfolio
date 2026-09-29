import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProfilePage } from "@/components/public/ProfilePage";
import { getPublished } from "@/lib/site";
import "@/styles/public.css";

type Props = { params: Promise<{ slug: string }> };

// No paths at build time; each page is rendered on first visit, cached, and purged by the
// `site:{slug}` tag when the engineer publishes (PRD §4.3). Zero Redis reads while cached.
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  return [];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const site = await getPublished((await params).slug);
  if (!site) return {};
  const { name, headline, location, summary } = site.profile;
  // TODO(day 5): Open Graph image and sitemap.
  return {
    title: { absolute: `${name} · ${headline}` },
    description: summary ? summary.slice(0, 160) : `${headline} based in ${location}.`,
  };
}

export default async function PublicProfile({ params }: Props) {
  const { slug } = await params;
  const site = await getPublished(slug);
  if (!site) notFound(); // unknown, unpublished and suspended sites all 404 (PRD §8.1)
  return <ProfilePage site={site} slug={slug} basePath={`/${slug}`} />;
}
