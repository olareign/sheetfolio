import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { AUDIENCE, FAQS, FEATURES, PLANS, USE_CASES, type Plan, type UseCase } from "@/content/marketing";
import { Deco, type DecoKind } from "./Deco";
import { Icon } from "./icons";
import { MarketingButton } from "./MarketingButton";

export function Section({
  children,
  tint,
  deco,
  id,
  labelledBy,
}: {
  children: ReactNode;
  tint?: boolean;
  deco?: readonly DecoKind[];
  id?: string;
  labelledBy?: string;
}) {
  return (
    <section id={id} aria-labelledby={labelledBy} className={tint ? "mk-section mk-section--tint" : "mk-section"}>
      {deco && <Deco kinds={deco} />}
      <div className="mk-wrap">{children}</div>
    </section>
  );
}

export function SectionHead({
  eyebrow,
  title,
  lead,
  id,
  center = true,
}: {
  eyebrow: string;
  title: ReactNode;
  lead?: string;
  id?: string;
  center?: boolean;
}) {
  return (
    <div className={center ? "mk-head mk-head--center" : "mk-head"}>
      <span className="mk-eyebrow">
        <i aria-hidden="true" /> {eyebrow}
      </span>
      <h2 id={id}>{title}</h2>
      {lead && <p>{lead}</p>}
    </div>
  );
}

/** Top of every inner page. */
export function PageHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return (
    <section className="mk-pagehead">
      <Deco kinds={["dots", "arcs", "blob"]} />
      <div className="mk-wrap">
        <span className="mk-eyebrow">
          <i aria-hidden="true" /> {eyebrow}
        </span>
        <h1>{title}</h1>
        <p>{lead}</p>
      </div>
    </section>
  );
}

/** Scrolling "made for everyone" strip. The second copy is hidden from assistive tech. */
export function Strip() {
  const row = (hidden?: boolean) => (
    <ul className="mk-strip-row" aria-hidden={hidden || undefined}>
      {AUDIENCE.map((a) => (
        <li key={a}>{a}</li>
      ))}
    </ul>
  );
  return (
    <div className="mk-strip">
      <span className="mk-strip-label">Made for everyone</span>
      <div className="mk-strip-window">
        <div className="mk-strip-track">
          {row()}
          {row(true)}
        </div>
      </div>
    </div>
  );
}

const CV_THUMBS = ["Classic", "Modern", "Projects", "Minimal"] as const;
const ABOUT_ROWS = ["Projects", "Experience", "CV", "Contact"] as const;

