"use client";

import {
  Award,
  Briefcase,
  ExternalLink,
  FileText,
  FolderKanban,
  GraduationCap,
  Inbox,
  LayoutDashboard,
  Lock,
  LogOut,
  MessageSquareQuote,
  Settings,
  Sparkles,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Fragment } from "react";
import { signOutAction } from "@/app/(admin)/dashboard/actions";
import { Logo } from "@/components/brand/Logo";
import { initials } from "@/content/derive";

const ICONS = {
  setup: Sparkles,
  overview: LayoutDashboard,
  profile: UserRound,
  experiences: Briefcase,
  projects: FolderKanban,
  certifications: Award,
  education: GraduationCap,
  testimonials: MessageSquareQuote,
  referees: Users,
  cv: FileText,
  leads: Inbox,
  settings: Settings,
} satisfies Record<string, LucideIcon>;

export type NavIcon = keyof typeof ICONS;

export type NavItem = {
  href: string;
  label: string;
  icon: NavIcon;
  /** Items with the same group sit under one heading. */
  group?: string;
  count?: number;
  /** Highlighted count, e.g. unread leads. */ badge?: number;
  /** What the badge counts, for screen readers. Defaults to "unread". */
  badgeLabel?: string;
};

export function Sidebar({
  slug,
  name,
  avatar,
  items,
  live,
  locked = false,
  chart,
}: {
  slug: string;
  name: string;
  avatar?: string;
  items: NavItem[];
  live: boolean;
  /** A new page is held on the setup guide: the other sections are visible but cannot be opened. */
  locked?: boolean;
  /** Server-rendered 7-day chart. */
  chart?: React.ReactNode;
}) {
  const pathname = usePathname();
  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <aside className="cms-sidebar" aria-label="Dashboard">
      <Link href={locked ? "/dashboard/setup" : "/dashboard"} className="cms-brand">
        <Logo height={26} onDark />
      </Link>
      <div className="cms-site">
        {avatar ? (
          <Image className="cms-site-avatar" src={avatar} alt="" width={40} height={40} unoptimized />
        ) : (
          <span className="cms-site-avatar" aria-hidden="true">
            {initials(name)}
          </span>
        )}
        <div className="cms-site-text">
          <b>{name}</b>
          <code>/{slug}</code>
        </div>
        <span className={live ? "cms-site-state is-live" : "cms-site-state"} title={live ? "Live" : "Not published"}>
          <span className="sp-visually-hidden">{live ? "Live" : "Not published"}</span>
        </span>
      </div>
      <nav className="cms-nav" aria-label="Sections">
        {items.map((item, i) => {
          const Icon = ICONS[item.icon];
          const closed = locked && item.icon !== "setup";
          return (
            <Fragment key={item.href}>
              {item.group && item.group !== items[i - 1]?.group && <p className="cms-nav-label">{item.group}</p>}
              {closed ? (
                <span className="cms-nav-closed" aria-disabled="true" title="Finish setup, or skip it, to open this">
                  <Icon className="cms-nav-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span className="cms-nav-text">{item.label}</span>
                  <Lock className="cms-nav-lock" size={13} strokeWidth={1.75} aria-hidden="true" />
                  <span className="sp-visually-hidden">Locked until setup is finished or skipped</span>
                </span>
              ) : (
                <Link href={item.href} aria-current={isActive(item.href) ? "page" : undefined}>
                  <Icon className="cms-nav-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
                  <span className="cms-nav-text">{item.label}</span>
                  {item.badge ? (
                    <span className="cms-badge" aria-label={`${item.badge} ${item.badgeLabel ?? "unread"}`}>
                      {item.badge}
                    </span>
                  ) : (
                    item.count !== undefined && <span className="cms-count">{item.count}</span>
                  )}
                </Link>
              )}
            </Fragment>
          );
        })}
      </nav>
      {chart}
      <div className="cms-sidebar-foot">
        {live ? (
          <Link href={`/${slug}`} target="_blank" rel="noopener" className="cms-foot-btn cms-foot-btn--site">
            <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
            View site
          </Link>
        ) : (
          <span className="cms-foot-note">Not published yet</span>
        )}
        <form action={signOutAction}>
          <button type="submit" className="cms-foot-btn">
            <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
