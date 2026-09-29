import { Download, MessageCircle } from "lucide-react";
import { Button } from "@/components/sp/Button";
import { visibleReferees } from "@/content/derive";
import { EnquiryForm } from "./EnquiryForm";
import { cvHref, whatsappHref, type PageContext } from "./view-model";

/** Contact (PRD §3.1.7): always in the Blueprint theme, on the drafting grid. */
export function Contact({ site, slug, preview }: PageContext) {
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
            <Button
              href={cvHref(slug, site.publishedAt)}
              native
              icon={<Download size={18} strokeWidth={1.5} aria-hidden="true" />}
            >
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
          <EnquiryForm slug={slug} firstName={profile.firstName} disabled={preview} />
        </div>
      </div>
    </section>
  );
}
