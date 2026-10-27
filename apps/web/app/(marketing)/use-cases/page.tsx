import type { Metadata } from "next";
import { CtaBand, PageHead, Section, UseCaseGrid } from "@/components/marketing/Sections";

export const metadata: Metadata = {
  title: "Use cases",
  description:
    "How engineers, freelancers, health workers, designers, students and researchers use a Dosinex page to show their work and be found.",
  alternates: { canonical: "/use-cases" },
};

export default function UseCasesPage() {
  return (
    <>
      <PageHead
        eyebrow="Use cases"
        title="One page, whatever your work"
        lead="Here is what different people put on their page, and why it helps them get found."
      />
      <Section>
        <UseCaseGrid />
      </Section>
      <CtaBand />
    </>
  );
}
