"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MENU_BUTTON_ID, useNavDrawer } from "@/components/cms/NavDrawer";
import { ThemeToggle } from "@/components/theme/ThemeToggle";

const TITLES: [prefix: string, title: string][] = [
  ["/admin/users", "Users"],
  ["/admin/content", "Content"],
  ["/admin/leads", "Enquiries"],
  ["/admin/activity", "Activity"],
  ["/admin/system", "System"],
];

export function AdminTopBar() {
  const pathname = usePathname();
  const drawer = useNavDrawer();
  const title = TITLES.find(([prefix]) => pathname.startsWith(prefix))?.[1] ?? "Overview";

  return (
    <header className="cms-topbar">
      <button
        id={MENU_BUTTON_ID}
        type="button"
        className="cms-menu-btn"
        onClick={drawer.show}
        aria-label="Open menu"
        aria-expanded={drawer.open}
        aria-controls="cms-drawer"
      >
        <Menu size={20} strokeWidth={1.75} aria-hidden="true" />
      </button>
      <nav className="cms-crumbs sp-label" aria-label="Breadcrumb">
        <span className="cms-crumbs">
          <Link href="/admin">Admin</Link>
        </span>
        <span className="cms-crumbs">
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </span>
      </nav>
      <div className="cms-topbar-actions">
        <ThemeToggle className="cms-topbar-theme" />
        <Link href="/dashboard" className="sp-btn sp-btn--sm">
          Your dashboard
        </Link>
      </div>
    </header>
  );
}
