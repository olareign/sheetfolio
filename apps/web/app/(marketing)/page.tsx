import type { Metadata } from "next";
import Image from "next/image";
import { FeaturedCard } from "@/components/marketing/FeaturedCard";
import { Hero } from "@/components/marketing/Hero";
import { FeatureRow } from "@/components/marketing/FeatureRow";
import { CvPreviewMock, DashboardPreview } from "@/components/marketing/Mocks";
import { MarketingButton } from "@/components/marketing/MarketingButton";
import {
  AboutBento,
  CtaBand,
  FeatureCards,
  Section,
  SectionHead,
  Strip,
  UseCaseGrid,
} from "@/components/marketing/Sections";
import { LANDING, USE_CASES } from "@/content/marketing";
import { publicSiteUrl } from "@/lib/env";
import { getFeaturedUsersCached, type FeaturedUser } from "@/lib/showcase";

export const metadata: Metadata = {
  title: { absolute: "Sheetfolio · Your work, your CV and your enquiries on one page" },
  description:
    "Build a portfolio page for any profession. Pick the CV layout people download, and see who is looking. Free while we test.",
};

// The featured strip follows the live ranking; a page going live drops it at once, views refresh it every minute.
export const revalidate = 60;

/** The landing page must still load if the ranking cannot be read. */
async function topFeatured(): Promise<FeaturedUser[]> {
  try {
    return await getFeaturedUsersCached(3);
  } catch (err) {
    console.error("[featured] ranking unavailable:", err instanceof Error ? err.message : err);
    return [];
  }
}

export default async function HomePage() {
  const featured = await topFeatured();
  return (
    <>
      <Hero />
      <Strip />
      <AboutBento host={publicSiteUrl().host} />
      <FeatureCards />
      <Section deco={["dots"]} labelledBy="dash-title">
        <SectionHead
          eyebrow="Your dashboard"
          id="dash-title"
          title="See what your page is doing"
          lead="Views, enquiries and downloads, in one view you can read in a glance."
        />
        <DashboardPreview />
      </Section>
      <Section>
        <FeatureRow
          eyebrow="CV layouts"
          title="Visitors download your CV in the layout you pick"
          text="Preview each layout inside your dashboard, then pick the one your page hands out. Every visitor gets that PDF."
          points={[
            "Classic, Modern, Projects and Minimal layouts",
            "Built from the details already on your page",
            "Plain text a recruiter system can read",
          ]}
        >
          <CvPreviewMock />
        </FeatureRow>
        <div className="mk-center-cta">
          <MarketingButton href="/product" variant="ghost">
            See everything it does
          </MarketingButton>
        </div>
      </Section>
      {featured.length > 0 && (
        <Section labelledBy="home-featured">
          <SectionHead
            eyebrow="Featured"
            id="home-featured"
            title="Pages people are visiting right now"
            lead="Real pages, most viewed first. New pages join this list the moment they are published."
          />
          <ul className="mk-cards mk-cards--fill">
            {featured.map((u, i) => (
              <li key={u.slug}>
                <FeaturedCard user={u} rank={i + 1} />
              </li>
            ))}
          </ul>
          <div className="mk-center-cta">
            <MarketingButton href="/featured" variant="ghost">
              See all featured pages
            </MarketingButton>
          </div>
        </Section>
      )}
      <Section tint deco={["blob", "waves"]} labelledBy="home-usecases">
        <SectionHead
          eyebrow="Use cases"
          id="home-usecases"
          title="Made for the work you actually do"
          lead="Whatever your field, a page that shows your work and makes it easy to reach you."
        />
        <UseCaseGrid items={USE_CASES.slice(0, 3)} />
        <div className="mk-center-cta">
          <MarketingButton href="/use-cases" variant="ghost">
            See more use cases
          </MarketingButton>
        </div>
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
