import Image from "next/image";
import Link from "next/link";
import { CATEGORY_LABELS, type Category } from "@/content/schemas";
import { CropFrame } from "./CropFrame";
import { Placeholder } from "./Placeholder";
import { StatusTag, Tag } from "./Tag";

export type ProjectCardData = {
  id: string;
  drawingNo: string;
  title: string;
  category: Category;
  status: "completed" | "ongoing";
  years: string;
  /** "Employer · Location" line. */
  meta: string;
  cover?: { url: string; alt: string };
};

/** DESIGN §7.6. */
export function ProjectCard({ project, href }: { project: ProjectCardData; href: string }) {
  return (
    <Link className="sp-card" href={href}>
      <CropFrame no={project.drawingNo} pending={!project.cover}>
        {project.cover ? (
          <Image
            src={project.cover.url}
            alt={project.cover.alt}
            fill
            sizes="(max-width: 640px) 100vw, (max-width: 900px) 50vw, 400px"
          />
        ) : (
          <Placeholder category={project.category} />
        )}
      </CropFrame>
      <div className="sp-card-body">
        <h3 className="sp-card-title">{project.title}</h3>
        <div className="sp-annot">{project.meta}</div>
        <div className="sp-card-meta">
          <Tag>{CATEGORY_LABELS[project.category]}</Tag>
          <StatusTag status={project.status} />
          <span className="sp-annot">{project.years}</span>
        </div>
      </div>
    </Link>
  );
}
