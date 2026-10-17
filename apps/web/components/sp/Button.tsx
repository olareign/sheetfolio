import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

export type ButtonVariant = "cta" | "primary" | "default" | "ghost";
export type ButtonSize = "md" | "sm";

type CommonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: ReactNode;
  children?: ReactNode;
  className?: string;
};

type AnchorProps = CommonProps & {
  href: string;
  /** Plain <a> instead of a client-side <Link>: downloads and API routes. External/hash links are always plain. */
  native?: boolean;
} & Omit<ComponentPropsWithoutRef<"a">, keyof CommonProps | "href">;
type NativeButtonProps = CommonProps & { href?: undefined } & Omit<
    ComponentPropsWithoutRef<"button">,
    keyof CommonProps
  >;
export type ButtonProps = AnchorProps | NativeButtonProps;

export function buttonClass(variant: ButtonVariant = "default", size: ButtonSize = "md", extra?: string): string {
  return ["sp-btn", variant !== "default" && `sp-btn--${variant}`, size === "sm" && "sp-btn--sm", extra]
    .filter(Boolean)
    .join(" ");
}

/** DESIGN_SYSTEM §7.1. `cta` is the single safety-orange action per view. Icon-only buttons need `aria-label`. */
export function Button(props: ButtonProps) {
  if (props.href !== undefined) {
    const { variant, size, icon, children, className, href, native, ...rest } = props;
    const Anchor = native || !href.startsWith("/") ? "a" : Link;
    return (
      <Anchor href={href} className={buttonClass(variant, size, className)} {...rest}>
        {icon}
        {children}
      </Anchor>
    );
  }
  const { variant, size, icon, children, className, type = "button", ...rest } = props;
  return (
    <button type={type} className={buttonClass(variant, size, className)} {...rest}>
      {icon}
      {children}
    </button>
  );
}
