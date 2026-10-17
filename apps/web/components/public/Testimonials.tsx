import type { PageContext } from "./view-model";

/** Shown only when at least one testimonial exists (PRD §3.1.6). */
export function Testimonials({ site }: PageContext) {
  if (site.testimonials.length === 0) return null;
  return (
    <section className="pp-section" aria-labelledby="testimonials-title">
      <div className="pp-wrap">
        <div className="pp-section-head">
          <div>
            <span className="sp-label">Endorsements</span>
            <h2 id="testimonials-title" className="sp-heading">
              Testimonials
            </h2>
          </div>
        </div>
        <div className="pp-quotes">
          {site.testimonials.map((t) => (
            <figure key={t.id} className="pp-quote">
              <blockquote>{t.body}</blockquote>
              <figcaption className="sp-annot">{[t.author, t.role, t.company].filter(Boolean).join(" · ")}</figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}
