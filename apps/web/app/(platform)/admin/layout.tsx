import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminTopBar } from "@/components/admin/AdminTopBar";
import { NavDrawerProvider } from "@/components/cms/NavDrawer";
import { requireAdmin } from "@/lib/session";
import "@/styles/cms.css";
import "@/styles/admin.css";

// Neutral title: a non-admin gets a 404 and nothing should hint that /admin exists.
export const metadata: Metadata = { title: { absolute: "Dosinex" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: ReactNode }) {
  // Every page below is behind this check; the Server Actions repeat it, because they can be called on their own.
  const { email } = await requireAdmin();
  return (
    <NavDrawerProvider>
      <div className="cms ad">
        <AdminSidebar email={email} />
        <div className="cms-main">
          <AdminTopBar />
          <main className="cms-content ad-page">{children}</main>
        </div>
      </div>
    </NavDrawerProvider>
  );
}
