import "server-only";
import { redirect } from "next/navigation";
import type { UserRecord } from "@/content/schemas";
import { getUserRecord } from "./accounts";
import { auth } from "./auth";

export type SessionUser = { id: string; email: string };

/** Signed-in user or redirect to /login. Use in every protected page and Server Action. */
export async function requireUser(): Promise<SessionUser> {
  const session = await auth();
  const id = session?.user?.id;
  const email = session?.user?.email;
  if (!id || !email) redirect("/login");
  return { id, email: email.toLowerCase() };
}

/** Signed-in user who has claimed a slug, or redirect to /onboarding. */
export async function requireAccount(): Promise<SessionUser & { account: UserRecord }> {
  const user = await requireUser();
  const account = await getUserRecord(user.email);
  if (!account) redirect("/onboarding");
  return { ...user, account };
}
