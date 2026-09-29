import { Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/sp/Button";
import { Field } from "@/components/sp/Field";
import { visibleReferees } from "@/content/derive";
import { cvHref, whatsappHref, type PageContext } from "./view-model";

/** Contact (PRD §3.1.7): always in the Blueprint theme, on the drafting grid. */
export function Contact({ site, slug }: PageContext) {
  const { profile } = site;
  const referees = visibleReferees(site);
  return (
    <section
      id="contact"
      data-theme="blueprint"
      className="pp-section pp-contact sp-grid-bg"
      aria-labelledby="contact-title"
    >
      <div className="pp-wrap pp-contact-grid">
        <div className="pp-contact-intro">
          <div>
            <span className="sp-label">Issued for enquiry</span>
            <h2 id="contact-title" className="sp-heading">
              Discuss your project with {profile.firstName}
            </h2>
          </div>
          <p>Send the scope, location and timeline. {profile.firstName} replies by WhatsApp or email.</p>
          <div className="pp-actions">
            {profile.whatsapp && (
              <Button
                href={whatsappHref(site)}
                variant="cta"
                className="pp-hide-sm"
                target="_blank"
                rel="noopener"
                icon={<MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />}
              >
                WhatsApp {profile.firstName}
              </Button>
            )}
            <Button href={cvHref(slug)} native icon={<Download size={18} strokeWidth={1.5} aria-hidden="true" />}>
              Download CV
            </Button>
          </div>
          {referees.length > 0 ? (
            <div>
              <span className="sp-label">Referees</span>
              <ul className="pp-referees">
                {referees.map((r) => (
                  <li key={r.id} className="sp-annot">
                    {[r.name, r.role, r.organisation, r.phone].filter(Boolean).join(" · ")}
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="sp-annot">References available on request.</p>
          )}
        </div>
        <div className="pp-panel">
          {/* TODO(day 4): wire to the enquiry Server Action (Resend + lead storage + rate limit). */}
          <form className="pp-form" aria-labelledby="contact-title" aria-describedby="enquiry-note">
            <Field id="enquiry-name" label="Name" required>
              <input id="enquiry-name" name="name" className="sp-input" autoComplete="name" required />
            </Field>
            <Field id="enquiry-email" label="Email" required>
              <input id="enquiry-email" name="email" type="email" className="sp-input" autoComplete="email" required />
            </Field>
            <Field id="enquiry-company" label="Company / project">
              <input id="enquiry-company" name="company" className="sp-input" autoComplete="organization" />
            </Field>
            <Field id="enquiry-message" label="Message" required>
              <textarea id="enquiry-message" name="message" className="sp-input" rows={5} required />
            </Field>
            <div>
              <Button type="submit" variant="primary" disabled>
                Send enquiry
              </Button>
            </div>
            <p id="enquiry-note" className="sp-field-hint">
              The enquiry form opens soon. Until then, use WhatsApp.
            </p>
          </form>
        </div>
      </div>
    </section>
  );
}
