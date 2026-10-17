import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PreviewBanner } from "@/components/public/PreviewBanner";
import { ProjectPage } from "@/components/public/ProjectPage";
import { getCmsContext } from "@/lib/cms-data";
import "@/styles/public.css";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

export default async function PreviewProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { account, draft, published } = await getCmsContext();
  const project = draft.projects.find((p) => p.id === id);
  if (!project) notFound();
  return (
    <>
      <PreviewBanner live={Boolean(published)} />
      <ProjectPage site={draft} project={project} slug={account.slug} basePath="/preview" preview />
    </>
  );
}
