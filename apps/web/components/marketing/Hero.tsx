import Image from "next/image";
import { PEOPLE, PROOF_FACES } from "@/content/marketing";
import { Avatar } from "./Avatar";
import { Deco } from "./Deco";
import { Icon } from "./icons";
import { MarketingButton } from "./MarketingButton";

const BARS = [30, 45, 38, 60, 52, 78, 90];

function Bars({ values = BARS }: { values?: number[] }) {
  return (
    <div className="mk-bars" aria-hidden="true">
      {values.map((v, i) => (
        <span key={i} className="mk-bar" style={{ height: `${v}%`, animationDelay: `${i * 0.08}s` }} />
      ))}
    </div>
  );
}

function Chip({ children, on }: { children: string; on?: boolean }) {
  return <span className={on ? "mk-chip mk-chip--on" : "mk-chip"}>{children}</span>;
}

function Lines({ n, tone }: { n: number; tone?: "light" }) {
  const widths = [100, 86, 92, 60];
  return (
    <>
      {Array.from({ length: n }, (_, i) => (
        <span key={i} className={tone === "light" ? "mk-line mk-line--light" : "mk-line"} style={{ width: `${widths[i % 4]}%` }} />
      ))}
    </>
  );
}

type HeroCard = {
  icon: Parameters<typeof Icon>[0]["name"];
  label: string;
  promise: string;
  rot: number;
  lift: number;
  delay: number;
  dur: number;
  variant?: "dark" | "accent";
  body: React.ReactNode;
};

const CARDS: HeroCard[] = [
  { icon: "check", label: "Credentials", promise: "Certifications, degrees and research in one place.", rot: 26, lift: 18, delay: 0.2, dur: 7, body: (<><div className="mk-hc-chips"><Chip on>HSE</Chip><Chip>B.Tech</Chip><Chip>Research</Chip></div><Lines n={2} /></>) },
  { icon: "grid", label: "Portfolio page", promise: "Projects with photos, role and status.", rot: 18, lift: 6, delay: 0.6, dur: 6.4, body: (<><div className="mk-hc-photo"><Image src="/stock/projects/building.jpg" alt="" fill sizes="176px" /></div><div className="mk-hc-chips"><Chip on>Building</Chip><Chip>Done</Chip></div></>) },
  { icon: "eye", label: "Insights", promise: "See who viewed your page and what they opened.", rot: 9, lift: -2, delay: 1, dur: 5.8, body: (<><b className="mk-hc-num">248 <small>sample</small></b><Bars /></>) },
  { icon: "link", label: "Your link", promise: "sheetfolio.vercel.app/you, live in minutes.", rot: 0, lift: -12, delay: 0, dur: 6.8, variant: "accent", body: <span className="mk-hc-publish">Publish</span> },
  { icon: "doc", label: "CV layouts", promise: "Choose which CVs visitors can download.", rot: -9, lift: -2, delay: 0.4, dur: 6.2, body: (<><div className="mk-hc-layouts"><span className="mk-hc-layout mk-hc-layout--on"><Lines n={4} /></span><span className="mk-hc-layout"><Lines n={4} /></span></div><div className="mk-hc-chips"><Chip on>Modern</Chip><Chip>Classic</Chip></div></>) },
  { icon: "mail", label: "Enquiries", promise: "Messages land in your inbox and leads list.", rot: -18, lift: 6, delay: 0.8, dur: 7.2, variant: "dark", body: (<><div className="mk-hc-lead"><Avatar person="ngozi" size={28} /><div><b>Ngozi E.</b><Lines n={2} tone="light" /></div></div><span className="mk-chip mk-chip--on">1 unread</span></>) },
  { icon: "bolt", label: "Light and dark", promise: "Both themes, ready on every page.", rot: -26, lift: 18, delay: 1.2, dur: 6.6, body: (<div className="mk-hc-themes" aria-hidden="true"><span className="mk-hc-theme mk-hc-theme--light"><Lines n={3} /></span><span className="mk-hc-theme mk-hc-theme--dark"><Lines n={3} tone="light" /></span></div>) },
];

export function Hero() {
  return (
    <div className="mk-hero-shell">
      <section className="mk-hero" aria-labelledby="hero-title">
        <Deco kinds={["dots", "arcs", "waves", "blob"]} />
        <div className="mk-hero-copy">
          <span className="mk-eyebrow mk-up" style={{ animationDelay: ".05s" }}>
            <i aria-hidden="true" /> Free while we test
          </span>
          <h1 id="hero-title" className="mk-up" style={{ animationDelay: ".15s" }}>
            Your work, your CV and your enquiries on one page
          </h1>
          <p className="mk-up" style={{ animationDelay: ".3s" }}>
            Build a portfolio page for any profession. Choose which CV layouts people can download, and see who is looking.
          </p>
          <div className="mk-hero-actions mk-up" style={{ animationDelay: ".45s" }}>
            <MarketingButton href="/examples" variant="ghost">
              See an example
            </MarketingButton>
            <MarketingButton href="/login">Create your page</MarketingButton>
          </div>
          <div className="mk-proof mk-up" style={{ animationDelay: ".55s" }}>
            <span className="mk-proof-faces">
              {PROOF_FACES.map((p) => (
                <span key={p} title={PEOPLE[p].name}>
                  <Avatar person={p} size={36} />
                </span>
              ))}
            </span>
            <span>Early users from many different fields</span>
          </div>
        </div>
        <div className="mk-hero-cards mk-up" style={{ animationDelay: ".6s" }}>
          <ul className="mk-hcards">
            {CARDS.map((c) => (
              <li key={c.label} className="mk-fl" style={{ animationDuration: `${c.dur}s`, animationDelay: `${c.delay}s` }}>
                <article
                  className={["mk-hcard", c.variant && `mk-hcard--${c.variant}`].filter(Boolean).join(" ")}
                  style={{ transform: `perspective(900px) rotateY(${c.rot}deg) translateY(${c.lift}px)` }}
                >
                  <header>
                    <span className="mk-hc-icon">
                      <Icon name={c.icon} size={15} />
                    </span>
                    <b>{c.label}</b>
                  </header>
                  <p>{c.promise}</p>
                  <div className="mk-hc-body">{c.body}</div>
                </article>
              </li>
            ))}
          </ul>
          <p className="mk-hero-note">No card needed. Figures on the cards are sample data.</p>
        </div>
      </section>
    </div>
  );
}
