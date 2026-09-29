import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/sp/Button";
import { SpecTable } from "@/components/sp/SpecTable";
import { StatusTag, Tag } from "@/components/sp/Tag";
import { TitleBlock } from "@/components/sp/TitleBlock";
import { employerOf, projectYears } from "@/content/derive";
import { CATEGORY_LABELS, type Project } from "@/content/schemas";
import { ActionBar } from "./ActionBar";
import { Gallery } from "./Gallery";
import { SiteFooter } from "./SiteFooter";
import { SiteHeader } from "./SiteHeader";
import { whatsappHref, type PageContext } from "./view-model";

/** Project detail (PRD §3.2). */
export function ProjectPage({ project, ...ctx }: PageContext & { project: Project }) {
  const { site, basePath } = ctx;
  const employer = employerOf(site, project)?.company;
  const years = projectYears(project);
  const index = site.projects.findIndex((p) => p.id === project.id);
  const prev = site.projects[index - 1];
  const next = site.projects[index + 1];
  const context = `${project.drawingNo} ${project.title}`;

  return (
    <div className="pp" data-theme={site.settings.theme}>
      <SiteHeader {...ctx} sheet={project.drawingNo} />
      <main>
        <section className="sp-grid-bg" aria-labelledby="project-title">
          <div className="pp-wrap pp-proj-head">
            <div className="pp-crumbs">
              <span className="sp-label">/ Projects / {project.drawingNo}</span>
              <Link href={`${basePath}#projects`} className="sp-annot">
                ← All projects
              </Link>
            </div>
            <div className="pp-proj-tags">
              <Tag>{CATEGORY_LABELS[project.category]}</Tag>
              <StatusTag status={project.status} />
            </div>
            <h1 id="project-title" className="sp-display-lg">
              {project.title}
            </h1>
            {/* A drawing title block keeps every cell; unknown values show "—". */}
            {/* TODO(product): optional dimension figure (e.g. storeys) needs a field on Project. */}
            <TitleBlock
              columns={6}
              cells={[
                { label: "Drawing no.", value: project.drawingNo, mono: true },
                { label: "Client", value: project.client ?? "—" },
                { label: "Contractor", value: employer ?? "—" },
                { label: "Location", value: project.location },
                { label: "Role", value: project.role },
                { label: "Year", value: years, mono: true },
              ]}
            />
          </div>
        </section>
        <section className="pp-section" aria-label="Project details">
          <div className="pp-wrap pp-proj-body">
            <Gallery images={project.images} category={project.category} title={project.title} />
            <div className="pp-side">
              {project.scope && (
                <div>
                  <h2>Scope of work</h2>
                  <p>{project.scope}</p>
                </div>
              )}
              <SpecTable
                caption="Project specification"
                rows={[
                  ["Client", project.client],
                  ["Contractor", employer],
                  ["Location", project.location],
                  ["Role", project.role],
                  ["Category", CATEGORY_LABELS[project.category]],
                  ["Status", project.status === "ongoing" ? "Ongoing" : "Completed"],
                  ["Year", years],
                  [
                    "Coordinates",
                    project.lat !== undefined && project.lng !== undefined
                      ? `${project.lat}, ${project.lng}`
                      : undefined,
                  ],
                ]}
              />
              {site.profile.whatsapp && (
                <div className="pp-panel pp-hide-sm">
                  <h2>Building something similar?</h2>
                  <p className="pp-panel-text">
                    Ask {site.profile.firstName} about {project.drawingNo} or your own project.
                  </p>
                  <Button
                    href={whatsappHref(site, context)}
                    variant="cta"
                    target="_blank"
                    rel="noopener"
                    icon={<MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />}
                  >
                    WhatsApp {site.profile.firstName}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
        {(prev || next) && (
          <nav className="pp-wrap pp-pager" aria-label="Other projects">
            {prev ? (
              <Link href={`${basePath}/projects/${prev.id}`}>
                <span className="sp-label">← Previous · {prev.drawingNo}</span>
                <b>{prev.title}</b>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link href={`${basePath}/projects/${next.id}`} className="pp-pager-next">
                <span className="sp-label">Next · {next.drawingNo} →</span>
                <b>{next.title}</b>
              </Link>
            )}
          </nav>
        )}
      </main>
      <SiteFooter {...ctx} />
      <ActionBar {...ctx} context={context} />
    </div>
  );
}
