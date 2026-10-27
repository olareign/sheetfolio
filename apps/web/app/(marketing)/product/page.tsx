import type { Metadata } from "next";
import { FeatureExplorer, type ExplorerTab } from "@/components/marketing/FeatureExplorer";
import { Icon } from "@/components/marketing/icons";
import {
  CvMock,
  ImportMock,
  InsightsMock,
  LeadsMock,
  LinkPreviewMock,
  PortfolioMock,
} from "@/components/marketing/Mocks";
import { CtaBand, Faq, Section, SectionHead } from "@/components/marketing/Sections";
import { Deco } from "@/components/marketing/Deco";
import { CAPABILITIES, JOURNEY } from "@/content/product";
import { publicSiteUrl } from "@/lib/env";

export const metadata: Metadata = {
  title: "Product",
  description:
    "Start from your CV, fill in your page with a guide, choose the CV visitors download, get enquiries in your inbox and see what gets attention.",
  alternates: { canonical: "/product" },
};

export default function ProductPage() {
  const host = publicSiteUrl().host;
  const tabs: ExplorerTab[] = [
    {
      id: "page",
      icon: "grid",
      label: "Your page",
      title: "A page that looks finished from day one",
      text: "Add what you have done. Dosinex lays it out, keeps it readable on a phone, and gives you light and dark themes.",
      points: [
        "Projects with a picture, role, location and status",
        "A website link fills in a project's picture and description",
        "Your own link to share anywhere",
      ],
      mock: <PortfolioMock />,
    },
    {
      id: "import",
      icon: "upload",
      label: "Start from your CV",
      title: "Upload your CV and skip the typing",
      text: "Drop in a PDF and your name, contact details, experience and education are filled in for you to check. Prefer to start fresh? A guide walks you through it.",
      points: [
        "Reads text-based PDF CVs",
        "Nothing is saved until you have checked it",
        "A step-by-step guide shows what is still needed to publish",
      ],
      mock: <ImportMock />,
    },
    {
      id: "cv",
      icon: "doc",
      label: "CV layouts",
      title: "Choose the CV visitors download",
      text: "Preview every layout inside your dashboard, then pick the one your page hands out. Visitors get a single Download CV button.",
      points: [
        "Four layouts built for recruiter systems",
        "Your details filled in for you",
        "You choose the layout, never the visitor",
      ],
      mock: <CvMock />,
    },
    {
      id: "leads",
      icon: "mail",
      label: "Enquiries",
      title: "Messages go straight to you",
      text: "A contact form and a WhatsApp button sit on your page. Every enquiry is kept in your leads list and emailed to you.",
      points: [
        "An email for each new enquiry",
        "Mark enquiries as read",
        "Your phone number stays private unless you share it",
      ],
      mock: <LeadsMock />,
    },
    {
      id: "insights",
      icon: "eye",
      label: "Insights",
      title: "Know what is getting attention",
      text: "See how many people viewed your page, which projects they opened and how often your CV is downloaded.",
      points: ["Views over the last twelve weeks", "Most opened projects", "No tracking scripts on your page"],
      mock: <InsightsMock />,
    },
    {
      id: "preview",
      icon: "chat",
      label: "Link previews",
      title: "Your link looks like you in every chat",
      text: "Share your link on WhatsApp, LinkedIn or email and it shows your photo, name and headline, so people know whose page they are opening.",
      points: [
        "Your photo, name and headline on the preview",
        "Set up once, updated when you publish",
        "Search engines can read your page too",
      ],
      mock: <LinkPreviewMock host={host} />,
    },
  ];

  return (
    <>
      <section className="mk-phero">
        <Deco kinds={["dots", "arcs", "blob"]} />
        <div className="mk-wrap">
          <span className="mk-eyebrow">
            <i aria-hidden="true" /> Product
          </span>
          <h1>Build the page, share the link, hear back</h1>
          <p>Everything between “I have some work to show” and “someone got in touch”, in one place.</p>
        </div>
      </section>

      <Section id="how-it-works" labelledBy="journey-title">
        <SectionHead
          eyebrow="How it works"
          id="journey-title"
          title="From sign-up to a live link"
          lead="Four steps, and you can stop and come back to any of them."
        />
        <ol className="mk-journey">
          {JOURNEY.map((step, i) => (
            <li key={step.title} style={{ "--i": i } as React.CSSProperties}>
              <span className="mk-journey-node">
                <Icon name={step.icon} size={20} />
              </span>
              <b>
                <i>{i + 1}</i> {step.title}
              </b>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </Section>

      <Section tint deco={["dots", "waves"]} labelledBy="explore-title">
        <SectionHead
          eyebrow="Explore"
          id="explore-title"
          title="Six parts that work together"
          lead="Pick one to see it up close."
        />
        <FeatureExplorer tabs={tabs} />
      </Section>

      <Section labelledBy="caps-title">
        <SectionHead eyebrow="Details that matter" id="caps-title" title="The small things are done too" />
        <ul className="mk-caps">
          {CAPABILITIES.map((c) => (
            <li key={c.title} className="mk-cap mk-lift">
              <span className="mk-icon-tile">
                <Icon name={c.icon} />
              </span>
              <h3>{c.title}</h3>
              <p>{c.text}</p>
            </li>
          ))}
        </ul>
      </Section>

      <Section tint id="questions" labelledBy="faq-title">
        <SectionHead eyebrow="Questions" id="faq-title" title="Before you sign up" />
        <Faq />
      </Section>
      <CtaBand />
    </>
  );
}
