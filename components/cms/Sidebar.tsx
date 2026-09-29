"use client";

import { ExternalLink, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOutAction } from "@/app/(admin)/dashboard/actions";
import { Button } from "@/components/sp/Button";

export type NavItem = {
  href: string;
  label: string;
  count?: number;
  /** Highlighted count, e.g. unread leads. */ badge?: number;
};

export function Sidebar({
  slug,
  items,
  live,
  chart,
}: {
  slug: string;
  items: NavItem[];
  live: boolean;
  /** Server-rendered 7-day chart. */
  chart?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="cms-sidebar" aria-label="Dashboard">
      <Link href="/dashboard" className="cms-brand">
        <span className="cms-mark" aria-hidden="true">
          SP
        </span>
        <b>Siteproof</b>
      </Link>
      <div className="cms-site">
        <span className="sp-label">Site</span>
        <code>/{slug}</code>
      </div>
      <nav className="cms-nav" aria-label="Sections">
        {items.map((item) => (
          <Link key={item.href} href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
            <span>{item.label}</span>
            {item.badge ? (
              <span className="cms-badge" aria-label={`${item.badge} unread`}>
                {item.badge}
              </span>
            ) : (
              item.count !== undefined && <span className="cms-count">{item.count}</span>
            )}
          </Link>
        ))}
      </nav>
      {chart}
      <div className="cms-sidebar-foot">
        {live ? (
          <Button
            href={`/${slug}`}
            size="sm"
            target="_blank"
            rel="noopener"
            icon={<ExternalLink size={16} strokeWidth={1.5} aria-hidden="true" />}
          >
            View site
          </Button>
        ) : (
          <span className="sp-annot">Not published yet</span>
        )}
        <form action={signOutAction}>
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            icon={<LogOut size={16} strokeWidth={1.5} aria-hidden="true" />}
          >
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}
