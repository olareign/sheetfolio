import type { Metadata } from "next";
import { PageHead, Section } from "@/components/marketing/Sections";
import { PRIVACY, PRIVACY_UPDATED } from "@/content/privacy";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "What personal data Dosinex collects, why, who helps us handle it, how long we keep it, and your rights.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  const email = env().SUPPORT_EMAIL;
  return (
    <>
      <PageHead
        eyebrow="Privacy"
        title="Privacy policy"
        lead={`How we handle your personal data. Last updated ${PRIVACY_UPDATED}.`}
      />
      <Section>
        <div className="mk-legal">
          <nav className="mk-legal-toc" aria-label="On this page">
            <b>On this page</b>
            <ol>
              {PRIVACY.map((s) => (
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
            {PRIVACY.map((s) => (
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
              <p>
                For questions about this policy or to use any of your rights,{" "}
                {email ? (
                  <>
                    email <a href={`mailto:${email}`}>{email}</a>.
                  </>
                ) : (
                  "write to us through the contact details published on this website."
                )}{" "}
                Please include the email address or page address your account uses so we can find it.
              </p>
            </section>
          </article>
        </div>
      </Section>
    </>
  );
}
