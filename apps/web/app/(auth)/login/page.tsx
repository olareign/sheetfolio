import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AuthPanel } from "@/components/AuthPanel";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in" };

// Auth.js redirects here with an error code when something fails before the form's own handling.
const ERROR_MESSAGES: Record<string, string> = {
  AccessDenied: "Access denied for this account.",
};

type Props = { searchParams: Promise<{ error?: string; reset?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { error, reset } = await searchParams;

  return (
    <AuthPanel title="Sign in">
      <p className="sp-lead">Manage your Dosinex page.</p>
      {reset && (
        <p className="sp-note" role="status">
          Password updated. Sign in with your new password.
        </p>
      )}
      {error && (
        <p className="sp-alert" role="alert">
          {ERROR_MESSAGES[error] ?? "Sign-in failed. Check your details and try again."}
        </p>
      )}
      <LoginForm />
      <p className="sp-annot">
        <Link href="/forgot-password">Forgot your password?</Link>
        {" · "}
        <Link href="/signup">Create your page</Link>
      </p>
    </AuthPanel>
  );
}
