"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import type { FeatureIcon } from "@/content/marketing";
import { Deco } from "./Deco";
import { Icon } from "./icons";

export type ExplorerTab = {
  id: string;
  icon: FeatureIcon;
  label: string;
  title: string;
  text: string;
  points: readonly string[];
  mock: ReactNode;
};

/**
 * Tabbed product tour: pick a part of the product on the left, see it on the right. A real tablist (arrow keys,
 * roving tabindex), and every panel stays in the DOM so the text is readable without JavaScript's help to search engines.
 */
export function FeatureExplorer({ tabs }: { tabs: readonly ExplorerTab[] }) {
  const [active, setActive] = useState(tabs[0]?.id);
  const base = useId();
  const refs = useRef<Record<string, HTMLButtonElement | null>>({});

  function onKey(event: KeyboardEvent, index: number) {
    const step =
      event.key === "ArrowDown" || event.key === "ArrowRight"
        ? 1
        : event.key === "ArrowUp" || event.key === "ArrowLeft"
          ? -1
          : 0;
    if (!step) return;
    event.preventDefault();
    const next = tabs[(index + step + tabs.length) % tabs.length];
    if (!next) return;
    setActive(next.id);
    refs.current[next.id]?.focus();
  }

  return (
    <div className="mk-explorer">
      <div className="mk-explorer-tabs" role="tablist" aria-label="Parts of the product" aria-orientation="vertical">
        {tabs.map((t, i) => (
          <button
            key={t.id}
            ref={(el) => {
              refs.current[t.id] = el;
            }}
            id={`${base}-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`${base}-panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            className="mk-explorer-tab"
            onClick={() => setActive(t.id)}
            onKeyDown={(e) => onKey(e, i)}
          >
            <span className="mk-icon-tile">
              <Icon name={t.icon} size={18} />
            </span>
            <span>
              <b>{t.label}</b>
              <small>{t.title}</small>
            </span>
          </button>
        ))}
      </div>
      <div className="mk-explorer-stage">
        {tabs.map((t) => (
          <div
            key={t.id}
            id={`${base}-panel-${t.id}`}
            role="tabpanel"
            aria-labelledby={`${base}-tab-${t.id}`}
            hidden={active !== t.id}
            className="mk-explorer-panel"
          >
            <div className="mk-explorer-copy">
              <h3>{t.title}</h3>
              <p>{t.text}</p>
              <ul className="mk-points">
                {t.points.map((p) => (
                  <li key={p}>
                    <Icon name="check" size={20} />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="mk-explorer-visual">
              <Deco kinds={["dots", "waves"]} />
              <div className="mk-fl mk-fl--mock">{t.mock}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
