import type { Metadata } from "next";
import Link from "next/link";
import { AuthPanel } from "@/components/AuthPanel";
import { ForgotForm } from "./ForgotForm";

export const metadata: Metadata = { title: "Forgot your password?" };

export default function ForgotPasswordPage() {
  return (
    <AuthPanel title="Forgot your password?">
      <p className="sp-lead">Enter your username or email and we will send you a link to choose a new one.</p>
      <ForgotForm />
      <p className="sp-annot">
        <Link href="/login">Back to sign in</Link>
      </p>
    </AuthPanel>
  );
}
