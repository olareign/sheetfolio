import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthPanel } from "@/components/AuthPanel";
import { auth } from "@/lib/auth";
import { env } from "@/lib/env";
import { SignupForm } from "./SignupForm";

export const metadata: Metadata = {
  title: "Create your page",
  description: "Make your Sheetfolio page in a few minutes. Free while we test.",
};

export default async function SignupPage() {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const siteUrl = env().NEXT_PUBLIC_SITE_URL;
  const siteHost = siteUrl ? new URL(siteUrl).host : "sheetfolio";

  return (
    <AuthPanel title="Create your page">
      <p className="sp-lead">Tell us who you are and pick your address. You add your work next.</p>
      <SignupForm siteHost={siteHost} />
      <p className="sp-annot">
        Already have a page? <Link href="/login">Sign in</Link>
      </p>
    </AuthPanel>
  );
}
