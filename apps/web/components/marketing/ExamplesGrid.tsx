"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { EXAMPLE_GROUPS, EXAMPLES, PEOPLE, type ExampleCard } from "@/content/marketing";
import { Avatar } from "./Avatar";
import { SampleBadge } from "./Sections";

function Card({ e }: { e: ExampleCard }) {
  const inner = (
    <>
      <div className="mk-example-photo">
        <Image src={e.photo} alt={e.alt} fill sizes="(max-width: 700px) 100vw, 360px" />
        <span className="mk-story-badge">{e.sample ? <SampleBadge /> : <span className="mk-sample mk-sample--live">Live page</span>}</span>
      </div>
      <div className="mk-example-body">
        <div className="mk-person">
          <Avatar person={e.person} size={42} />
          <span>
            <b>{e.href ? e.name : PEOPLE[e.person].name}</b>
            <span className="mk-muted">{e.role}</span>
          </span>
        </div>
        <div className="mk-hc-chips">
          {e.tags.map((t) => (
            <span key={t} className="mk-chip">
              {t}
            </span>
          ))}
        </div>
      </div>
    </>
  );
  return e.href ? (
    <Link href={e.href} className="mk-example mk-lift">
      {inner}
    </Link>
  ) : (
    <div className="mk-example mk-lift">{inner}</div>
  );
}

export function ExamplesGrid() {
  const [group, setGroup] = useState<(typeof EXAMPLE_GROUPS)[number]>("All");
  const shown = group === "All" ? EXAMPLES : EXAMPLES.filter((e) => e.group === group);
  return (
    <>
      <div className="mk-filters" role="group" aria-label="Filter examples">
        {EXAMPLE_GROUPS.map((g) => (
          <button key={g} type="button" aria-pressed={g === group} className="mk-filter" onClick={() => setGroup(g)}>
            {g}
          </button>
        ))}
      </div>
      <p className="sp-visually-hidden" aria-live="polite">
        Showing {shown.length} examples
      </p>
      <ul className="mk-cards mk-cards--3">
        {shown.map((e) => (
          <li key={e.name}>
            <Card e={e} />
          </li>
        ))}
      </ul>
    </>
  );
}
