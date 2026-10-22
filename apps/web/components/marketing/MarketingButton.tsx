import Link from "next/link";
import type { ReactNode } from "react";
import { Arrow } from "./icons";

/** Pill link-button. `primary` carries an arrow chip; `ghost` is an outline. */
export function MarketingButton({
  href,
  variant = "primary",
  children,
  onDark,
}: {
  href: string;
  variant?: "primary" | "ghost";
  children: ReactNode;
  /** On the deep call-to-action band: a white pill instead of the accent one. */
  onDark?: boolean;
}) {
  const cls = ["mk-btn", `mk-btn--${variant}`, onDark && "mk-btn--on-dark"].filter(Boolean).join(" ");
  return (
    <Link href={href} className={cls}>
      {children}
      {variant === "primary" && (
        <span className="mk-btn-arrow">
          <Arrow />
        </span>
      )}
    </Link>
  );
}
