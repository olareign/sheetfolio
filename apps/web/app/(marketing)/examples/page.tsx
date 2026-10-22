import type { Metadata } from "next";
import { ExamplesGrid } from "@/components/marketing/ExamplesGrid";
import { CtaBand, PageHead, SampleNote, Section, SectionHead, Steps } from "@/components/marketing/Sections";

export const metadata: Metadata = {
  title: "Examples",
  description: "See how different people use Sheetfolio: job seekers, freelancers, students, creators and more.",
};

export default function ExamplesPage() {
  return (
    <>
      <PageHead eyebrow="Examples" title="See how different people use it" lead="Pages built from one layout. Anyone can have one, and yours will carry your own work." />
      <Section>
        <ExamplesGrid />
        <SampleNote />
      </Section>
      <Section tint id="how-it-works" labelledBy="how-title">
        <SectionHead eyebrow="How it works" id="how-title" title="From sign-up to live page in three steps" />
        <Steps />
      </Section>
      <CtaBand />
    </>
  );
}
