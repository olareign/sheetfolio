import { useId } from "react";

export type DecoKind = "dots" | "arcs" | "waves" | "blob" | "lines";

/**
 * Decorative SVG backgrounds. Colours come from the theme tokens (currentColor and CSS variables), so they
 * follow light and dark mode. Hidden from assistive technology and ignored by pointer events.
 */
export function Deco({ kinds, tone = "accent" }: { kinds: readonly DecoKind[]; tone?: "accent" | "white" }) {
  const uid = useId().replace(/:/g, "");
  return (
    <>
      {kinds.map((kind) => (
        <svg
          key={kind}
          className={`mk-deco mk-deco--${tone}`}
          viewBox="0 0 1280 700"
          preserveAspectRatio={kind === "waves" ? "xMidYMax slice" : kind === "arcs" ? "xMaxYMin slice" : kind === "dots" ? "xMinYMin slice" : "xMidYMid slice"}
          aria-hidden="true"
          focusable="false"
        >
          {kind === "dots" && (
            <>
              <defs>
                <pattern id={`${uid}p`} width="26" height="26" patternUnits="userSpaceOnUse">
                  <circle cx="2" cy="2" r="1.6" fill="currentColor" opacity=".3" />
                </pattern>
                <linearGradient id={`${uid}g`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0" stopColor="#fff" />
                  <stop offset=".55" stopColor="#fff" stopOpacity="0" />
                </linearGradient>
                <mask id={`${uid}m`}>
                  <rect width="1280" height="700" fill={`url(#${uid}g)`} />
                </mask>
              </defs>
              <rect width="1280" height="700" fill={`url(#${uid}p)`} mask={`url(#${uid}m)`} />
            </>
          )}
          {kind === "arcs" &&
            [70, 140, 210, 280, 350, 420].map((r, i) => (
              <circle
                key={r}
                cx="1160"
                cy="130"
                r={r}
                fill="none"
                stroke="currentColor"
                strokeOpacity={0.2 - i * 0.03}
                strokeWidth="1.5"
                strokeDasharray={i % 2 ? "6 10" : undefined}
                className={i % 2 ? "mk-spin" : undefined}
              />
            ))}
          {kind === "waves" &&
            [
              [520, 0.22],
              [560, 0.17],
              [600, 0.12],
              [640, 0.09],
            ].map(([y, o]) => (
              <path
                key={y}
                className="mk-flow"
                d={`M-20 ${y} C 220 ${(y ?? 0) - 60}, 420 ${(y ?? 0) + 60}, 640 ${y} S 1060 ${(y ?? 0) - 60}, 1300 ${y}`}
                fill="none"
                stroke="currentColor"
                strokeOpacity={o}
                strokeWidth="1.5"
                strokeDasharray="3 9"
              />
            ))}
          {kind === "blob" && (
            <>
              <defs>
                <filter id={`${uid}b`}>
                  <feGaussianBlur stdDeviation="60" />
                </filter>
              </defs>
              <ellipse className="mk-drift" cx="1080" cy="520" rx="220" ry="150" style={{ fill: "var(--accent-soft)" }} opacity=".8" filter={`url(#${uid}b)`} />
              <ellipse className="mk-drift mk-drift--slow" cx="160" cy="180" rx="200" ry="130" style={{ fill: "var(--accent-soft)" }} opacity=".6" filter={`url(#${uid}b)`} />
            </>
          )}
          {kind === "lines" &&
            Array.from({ length: 14 }, (_, i) => -100 + i * 110).map((x) => (
              <path key={x} d={`M${x} -10 L${x + 220} 710`} stroke="currentColor" strokeOpacity=".08" strokeWidth="1.5" />
            ))}
        </svg>
      ))}
    </>
  );
}
