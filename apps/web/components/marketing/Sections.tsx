import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import {
  AUDIENCE,
  FAQS,
  FEATURES,
  PEOPLE,
  PLANS,
  QUOTES,
  STEPS,
  STORIES,
  TILES,
  type Plan,
  type Quote,
  type Story,
} from "@/content/marketing";
import { Avatar } from "./Avatar";
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

export function SampleBadge({ children = "Sample" }: { children?: string }) {
  return <span className="mk-sample">{children}</span>;
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

export function AboutTiles() {
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
      <div className="mk-tiles">
        {TILES.map((t) => (
          <div key={t.big} className={`mk-tile mk-tile--${t.tone}`}>
            {"label" in t && <span>{t.label}</span>}
            <div>
              <b>{t.big}</b>
              <p>{t.text}</p>
            </div>
          </div>
        ))}
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

export function StoryCard({ story }: { story: Story }) {
  const p = PEOPLE[story.person];
  return (
    <article className="mk-story mk-lift">
      <div className="mk-story-photo">
        <Image src={story.photo} alt={story.alt} fill sizes="(max-width: 900px) 100vw, 360px" />
        {story.sample && (
          <span className="mk-story-badge">
            <SampleBadge>Sample story</SampleBadge>
          </span>
        )}
      </div>
      <div className="mk-story-body">
        <h3>{story.title}</h3>
        <p>{story.quote}</p>
        <div className="mk-person">
          <Avatar person={story.person} size={44} />
          <span>
            <b>{p.name}</b>
            <span className="mk-muted">{story.role}</span>
          </span>
        </div>
      </div>
    </article>
  );
}

export function StoryGrid({ stories = STORIES.slice(0, 3) }: { stories?: readonly Story[] }) {
  return (
    <>
      <ul className="mk-cards mk-cards--3 mk-cards--stories mk-cards--swipe">
        {stories.map((s) => (
          <li key={s.title}>
            <StoryCard story={s} />
          </li>
        ))}
      </ul>
      {stories.length > 1 && <SwipeHint />}
    </>
  );
}

export function FeaturedStory({ story }: { story: Story }) {
  const p = PEOPLE[story.person];
  return (
    <div className="mk-split">
      <div className="mk-split-media">
        <Image src={story.photo} alt={story.alt} fill sizes="(max-width: 900px) 100vw, 560px" />
        {story.sample && (
          <span className="mk-story-badge">
            <SampleBadge>Sample story</SampleBadge>
          </span>
        )}
      </div>
      <div className="mk-split-text">
        <span className="mk-eyebrow">
          <i aria-hidden="true" /> Success story
        </span>
        <h2>{story.title}</h2>
        <blockquote>“{story.quote}”</blockquote>
        <div className="mk-person">
          <Avatar person={story.person} size={52} />
          <span>
            <b>{p.name}</b>
            <span className="mk-muted">{story.role}</span>
          </span>
        </div>
        <dl className="mk-outcomes">
          {story.outcomes.map((o) => (
            <div key={o.label}>
              <dt>{o.figure}</dt>
              <dd>{o.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

export function QuoteCard({ quote }: { quote: Quote }) {
  const p = PEOPLE[quote.person];
  return (
    <figure className="mk-quote mk-lift">
      <div className="mk-quote-top">
        <svg width="30" height="22" viewBox="0 0 30 22" aria-hidden="true">
          <path
            d="M0 22V11C0 4 4 0 11 0v5C8 5 6 7 6 11h5v11zM17 22V11c0-7 4-11 11-11v5c-3 0-5 2-5 6h5v11z"
            fill="currentColor"
            opacity=".25"
          />
        </svg>
        {quote.sample && <SampleBadge>Sample quote</SampleBadge>}
      </div>
      <blockquote>{quote.text}</blockquote>
      <figcaption className="mk-person">
        <Avatar person={quote.person} size={44} />
        <span>
          <b>{p.name}</b>
          <span className="mk-muted">{quote.role}</span>
        </span>
      </figcaption>
    </figure>
  );
}

export function QuoteGrid({ quotes }: { quotes: readonly Quote[] }) {
  return (
    <>
      <ul className="mk-cards mk-cards--3 mk-cards--swipe">
        {quotes.map((q) => (
          <li key={q.text}>
            <QuoteCard quote={q} />
          </li>
        ))}
      </ul>
      {quotes.length > 1 && <SwipeHint />}
    </>
  );
}

export function SampleNote() {
  return (
    <p className="mk-note">
      Names, quotes and figures are sample content. Photos are free stock images from Unsplash, standing in for real
      users and projects until launch.
    </p>
  );
}

export function Steps() {
  return (
    <ul className="mk-cards mk-cards--3">
      {STEPS.map((s) => (
        <li key={s.title} className="mk-card">
          <span className="mk-icon-tile">
            <Icon name={s.icon} />
          </span>
          <h3>{s.title}</h3>
          <p>{s.text}</p>
        </li>
      ))}
    </ul>
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
