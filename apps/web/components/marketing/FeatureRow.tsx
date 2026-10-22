import type { ReactNode } from "react";
import { Deco } from "./Deco";
import { Icon } from "./icons";

/**
 * Text panel beside a product picture. The picture has a fixed aspect ratio and the text panel stretches to match,
 * so the two always share one height.
 */
export function FeatureRow({
  eyebrow,
  title,
  text,
  points,
  flip,
  children,
}: {
  eyebrow: string;
  title: string;
  text: string;
  points: readonly string[];
  flip?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={flip ? "mk-split mk-split--flip" : "mk-split"}>
      <div className="mk-split-text">
        <span className="mk-eyebrow">
          <i aria-hidden="true" /> {eyebrow}
        </span>
        <h2>{title}</h2>
        <p>{text}</p>
        <ul className="mk-points">
          {points.map((p) => (
            <li key={p}>
              <Icon name="check" size={20} />
              <span>{p}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="mk-split-media mk-split-media--mock">
        <Deco kinds={["dots", "waves"]} />
        <div className="mk-fl mk-fl--mock">{children}</div>
      </div>
    </div>
  );
}
