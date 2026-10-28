import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/marketing/LegalDocument";
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
    <LegalDocument
      eyebrow="Privacy"
      title="Privacy policy"
      lead={`How we handle your personal data. Last updated ${PRIVACY_UPDATED}.`}
      sections={PRIVACY}
      contact={
        <>
          For questions about this policy or to use any of your rights,{" "}
          {email ? (
            <>
              email <a href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            "write to us through the contact details published on this website."
          )}{" "}
          Please include the email address or page address your account uses so we can find it. The rules for using
          Dosinex are in our <Link href="/terms">Terms of service</Link>.
        </>
      }
    />
  );
}
