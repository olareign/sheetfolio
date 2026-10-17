import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { usesConsoleMail } from "@/lib/env";
import { SheetPanel } from "@/components/SheetPanel";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

// Auth.js error codes → plain-language messages. Anything unknown gets the generic one.
const ERROR_MESSAGES: Record<string, string> = {
  Verification: "That sign-in link has expired or was already used. Request a new one.",
  AccessDenied: "Access denied for this email address.",
  // Auth.js also reports a failed email send as "Configuration".
  Configuration:
    "We couldn't send your sign-in email. Try again in a few minutes, or contact support if it keeps happening.",
};

type Props = { searchParams: Promise<{ sent?: string; error?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { sent, error } = await searchParams;
  const devConsoleMail = usesConsoleMail();

  if (sent) {
    return (
      <SheetPanel sheet="A-01" title="Check your email">
        <p>We sent you a sign-in link. It works once and expires in one hour.</p>
        {devConsoleMail && (
          <p className="sp-note">
            Development mode: no Resend key is set, so the link was printed to the server console.
          </p>
        )}
        <p className="sp-annot">
          Wrong address? <Link href="/login">Use a different email</Link>
        </p>
      </SheetPanel>
    );
  }

  return (
    <SheetPanel sheet="A-01" title="Sign in">
      <p className="sp-lead">Manage your Sheetfolio page.</p>
      {error && (
        <p className="sp-alert" role="alert">
          {ERROR_MESSAGES[error] ?? "Sign-in failed. Request a new link."}
        </p>
      )}
      <LoginForm />
    </SheetPanel>
  );
}
