import type { Metadata } from "next";
import Image from "next/image";
import { Hero } from "@/components/marketing/Hero";
import { FeatureRow } from "@/components/marketing/FeatureRow";
import { CvPreviewMock, DashboardPreview } from "@/components/marketing/Mocks";
import { MarketingButton } from "@/components/marketing/MarketingButton";
import {
  AboutTiles,
  CtaBand,
  FeatureCards,
  QuoteGrid,
  SampleNote,
  Section,
  SectionHead,
  Strip,
  StoryGrid,
} from "@/components/marketing/Sections";
import { LANDING, QUOTES } from "@/content/marketing";

export const metadata: Metadata = {
  title: { absolute: "Sheetfolio · Your work, your CV and your enquiries on one page" },
  description:
    "Build a portfolio page for any profession. Choose which CV layouts people can download, and see who is looking. Free while we test.",
};

export default function HomePage() {
  return (
    <>
      <Hero />
      <Strip />
      <AboutTiles />
      <FeatureCards />
      <Section deco={["dots"]} labelledBy="dash-title">
        <SectionHead eyebrow="Your dashboard" id="dash-title" title="See what your page is doing" lead="Views, enquiries and downloads, in one view you can read in a glance." />
        <DashboardPreview />
      </Section>
      <Section>
        <FeatureRow
          eyebrow="CV layouts"
          title="Let visitors download your CV in the layout you pick"
          text="Preview each layout inside your dashboard, then choose which ones appear on your page."
          points={["Classic, Modern, Projects and Minimal layouts", "Built from the details already on your page", "Plain text a recruiter system can read"]}
        >
          <CvPreviewMock />
        </FeatureRow>
        <div className="mk-center-cta">
          <MarketingButton href="/product" variant="ghost">
            See everything it does
          </MarketingButton>
        </div>
      </Section>
      <Section tint deco={["blob", "waves"]} labelledBy="home-stories">
        <SectionHead eyebrow="Success stories" id="home-stories" title="Real work, found by the right people" lead="Short stories from early users, shown here as samples." />
        <StoryGrid />
        <div className="mk-center-cta">
          <MarketingButton href="/stories" variant="ghost">
            Read more stories
          </MarketingButton>
        </div>
      </Section>
      <Section labelledBy="home-quotes">
        <SectionHead eyebrow="Testimonials" id="home-quotes" title="What people say once they publish" />
        <QuoteGrid quotes={QUOTES.slice(0, 3)} />
        <SampleNote />
      </Section>
      <Section>
        <div className="mk-photoband">
          {[LANDING.waterfront, LANDING.crafts, LANDING.classroom].map((img) => (
            <div key={img.src} className="mk-photoband-item">
              <Image src={img.src} alt={img.alt} fill sizes="(max-width: 900px) 100vw, 360px" />
            </div>
          ))}
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
