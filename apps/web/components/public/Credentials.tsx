import { ExternalLink } from "lucide-react";
import { Stamp } from "@/components/sp/Stamp";
import { yearRange } from "@/content/cms";
import type { PageContext } from "./view-model";

/** Credentials (PRD §3.1.5): certifications, education, research, then competencies. */
export function Credentials({ site }: PageContext) {
  const { certifications, education, research, competencies } = site;
  if (!certifications.length && !education.length && !research && !competencies.length) return null;
  const topEducation = education[0];

  return (
    <section id="credentials" className="pp-section" aria-labelledby="credentials-title">
      <div className="pp-wrap">
        <div className="pp-section-head">
          <div>
            <span className="sp-label">Approvals &amp; qualifications</span>
            <h2 id="credentials-title" className="sp-heading">
              Credentials
            </h2>
          </div>
        </div>
        <div className="pp-creds">
          {certifications.map((c) => (
            <article key={c.id} className="pp-cred">
              <Stamp
                title={c.shortTitle}
                sub={`Certified · ${c.year}`}
                href={c.fileUrl}
                label={`${c.title} certificate`}
              />
              <span className="sp-label">Certification · {c.year}</span>
              <h3>{c.title}</h3>
              <p className="sp-annot">{c.issuer}</p>
              {c.fileUrl && (
                <a href={c.fileUrl} target="_blank" rel="noopener" className="sp-annot">
                  View certificate <ExternalLink size={14} strokeWidth={1.5} aria-hidden="true" />
                </a>
              )}
            </article>
          ))}
          {topEducation && (
            <article className="pp-cred">
              <Stamp
                title={topEducation.qualification.split(/[\s,]/)[0] ?? topEducation.qualification}
                sub={`Graduated · ${topEducation.endYear}`}
                tone="cured"
              />
              <span className="sp-label">Education</span>
              <ul>
                {education.map((e) => (
                  <li key={e.id}>
                    <h3>{e.qualification}</h3>
                    <p className="sp-annot">
                      {e.institution} · {yearRange(e.startYear, e.endYear)}
                    </p>
                  </li>
                ))}
              </ul>
            </article>
          )}
          {research && (
            <article className="pp-cred">
              <span className="sp-label">Research · {research.year}</span>
              <h3>{research.title}</h3>
              {research.summary && <p>{research.summary}</p>}
            </article>
          )}
        </div>
        {competencies.length > 0 && (
          <ol className="pp-competencies" aria-label="Core competencies">
            {competencies.slice(0, 6).map((c, i) => (
              <li key={c}>
                <span className="sp-label">{String(i + 1).padStart(2, "0")}</span>
                {c}
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
