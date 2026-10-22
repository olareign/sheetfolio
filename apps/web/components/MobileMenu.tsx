"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";

export type MenuLink = { href: string; label: string; current?: boolean };

/** Explicit `current` wins; otherwise a page link is current when the path matches it (anchors never are). */
function isCurrent(l: MenuLink, pathname: string): boolean {
  if (l.current !== undefined) return l.current;
  if (!l.href.startsWith("/") || l.href.includes("#")) return false;
  return l.href === "/" ? pathname === "/" : pathname === l.href || pathname.startsWith(`${l.href}/`);
}

/**
 * Hamburger menu for small screens. The button and panel only show below the header's breakpoint (CSS decides, via
 * `className`), so desktop keeps its inline navigation. Accessible as a disclosure: the button reports
 * aria-expanded and controls the panel; Escape, the backdrop, or choosing a link closes it, focus returns to the
 * button, and the page behind does not scroll while it is open. The panel is portalled to <body> because a header
 * with a backdrop blur would otherwise trap a fixed-position panel inside itself.
 */
export function MobileMenu({
  links,
  footer,
  label = "Menu",
  className,
}: {
  links: readonly MenuLink[];
  /** Calls to action under the links (sign in, create your page, WhatsApp...). */
  footer?: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(64);
  // The portal leaves any themed wrapper (public pages set their own theme), so carry the theme across.
  const [theme, setTheme] = useState<string | undefined>(undefined);
  const panelId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const close = useCallback((returnFocus = true) => {
    setOpen(false);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  // A route change (link inside the menu, or back/forward) closes it.
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    const onResize = () => {
      // Grown past the breakpoint: the inline nav is back, so the panel would be orphaned.
      if (buttonRef.current && buttonRef.current.offsetParent === null) setOpen(false);
    };
    const html = document.documentElement;
    const previous = html.style.overflow;
    html.style.overflow = "hidden";
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onResize);
    panelRef.current?.querySelector<HTMLElement>("a, button")?.focus();
    return () => {
      html.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onResize);
    };
  }, [open, close]);

  return (
    <div className={["sp-menu", className].filter(Boolean).join(" ")} data-open={open}>
      <button
        ref={buttonRef}
        type="button"
        className="sp-menu-button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={open ? `Close ${label.toLowerCase()}` : `Open ${label.toLowerCase()}`}
        onClick={() => {
          // The panel drops from the bottom edge of whichever header holds the button.
          const header = buttonRef.current?.closest("header");
          if (header) setTop(Math.round(header.getBoundingClientRect().bottom));
          setTheme(buttonRef.current?.closest<HTMLElement>("[data-theme]")?.dataset.theme);
          setOpen((v) => !v);
        }}
      >
        {open ? (
          <X size={22} strokeWidth={1.75} aria-hidden="true" />
        ) : (
          <Menu size={22} strokeWidth={1.75} aria-hidden="true" />
        )}
      </button>
      {open &&
        createPortal(
          <div className="sp-menu-layer" data-theme={theme} style={{ "--sp-menu-top": `${top}px` } as CSSProperties}>
            <div className="sp-menu-backdrop" onClick={() => close(false)} aria-hidden="true" />
            <div ref={panelRef} id={panelId} className="sp-menu-panel" role="region" aria-label={label}>
              <nav aria-label={label}>
                <ul className="sp-menu-links">
                  {links.map((l, i) => (
                    <li key={l.href} style={{ animationDelay: `${40 + i * 35}ms` }}>
                      <Link href={l.href} aria-current={isCurrent(l, pathname) ? "page" : undefined} onClick={() => setOpen(false)}>
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              {footer && (
                <div
                  className="sp-menu-footer"
                  onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
                >
                  {footer}
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
