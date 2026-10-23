import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectPage } from "@/components/public/ProjectPage";
import { currentPreview, projectCover } from "@/content/covers";
import { getPublished } from "@/lib/site";
import "@/styles/public.css";

type Props = { params: Promise<{ slug: string; id: string }> };

export async function generateStaticParams(): Promise<{ slug: string; id: string }[]> {
  return [];
}

async function load(params: Props["params"]) {
  const { slug, id } = await params;
  const site = await getPublished(slug);
  const project = site?.projects.find((p) => p.id === id);
  return site && project ? { site, project, slug } : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const data = await load(params);
  if (!data) return {};
  const { site, project } = data;
  const description = (
    project.scope ||
    currentPreview(project)?.description ||
    `${project.title}, ${project.location}.`
  ).slice(0, 160);
  const cover = projectCover(project);
  const title = `${project.title} · ${site.profile.name}`;
  return {
    title: { absolute: title },
    description,
    openGraph: { title, description, type: "article", images: [{ url: cover.url, alt: cover.alt }] },
    twitter: { card: "summary_large_image", title, description, images: [cover.url] },
  };
}

export default async function PublicProject({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  return <ProjectPage site={data.site} project={data.project} slug={data.slug} basePath={`/${data.slug}`} />;
}
