import { MessageCircle } from "lucide-react";
import Link from "next/link";
import { MobileMenu } from "@/components/MobileMenu";
import { Button } from "@/components/sp/Button";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import { initials } from "@/content/derive";
import { whatsappHref, type PageContext } from "./view-model";

/** Header bar (PRD §3.1.1). The WhatsApp button is outlined so the hero keeps the one orange CTA. */
export function SiteHeader({ site, basePath }: PageContext) {
  const hasWhatsApp = Boolean(site.profile.whatsapp);
  return (
    <header className="pp-header">
      <div className="pp-wrap pp-header-inner">
        <Link href={basePath} className="pp-brand">
          <span className="pp-monogram" aria-hidden="true">
            {initials(site.profile.name)}
          </span>
          <span className="pp-brand-name">{site.profile.name}</span>
        </Link>
        <nav className="pp-nav" aria-label="Page sections">
          <a href={`${basePath}#projects`}>Projects</a>
          <a href={`${basePath}#experience`}>Experience</a>
          <a href={`${basePath}#credentials`}>Credentials</a>
          {hasWhatsApp && (
            <Button
              href={whatsappHref(site)}
              size="sm"
              target="_blank"
              rel="noopener"
              icon={<MessageCircle size={16} strokeWidth={1.5} aria-hidden="true" />}
            >
              WhatsApp
            </Button>
          )}
        </nav>
        <ThemeToggle fallback={site.settings.theme} />
        <MobileMenu
          className="pp-menu"
          label="Page sections"
          links={[
            { href: `${basePath}#projects`, label: "Projects" },
            { href: `${basePath}#experience`, label: "Experience" },
            { href: `${basePath}#credentials`, label: "Credentials" },
            { href: `${basePath}#contact`, label: "Contact" },
          ]}
          footer={
            hasWhatsApp ? (
              <Button
                href={whatsappHref(site)}
                variant="primary"
                target="_blank"
                rel="noopener"
                icon={<MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />}
              >
                WhatsApp {site.profile.firstName}
              </Button>
            ) : undefined
          }
        />
      </div>
    </header>
  );
}
