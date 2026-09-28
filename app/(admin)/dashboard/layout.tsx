import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar, type NavItem } from "@/components/cms/Sidebar";
import { TopBar } from "@/components/cms/TopBar";
import { publishState } from "@/content/cms";
import { collections, type CollectionName } from "@/content/schemas";
import { getCmsContext } from "@/lib/cms-data";
import "@/styles/cms.css";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Dashboard · Siteproof" } };

const NAV_COLLECTIONS: CollectionName[] = [
  "experiences",
  "projects",
  "certifications",
  "education",
  "testimonials",
  "referees",
];

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const { account, draft, published } = await getCmsContext();
  // TODO(day 4): Leads inbox with unread badge and the 7-day views chart.
  const items: NavItem[] = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/profile", label: "Profile" },
    ...NAV_COLLECTIONS.map((name) => ({
      href: `/dashboard/${name}`,
      label: collections[name].label,
      count: draft[name].length,
    })),
    { href: "/dashboard/settings", label: "Settings" },
  ];
  const labels = Object.fromEntries([
    ...NAV_COLLECTIONS.map((n) => [n, collections[n].label]),
    ["profile", "Profile"],
    ["settings", "Settings"],
  ]);

  return (
    <div className="cms">
      <Sidebar slug={account.slug} items={items} live={Boolean(published)} />
      <div className="cms-main">
        <TopBar state={publishState(draft, published)} updatedAt={draft.updatedAt} labels={labels} />
        {children}
      </div>
    </div>
  );
}
