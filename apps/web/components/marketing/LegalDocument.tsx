import type { ReactNode } from "react";
import type { PrivacySection } from "@/content/privacy";
import { PageHead, Section } from "./Sections";

/** A legal page: a contents list beside numbered sections, and a contact section at the end. Shared by the privacy
 * policy and the terms of service so they read and behave the same. */
export function LegalDocument({
  eyebrow,
  title,
  lead,
  sections,
  contact,
}: {
  eyebrow: string;
  title: string;
  lead: string;
  sections: readonly PrivacySection[];
  contact: ReactNode;
}) {
  return (
    <>
      <PageHead eyebrow={eyebrow} title={title} lead={lead} />
      <Section>
        <div className="mk-legal">
          <nav className="mk-legal-toc" aria-label="On this page">
            <b>On this page</b>
            <ol>
              {sections.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`}>{s.title}</a>
                </li>
              ))}
              <li>
                <a href="#contact">Contact us</a>
              </li>
            </ol>
          </nav>
          <article className="mk-legal-body">
            {sections.map((s) => (
              <section key={s.id} id={s.id} aria-labelledby={`${s.id}-h`}>
                <h2 id={`${s.id}-h`}>{s.title}</h2>
                {s.blocks.map((b, i) =>
                  "p" in b ? (
                    <p key={i}>{b.p}</p>
                  ) : (
                    <ul key={i}>
                      {b.ul.map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  ),
                )}
              </section>
            ))}
            <section id="contact" aria-labelledby="contact-h">
              <h2 id="contact-h">Contact us</h2>
              <p>{contact}</p>
            </section>
          </article>
        </div>
      </Section>
    </>
  );
}