/** "Why Sheetfolio": four tiles of different sizes, each showing the idea instead of only stating it. */
export function AboutBento({ host }: { host: string }) {
  return (
    <Section deco={["blob"]} labelledBy="about-title">
      <div className="mk-head mk-head--center">
        <span className="mk-eyebrow">
          <i aria-hidden="true" /> Why Sheetfolio
        </span>
        <h2 id="about-title" className="mk-statement">
          A portfolio for anyone whose work is worth showing,{" "}
          <span className="mk-inline-icon">
            <Icon name="user" size={20} />
          </span>{" "}
          not only designers and developers.
        </h2>
      </div>
      <div className="mk-bento">
        <article className="mk-bt mk-bt--link">
          <span className="mk-bt-label">One link</span>
          <h3>Your whole story on one address</h3>
          <div className="mk-bt-visual" aria-hidden="true">
            <div className="mk-urlbar">
              <i />
              <span>
                {host}/<b>your-name</b>
              </span>
              <em />
            </div>
            <ul className="mk-bt-rows">
              {ABOUT_ROWS.map((r, i) => (
                <li key={r} style={{ animationDelay: `${i * 0.12}s` }}>
                  {r}
                </li>
              ))}
            </ul>
          </div>
        </article>
        <article className="mk-bt mk-bt--cv">
          <span className="mk-bt-label">Four CV layouts</span>
          <h3>Visitors download the one you choose</h3>
          <ul className="mk-bt-docs" aria-label="Classic, Modern, Projects and Minimal layouts">
            {CV_THUMBS.map((name, i) => (
              <li key={name} className={i === 1 ? "is-picked" : undefined}>
                <span aria-hidden="true">
                  <i />
                  <i />
                  <i />
                  <i />
                </span>
                {name}
              </li>
            ))}
          </ul>
        </article>
        <article className="mk-bt mk-bt--free">
          <span className="mk-bt-label">While we test</span>
          <b className="mk-bt-big">Free</b>
          <p>No card. Publish and update whenever you like.</p>
          <ul className="mk-bt-checks">
            <li>No card needed</li>
            <li>Change it any time</li>
          </ul>
        </article>
        <article className="mk-bt mk-bt--anyone">
          <span className="mk-bt-label">Who it is for</span>
          <b className="mk-bt-big">Anyone</b>
          <p>Any profession with work to show.</p>
          <ul className="mk-bt-cloud" aria-label="People who use it">
            {AUDIENCE.slice(0, 8).map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </article>
      </div>
    </Section>
  );
}

export function FeatureCards() {
  return (
    <Section tint deco={["dots", "waves"]} labelledBy="features-title">
      <SectionHead
        eyebrow="What you get"
        id="features-title"
        title="Everything people need to hire or contact you"
        lead="Four tools, one dashboard. Nothing to design or host."
      />
      <div className="mk-center-cta">
        <MarketingButton href="/signup">Create your page</MarketingButton>
      </div>
      <ul className="mk-cards mk-cards--4 mk-cards--swipe">
        {FEATURES.map((f) => (
          <li key={f.title} className="mk-card mk-lift">
            <span className="mk-icon-tile">
              <Icon name={f.icon} />
            </span>
            <h3>{f.title}</h3>
            <p>{f.text}</p>
          </li>
        ))}
      </ul>
      <SwipeHint />
    </Section>
  );
}

/** Shown under swipeable card rows on phones only. */
export function SwipeHint() {
  return (
    <p className="mk-swipe-hint" aria-hidden="true">
      <span /> Swipe for more
    </p>
  );
}

export function UseCaseCard({ useCase }: { useCase: UseCase }) {
  return (
    <article className="mk-usecase mk-lift">
      <div className="mk-usecase-photo">
        <Image src={useCase.photo} alt={useCase.alt} fill sizes="(max-width: 900px) 100vw, 360px" />
        <span className="mk-usecase-who">{useCase.who}</span>
      </div>
      <div className="mk-usecase-body">
        <h3>{useCase.title}</h3>
        <p>{useCase.text}</p>
        <ul className="mk-usecase-puts">
          {useCase.puts.map((p) => (
            <li key={p}>
              <Icon name="check" size={16} />
              {p}
            </li>
          ))}
        </ul>
      </div>
    </article>
  );
}

export function UseCaseGrid({ items = USE_CASES }: { items?: readonly UseCase[] }) {
  return (
    <>
      <ul className="mk-cards mk-cards--3 mk-cards--stories mk-cards--swipe">
        {items.map((u) => (
          <li key={u.title}>
            <UseCaseCard useCase={u} />
          </li>
        ))}
      </ul>
      {items.length > 1 && <SwipeHint />}
    </>
  );
}

export function PlanCard({ plan }: { plan: Plan }) {
  return (
    <article className={plan.featured ? "mk-plan mk-plan--featured" : "mk-plan"}>
      <div className="mk-plan-head">
        <h3>{plan.name}</h3>
        <span className="mk-chip mk-chip--on">{plan.tag}</span>
      </div>
      <p className="mk-plan-price">
        <b>{plan.price}</b> <span>{plan.per}</span>
      </p>
      <p className="mk-plan-blurb">{plan.blurb}</p>
      <ul>
        {plan.points.map((pt) => (
          <li key={pt}>
            <Icon name="check" size={18} />
            {pt}
          </li>
        ))}
      </ul>
      <Link href="/signup" className="mk-btn mk-btn--block">
        Create your page
      </Link>
    </article>
  );
}

export const Plans = () => (
  <div className="mk-plans">
    {PLANS.map((p) => (
      <PlanCard key={p.name} plan={p} />
    ))}
  </div>
);

export function Faq() {
  return (
    <div className="mk-faq">
      {FAQS.map((f) => (
        <details key={f.q}>
          <summary>
            {f.q}
            <span aria-hidden="true">+</span>
          </summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand() {
  return (
    <div className="mk-cta-shell">
      <section className="mk-cta" aria-labelledby="cta-title">
        <Deco kinds={["lines", "arcs"]} tone="white" />
        <div className="mk-cta-inner">
          <h2 id="cta-title">Put your work in front of the people who matter</h2>
          <p>Create your page in a few minutes. It is free while we test.</p>
          <MarketingButton href="/signup" onDark>
            Create your page
          </MarketingButton>
        </div>
      </section>
    </div>
  );
}
