import type { Metadata } from "next";
import type { ReactNode } from "react";
import { SetupGate } from "@/components/cms/SetupGate";
import { Sidebar, type NavItem } from "@/components/cms/Sidebar";
import { TopBar } from "@/components/cms/TopBar";
import { UnsavedChangesProvider } from "@/components/cms/UnsavedChanges";
import { ViewsChart } from "@/components/cms/ViewsChart";
import { publishState } from "@/content/cms";
import { missingRequired, setupLocked } from "@/content/setup";
import { collections, type CollectionName } from "@/content/schemas";
import { getCmsContext } from "@/lib/cms-data";
import "@/styles/cms.css";

export const metadata: Metadata = { title: { default: "Dashboard", template: "%s · Dashboard · Dosinex" } };

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
  // The setup guide stays in the menu until the page is live and has what it needs; then it is just clutter.
  const required = {
    summary: draft.profile.summary,
    location: draft.profile.location,
    whatsapp: draft.profile.whatsapp,
  };
  const missing = missingRequired(required).length;
  // A new page stays on the setup guide until it has the basics, unless the owner skips.
  const locked = setupLocked({ ...required, published: Boolean(published), skipped: draft.settings.setupSkipped });
  const items: NavItem[] = [
    ...(published && missing === 0
      ? []
      : [
          {
            href: "/dashboard/setup",
            label: "Setup guide",
            icon: "setup" as const,
            badge: missing || undefined,
            badgeLabel: "to do",
          },
        ]),
    { href: "/dashboard", label: "Overview", icon: "overview", group: "Workspace" },
    { href: "/dashboard/profile", label: "Profile", icon: "profile", group: "Your page" },
    ...NAV_COLLECTIONS.map((name) => ({
      href: `/dashboard/${name}`,
      label: collections[name].label,
      icon: name,
      group: "Your page",
      count: draft[name].length,
    })),
    { href: "/dashboard/tailor", label: "Tailor to a job", icon: "tailor", group: "Share" },
    { href: "/dashboard/cv", label: "CV", icon: "cv", group: "Share" },
    { href: "/dashboard/leads", label: "Leads", icon: "leads", group: "Share", badge: unread },
    { href: "/dashboard/settings", label: "Settings", icon: "settings", group: "Share" },
  ];
  const labels = Object.fromEntries([
    ...NAV_COLLECTIONS.map((n) => [n, collections[n].label]),
    ["setup", "Setup guide"],
    ["profile", "Profile"],
    ["tailor", "Tailor to a job"],
    ["cv", "CV"],
    ["settings", "Settings"],
    ["leads", "Leads"],
  ]);

  return (
    <UnsavedChangesProvider>
      <div className="cms">
        <Sidebar
          slug={account.slug}
          name={draft.profile.name}
          avatar={draft.profile.avatar}
          items={items}
          live={Boolean(published)}
          locked={locked}
          chart={locked ? undefined : <ViewsChart days={weekViews} />}
        />
        <div className="cms-main">
          <TopBar state={publishState(draft, published)} updatedAt={draft.updatedAt} labels={labels} locked={locked} />
          <SetupGate locked={locked}>{children}</SetupGate>
        </div>
      </div>
    </UnsavedChangesProvider>
  );
}
