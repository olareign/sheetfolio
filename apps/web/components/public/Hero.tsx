import { Mail, MessageCircle } from "lucide-react";
import { Button } from "@/components/sp/Button";
import { DimensionLine } from "@/components/sp/DimensionLine";
import { Stamp } from "@/components/sp/Stamp";
import { TitleBlock, type TitleBlockCell } from "@/components/sp/TitleBlock";
import { currentRole, heroFigures, scopeOfWork, visiblePrivate } from "@/content/derive";
import { CvDownload } from "./CvDownload";
import { whatsappHref, type PageContext } from "./view-model";

export function Hero({ site, slug }: PageContext) {
  const { profile } = site;
  const current = currentRole(site);
  const cells: TitleBlockCell[] = [
    { label: "Name", value: profile.name },
    { label: "Role", value: profile.headline },
    { label: "Based in", value: profile.location },
    { label: "Qualification", value: site.education[0]?.qualification ?? "" },
    ...visiblePrivate(site).map((p) => ({ ...p, wide: true })),
    { label: "What I do", value: scopeOfWork(site), wide: true },
    { label: "Current", value: current ? `${current.role}, ${current.company}` : "", wide: true },
  ];
  const labelParts = [profile.headline, profile.location, profile.availability].filter(Boolean);

  return (
    <section className="pp-hero sp-grid-bg" aria-labelledby="hero-name">
      <div className="pp-wrap pp-hero-grid">
        <div className="pp-hero-main">
          <p className="sp-label pp-hero-label">{labelParts.join(" · ")}</p>
          <h1 id="hero-name" className="sp-display-xl">
            {profile.name}
          </h1>
          {profile.summary && <p className="sp-lead">{profile.summary}</p>}
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
            <Button href="#contact" variant="primary" icon={<Mail size={18} strokeWidth={1.5} aria-hidden="true" />}>
              Send an email
            </Button>
            <CvDownload slug={slug} publishedAt={site.publishedAt} />
          </div>
          <div className="pp-figures">
            {heroFigures(site).map((f) => (
              <DimensionLine key={f.caption} figure={f.figure} caption={f.caption} />
            ))}
          </div>
        </div>
        <div className="pp-hero-side">
          <TitleBlock cells={cells} />
          {site.certifications.length > 0 && (
            <div className="pp-stamps">
              {site.certifications.slice(0, 2).map((c) => (
                <Stamp key={c.id} title={c.shortTitle} sub={`Certified · ${c.year}`} label={`${c.title}, ${c.year}`} />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
