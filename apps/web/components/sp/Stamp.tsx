import { stampText } from "@/content/derive";

type StampProps = {
  title: string;
  sub: string;
  tone?: "hivis" | "cured";
  size?: number;
  href?: string;
  label?: string;
};

/** DESIGN §7.3: approval stamp. Title ≤ 7 characters; hivis for certifications, cured for education. */
export function Stamp({ title, sub, tone = "hivis", size = 112, href, label }: StampProps) {
  const className = tone === "cured" ? "sp-stamp sp-stamp--cured" : "sp-stamp";
  const style = size === 112 ? undefined : { width: size, height: size };
  const body = (
    <span>
      <b>{stampText(title)}</b>
      <small>{sub}</small>
    </span>
  );
  return href ? (
    <a
      className={className}
      style={style}
      href={href}
      target="_blank"
      rel="noopener"
      aria-label={label ?? `${title} certificate`}
    >
      {body}
    </a>
  ) : (
    <div className={className} style={style} role="img" aria-label={label ?? `${title}, ${sub}`}>
      {body}
    </div>
  );
}
