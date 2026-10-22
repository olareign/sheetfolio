import type { Metadata } from "next";
import { FeatureRow } from "@/components/marketing/FeatureRow";
import { CvMock, InsightsMock, LeadsMock, PortfolioMock } from "@/components/marketing/Mocks";
import { CtaBand, PageHead, Section } from "@/components/marketing/Sections";

export const metadata: Metadata = {
  title: "Product",
  description: "A finished page, the CV layout you choose, enquiries in your inbox and insights. Four parts that work together.",
};

export default function ProductPage() {
  return (
    <>
      <PageHead eyebrow="Product" title="Build the page, share the link, hear back" lead="Four parts that work together. Set them up once and keep them current from your dashboard." />
      <Section>
        <div className="mk-rows">
          <FeatureRow
            eyebrow="Your page"
            title="A page that looks finished from day one"
            text="Add what you have done. Sheetfolio lays it out, keeps it readable on a phone, and gives you light and dark themes."
            points={["Projects with a picture, role, location and status", "A website link fills in a project's picture and description for you", "Your own link to share anywhere"]}
          >
            <PortfolioMock />
          </FeatureRow>
          <FeatureRow
            flip
            eyebrow="CV layouts"
            title="Choose the CV visitors download"
            text="Preview every layout inside your dashboard, then pick the one your page hands out. Visitors get a single Download CV button."
            points={["Four ATS-friendly layouts to choose from", "Your details filled in for you", "You choose the layout, never the visitor"]}
          >
            <CvMock />
          </FeatureRow>
          <FeatureRow
            eyebrow="Enquiries"
            title="Messages go straight to you"
            text="A contact form and a WhatsApp button sit on your page. Every enquiry is kept in your leads list."
            points={["Email alert for each new lead", "Mark leads as read", "Your phone number stays private unless you share it"]}
          >
            <LeadsMock />
          </FeatureRow>
          <FeatureRow
            flip
            eyebrow="Insights"
            title="Know what is getting attention"
            text="See how many people viewed your page and which projects they opened."
            points={["Views over time", "Enquiries beside the views that led to them", "No tracking scripts on your page"]}
          >
            <InsightsMock />
          </FeatureRow>
        </div>
      </Section>
      <CtaBand />
    </>
  );
}
