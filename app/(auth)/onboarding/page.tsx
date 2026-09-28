import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getUserRecord } from "@/lib/accounts";
import { env } from "@/lib/env";
import { requireUser } from "@/lib/session";
import { SheetPanel } from "@/components/SheetPanel";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Claim your page" };

export default async function OnboardingPage() {
  const user = await requireUser();
  if (await getUserRecord(user.email)) redirect("/dashboard");

  // TODO(product): final domain. Until then show whatever NEXT_PUBLIC_SITE_URL is set to.
  const siteUrl = env().NEXT_PUBLIC_SITE_URL;
  const siteHost = siteUrl ? new URL(siteUrl).host : "siteproof";

  return (
    <SheetPanel sheet="A-02" title="Claim your page">
      <p>Pick the address clients will visit, then tell us who you are. You fill in projects and photos next.</p>
      <OnboardingForm siteHost={siteHost} />
    </SheetPanel>
  );
}
