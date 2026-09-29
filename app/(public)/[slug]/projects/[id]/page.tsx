import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectPage } from "@/components/public/ProjectPage";
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
  return {
    title: { absolute: `${project.title} · ${site.profile.name}` },
    description: project.scope
      ? project.scope.slice(0, 160)
      : `${project.drawingNo}: ${project.title}, ${project.location}.`,
  };
}

export default async function PublicProject({ params }: Props) {
  const data = await load(params);
  if (!data) notFound();
  return <ProjectPage site={data.site} project={data.project} slug={data.slug} basePath={`/${data.slug}`} />;
}
