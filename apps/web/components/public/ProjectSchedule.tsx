"use client";

import { useState } from "react";
import { Button } from "@/components/sp/Button";
import { ProjectCard, type ProjectCardData } from "@/components/sp/ProjectCard";
import { CATEGORY_LABELS, type Category } from "@/content/schemas";

const INITIAL = 6;

/** Projects section body: category filter + first six cards + "View all N sheets" (PRD §3.1.3). */
export function ProjectSchedule({ projects, basePath }: { projects: ProjectCardData[]; basePath: string }) {
  const [filter, setFilter] = useState<Category | null>(null);
  const [showAll, setShowAll] = useState(false);
  const categories = [...new Set(projects.map((p) => p.category))];
  const matching = filter ? projects.filter((p) => p.category === filter) : projects;
  const visible = showAll ? matching : matching.slice(0, INITIAL);

  const tag = (value: Category | null, label: string) => (
    <button
      key={label}
      type="button"
      className={`sp-tag${filter === value ? " sp-tag--active" : ""}`}
      aria-pressed={filter === value}
      onClick={() => setFilter(value)}
    >
      {label}
    </button>
  );

  return (
    <>
      {categories.length > 1 && (
        <div className="pp-filters" role="group" aria-label="Filter projects by category">
          {tag(null, "All")}
          {categories.map((c) => tag(c, CATEGORY_LABELS[c]))}
        </div>
      )}
      <p className="sp-visually-hidden" aria-live="polite">
        Showing {visible.length} of {matching.length} projects
      </p>
      <div className="pp-grid">
        {visible.map((p) => (
          <ProjectCard key={p.id} project={p} href={`${basePath}/projects/${p.id}`} />
        ))}
      </div>
      {!showAll && matching.length > INITIAL && (
        <div className="pp-more">
          <Button onClick={() => setShowAll(true)}>View all {matching.length} sheets</Button>
        </div>
      )}
    </>
  );
}
