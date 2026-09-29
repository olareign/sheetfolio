import type { Metadata } from "next";
import { PreviewBanner } from "@/components/public/PreviewBanner";
import { ProfilePage } from "@/components/public/ProfilePage";
import { getCmsContext } from "@/lib/cms-data";
import "@/styles/public.css";

export const metadata: Metadata = { title: "Preview", robots: { index: false, follow: false } };

/** The signed-in engineer's draft, rendered exactly like the public page. */
export default async function PreviewPage() {
  const { account, draft, published } = await getCmsContext();
  return (
    <>
      <PreviewBanner live={Boolean(published)} />
      <ProfilePage site={draft} slug={account.slug} basePath="/preview" />
    </>
  );
}
