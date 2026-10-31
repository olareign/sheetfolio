"use client";

import { Activity, ExternalLink, FileStack, Inbox, LayoutDashboard, LogOut, ServerCog, Users, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { signOutAction } from "@/app/(admin)/dashboard/actions";
import { useNavDrawer } from "@/components/cms/NavDrawer";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const NAV = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users, exact: false },
  { href: "/admin/content", label: "Content", icon: FileStack, exact: false },
  { href: "/admin/leads", label: "Enquiries", icon: Inbox, exact: false },
  { href: "/admin/activity", label: "Activity", icon: Activity, exact: false },
  { href: "/admin/system", label: "System", icon: ServerCog, exact: false },
] as const;

/** The admin console's menu: a sidebar on a desktop, the same drawer as the dashboard on a phone. */
export function AdminSidebar({ email }: { email: string }) {
  const pathname = usePathname();
  const drawer = useNavDrawer();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (drawer.open) closeRef.current?.focus();
  }, [drawer.open]);
  const isActive = (href: string, exact: boolean) => (exact ? pathname === href : pathname.startsWith(href));

  return (
    <>
      <aside id="cms-drawer" className="cms-sidebar" aria-label="Admin" data-open={drawer.open}>
        <div className="cms-side-head">
          <Link href="/admin" className="cms-brand">
            <Logo height={26} onDark />
          </Link>
          <button
            ref={closeRef}
            type="button"
            className="cms-drawer-close"
            onClick={drawer.hide}
            aria-label="Close menu"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>
        <div className="ad-who">
          <span className="ad-pill">Platform admin</span>
          <code title={email}>{email}</code>
        </div>
        <nav className="cms-nav" aria-label="Admin sections">
          {NAV.map(({ href, label, icon: Icon, exact }) => (
            <Link key={href} href={href} aria-current={isActive(href, exact) ? "page" : undefined}>
              <Icon className="cms-nav-icon" size={18} strokeWidth={1.75} aria-hidden="true" />
              <span className="cms-nav-text">{label}</span>
            </Link>
          ))}
        </nav>
        <div className="cms-sidebar-foot">
          <div className="cms-foot-theme ad-theme-row">
            <span>Light or dark</span>
            <ThemeToggle />
          </div>
          <Link href="/dashboard" className="cms-foot-btn cms-foot-btn--site">
            <ExternalLink size={16} strokeWidth={1.75} aria-hidden="true" />
            Your dashboard
          </Link>
          <form action={signOutAction}>
            <button type="submit" className="cms-foot-btn">
              <LogOut size={16} strokeWidth={1.75} aria-hidden="true" />
              Sign out
            </button>
          </form>
        </div>
      </aside>
      <button
        type="button"
        className="cms-scrim"
        data-open={drawer.open}
        onClick={drawer.hide}
        aria-label="Close menu"
        tabIndex={-1}
      />
    </>
  );
}
