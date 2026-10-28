import type { Metadata } from "next";
import Link from "next/link";
import { LegalDocument } from "@/components/marketing/LegalDocument";
import { TERMS, TERMS_UPDATED } from "@/content/terms";
import { env } from "@/lib/env";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The rules for using Dosinex: your account, your content, what is not allowed, and what we promise.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  const email = env().SUPPORT_EMAIL;
  return (
    <LegalDocument
      eyebrow="Terms"
      title="Terms of service"
      lead={`The rules for using Dosinex. Last updated ${TERMS_UPDATED}.`}
      sections={TERMS}
      contact={
        <>
          For questions about these terms,{" "}
          {email ? (
            <>
              email <a href={`mailto:${email}`}>{email}</a>.
            </>
          ) : (
            "write to us through the contact details published on this website."
          )}{" "}
          How we handle your personal data is explained in our <Link href="/privacy">Privacy policy</Link>.
        </>
      }
    />
  );
}
