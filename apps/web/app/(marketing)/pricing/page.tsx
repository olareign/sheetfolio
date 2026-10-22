import type { Metadata } from "next";
import { CtaBand, Faq, PageHead, Plans, QuoteGrid, SampleNote, Section, SectionHead } from "@/components/marketing/Sections";
import { QUOTES } from "@/content/marketing";

export const metadata: Metadata = {
  title: "Pricing",
  description: "Free while we test. Paid plans are planned and shown here so you know what is coming.",
};

export default function PricingPage() {
  return (
    <>
      <PageHead eyebrow="Pricing" title="Free while we test, simple after" lead="Starter is free now. Paid plans are planned and shown here so you know what is coming." />
      <Section>
        <Plans />
      </Section>
      <Section tint deco={["blob"]} labelledBy="why-title">
        <SectionHead eyebrow="Testimonials" id="why-title" title="Why early users stay" />
        <QuoteGrid quotes={QUOTES.slice(3, 6)} />
        <SampleNote />
      </Section>
      <Section id="questions" labelledBy="faq-title">
        <SectionHead eyebrow="Questions" id="faq-title" title="Before you sign up" />
        <Faq />
      </Section>
      <CtaBand />
    </>
  );
}
