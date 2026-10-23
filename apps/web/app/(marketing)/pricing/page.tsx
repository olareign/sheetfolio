import type { Metadata } from "next";
import { CtaBand, Faq, PageHead, Plans, Section, SectionHead } from "@/components/marketing/Sections";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free while we test. Paid plans are planned and shown here so you know what is coming.",
};

// Hidden for now: next.config.ts redirects /pricing to the home page until plans are settled. Delete the redirect to show it.
export default function PricingPage() {
  return (
    <>
      <PageHead
        eyebrow="Pricing"
        title="Free while we test, simple after"
        lead="Starter is free now. Paid plans are planned and shown here so you know what is coming."
      />
      <Section>
        <Plans />
      </Section>
      <Section id="questions" labelledBy="faq-title">
        <SectionHead eyebrow="Questions" id="faq-title" title="Before you sign up" />
        <Faq />
      </Section>
      <CtaBand />
    </>
  );
}
