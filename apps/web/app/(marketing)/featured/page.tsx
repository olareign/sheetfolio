import type { Metadata } from "next";
import { FeaturedCard } from "@/components/marketing/FeaturedCard";
import { MarketingButton } from "@/components/marketing/MarketingButton";
import { CtaBand, PageHead, Section, SectionHead, Steps } from "@/components/marketing/Sections";
import { getFeaturedUsers } from "@/lib/showcase";

export const metadata: Metadata = {
  title: "Featured",
  description: "Real Sheetfolio pages, ranked by how many people viewed them in the last 30 days.",
};

// Ranked from live view counters; refreshed every few minutes rather than on every request.
export const revalidate = 300;

export default async function FeaturedPage() {
  const users = await getFeaturedUsers();
  return (
    <>
      <PageHead
        eyebrow="Featured"
        title="Pages people are visiting"
        lead="Real Sheetfolio pages, most viewed first, counted over the last 30 days. Owners can leave this list any time in Settings."
      />
      <Section>
        {users.length > 0 ? (
          <ul className="mk-cards mk-cards--fill">
            {users.map((u, i) => (
              <li key={u.slug}>
                <FeaturedCard user={u} rank={i + 1} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mk-empty">
            <h2>Be the first featured page</h2>
            <p>Pages appear here once they are published. The most viewed come first.</p>
            <MarketingButton href="/login">Create your page</MarketingButton>
          </div>
        )}
      </Section>
      <Section tint id="how-it-works" labelledBy="how-title">
        <SectionHead eyebrow="How it works" id="how-title" title="From sign-up to live page in three steps" />
        <Steps />
      </Section>
      <CtaBand />
    </>
  );
}
