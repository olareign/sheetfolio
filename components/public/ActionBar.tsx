import { MessageCircle, Phone } from "lucide-react";
import { Button } from "@/components/sp/Button";
import { telLink } from "@/lib/whatsapp";
import { whatsappHref, type PageContext } from "./view-model";

/** Phone-only sticky bar: WhatsApp (2/3) + Call (1/3) (PRD §3.1 mobile). */
export function ActionBar({ site, context }: PageContext & { context?: string }) {
  const { whatsapp, phone, firstName } = site.profile;
  if (!whatsapp && !phone) return null;
  return (
    <div className={`pp-bar${whatsapp && phone ? "" : " pp-bar--single"}`}>
      {whatsapp && (
        <Button
          href={whatsappHref(site, context)}
          variant="cta"
          target="_blank"
          rel="noopener"
          icon={<MessageCircle size={18} strokeWidth={1.5} aria-hidden="true" />}
        >
          WhatsApp {firstName}
        </Button>
      )}
      {phone && (
        <Button href={telLink(phone)} icon={<Phone size={18} strokeWidth={1.5} aria-hidden="true" />}>
          Call
        </Button>
      )}
    </div>
  );
}
