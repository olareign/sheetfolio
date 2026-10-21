import type { Metadata } from "next";
import { SheetPanel } from "@/components/SheetPanel";
import { peekResetToken } from "@/lib/credentials";
import { ExpiredLink, ResetForm } from "./ResetForm";

// The token is in the URL: keep it out of Referer headers and search results.
export const metadata: Metadata = {
  title: "Choose a new password",
  referrer: "no-referrer",
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ token?: string }> };

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;
  // Checked without being used up; it is spent only when the new password is saved.
  const valid = token ? (await peekResetToken(token)) !== null : false;

  return (
    <SheetPanel sheet="A-03" title="Choose a new password">
      {valid && token ? (
        <>
          <p className="sp-lead">Pick a new password. You will be signed out everywhere and sign in again with it.</p>
          <ResetForm token={token} />
        </>
      ) : (
        <ExpiredLink />
      )}
    </SheetPanel>
  );
}
