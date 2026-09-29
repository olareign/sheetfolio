import Link from "next/link";
import { yearRange } from "@/content/cms";
import { chainageRange, isServiceRole } from "@/content/derive";
import type { PageContext } from "./view-model";

/** Experience as a chainage timeline (PRD §3.1.4). The current role gets the safety-orange station. */
export function Experience({ site, basePath }: PageContext) {
  if (site.experiences.length === 0) return null;
  const range = chainageRange(site);
  return (
    <section id="experience" className="pp-section" aria-labelledby="experience-title">
      <div className="pp-wrap pp-split">
        <div className="pp-section-head pp-section-head--stack">
          {range && (
            <span className="sp-label">
              Chainage · {range.from} → {range.to}
            </span>
          )}
          <h2 id="experience-title" className="sp-heading">
            Experience
          </h2>
        </div>
        <ol className="sp-chainage pp-list-reset">
          {site.experiences.map((e) => {
            const current = e.endYear === undefined;
            const modifier = current ? " sp-station--current" : isServiceRole(e) ? " sp-station--service" : "";
            const projects = site.projects.filter((p) => p.experienceId === e.id);
            return (
              <li key={e.id} className={`sp-station pp-station${modifier}`}>
                <div className="pp-station-head">
                  <h3 className="sp-body-strong">{e.company}</h3>
                  <span className="sp-annot">{yearRange(e.startYear, e.endYear)}</span>
                </div>
                <p>
                  {e.role}
                  {current && <span className="sp-label"> · Current</span>}
                </p>
                {e.notes && <p className="sp-annot">{e.notes}</p>}
                {projects.length > 0 && (
                  <ul aria-label={`Projects at ${e.company}`}>
                    {projects.map((p) => (
                      <li key={p.id}>
                        <Link href={`${basePath}/projects/${p.id}`}>
                          <span className="sp-annot">{p.drawingNo}</span>
                          {p.title}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
