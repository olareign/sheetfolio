import { Globe } from "lucide-react";
import Link from "next/link";
import type { Cover } from "@/content/covers";
import { CATEGORY_LABELS, type Category } from "@/content/schemas";
import { CoverImage } from "./CoverImage";
import { MediaFrame } from "./MediaFrame";
import { StatusTag } from "./Tag";

export type ProjectCardData = {
  id: string;
  title: string;
  category: Category;
  status: "completed" | "ongoing";
  years: string;
  /** "Employer · Location" line. */
  meta: string;
  cover: Cover;
  /** Host of the project's website, e.g. "acme.com". */
  websiteHost?: string;
};

/** Project card: picture on top, then title, where it was, and its status. Same height in a row. */
export function ProjectCard({ project, href }: { project: ProjectCardData; href: string }) {
  return (
    <Link className="sp-card" href={href}>
      <MediaFrame>
        <CoverImage cover={project.cover} sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 400px" />
        <span className="sp-media-chip">{CATEGORY_LABELS[project.category]}</span>
        {project.cover.kind === "stock" && <span className="sp-media-note">Stock photo</span>}
      </MediaFrame>
      <div className="sp-card-body">
        <h3 className="sp-card-title">{project.title}</h3>
        <div className="sp-annot sp-card-meta-line">{project.meta}</div>
        <div className="sp-card-meta">
          <StatusTag status={project.status} />
          {project.websiteHost && (
            <span className="sp-card-site">
              <Globe size={13} strokeWidth={1.75} aria-hidden="true" />
              {project.websiteHost}
            </span>
          )}
          <span className="sp-annot">{project.years}</span>
        </div>
      </div>
    </Link>
  );
}
