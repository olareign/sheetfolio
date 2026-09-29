import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Sidebar, type NavItem } from "@/components/cms/Sidebar";
import { TopBar } from "@/components/cms/TopBar";
import { ViewsChart } from "@/components/cms/ViewsChart";
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
  const { account, draft, published, unread, weekViews } = await getCmsContext();
  const items: NavItem[] = [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/profile", label: "Profile" },
    ...NAV_COLLECTIONS.map((name) => ({
      href: `/dashboard/${name}`,
      label: collections[name].label,
      count: draft[name].length,
    })),
    { href: "/dashboard/leads", label: "Leads", badge: unread },
    { href: "/dashboard/settings", label: "Settings" },
  ];
  const labels = Object.fromEntries([
    ...NAV_COLLECTIONS.map((n) => [n, collections[n].label]),
    ["profile", "Profile"],
    ["settings", "Settings"],
    ["leads", "Leads"],
  ]);

  return (
    <div className="cms">
      <Sidebar slug={account.slug} items={items} live={Boolean(published)} chart={<ViewsChart days={weekViews} />} />
      <div className="cms-main">
        <TopBar state={publishState(draft, published)} updatedAt={draft.updatedAt} labels={labels} />
        {children}
      </div>
    </div>
  );
}
