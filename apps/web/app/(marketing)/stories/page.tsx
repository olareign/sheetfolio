import type { Metadata } from "next";
import { CtaBand, FeaturedStory, PageHead, QuoteGrid, SampleNote, Section, SectionHead, StoryGrid } from "@/components/marketing/Sections";
import { QUOTES, STORIES } from "@/content/marketing";

export const metadata: Metadata = {
  title: "Stories",
  description: "How early users turned a link into conversations.",
};

export default function StoriesPage() {
  const [featured, ...rest] = STORIES;
  return (
    <>
      <PageHead eyebrow="Stories" title="Work that got found" lead="How early users turned a link into conversations. These are sample stories until real ones replace them." />
      {featured && (
        <Section>
          <FeaturedStory story={featured} />
        </Section>
      )}
      <Section>
        <StoryGrid stories={rest} />
      </Section>
      <Section tint deco={["dots", "blob"]} labelledBy="quotes-title">
        <SectionHead eyebrow="Testimonials" id="quotes-title" title="In their words" />
        <QuoteGrid quotes={QUOTES} />
        <SampleNote />
      </Section>
      <CtaBand />
    </>
  );
}
