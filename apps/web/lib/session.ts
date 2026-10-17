import "server-only";
import { notFound, redirect } from "next/navigation";
import type { UserRecord } from "@/content/schemas";
import { getUserRecord } from "./accounts";
import { auth } from "./auth";
import { isAdminEmail } from "./env";

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

/**
 * Platform admin (PRD §2): the `admin` role from onboarding, or an address in ADMIN_EMAILS
 * (so an admin needs no site of their own). Everyone else gets a 404, not a hint that /admin exists.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (isAdminEmail(user.email)) return user;
  const account = await getUserRecord(user.email);
  if (account?.role === "admin") return user;
  notFound();
}
