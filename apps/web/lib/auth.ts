import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { z } from "zod";
import { recordActivity } from "./activity";
import { getUserRecord } from "./accounts";
import { authenticate, getSessionEpoch, isSessionCurrent } from "./credentials";
import { env } from "./env";
import { allowLoginAttempt, clientIp } from "./ratelimit";

const SESSION_DAYS = 30;

/** Thrown from `authorize` so the login action can tell "slow down" apart from "wrong password". */
export class TooManyAttempts extends CredentialsSignin {
  code = "too_many_attempts";
}

const PasswordLogin = z.object({ identifier: z.string().trim().min(1).max(254), password: z.string().min(1).max(128) });

// Lazy config: env is read per request, so `next build` doesn't need secrets.
export const {
  handlers,
  auth,
  signIn,
  signOut,
  /** Re-issues the current session cookie with a fresh epoch, so a password change keeps this device signed in. */
  unstable_update: refreshSession,
} = NextAuth(() => {
  const e = env();

  return {
    secret: e.AUTH_SECRET,
    logger: {
      // A wrong password is expected traffic, and Auth.js would print a stack trace for each one.
      error(error) {
        if (error instanceof CredentialsSignin) return;
        console.error(`[auth][error] ${error.name}: ${error.message}`);
      },
    },
    // Password sign-in only works with JWT sessions: the session is a signed cookie, nothing is stored per session.
    session: { strategy: "jwt", maxAge: SESSION_DAYS * 24 * 60 * 60 },
    providers: [
      Credentials({
        credentials: { identifier: {}, password: {} },
        async authorize(input, request) {
          const parsed = PasswordLogin.safeParse(input);
          if (!parsed.success) return null;
          const { identifier, password } = parsed.data;
          if (!(await allowLoginAttempt(identifier, clientIp(request.headers)))) throw new TooManyAttempts();

          const found = await authenticate(identifier, password);
          if (!found) return null;
          const account = await getUserRecord(found.email);
          await recordActivity({
            type: "login",
            email: found.email,
            ...(account && { slug: account.slug }),
            detail: "Signed in",
          });
          return { id: account?.id ?? `cred:${found.email}`, email: found.email, name: account?.name };
        },
      }),
    ],
    pages: {
      signIn: "/login",
      error: "/login",
    },
    callbacks: {
      async jwt({ token, user, trigger }) {
        const email = (user?.email ?? token.email)?.toLowerCase();
        if (!email) return token;
        // Sign-in or an explicit refresh: stamp the account's current epoch.
        if (user || trigger === "update") {
          token.epoch = await getSessionEpoch(email);
          return token;
        }
        // Every later request: a password change or reset since sign-in has bumped the epoch, so end this session.
        const stamped = typeof token.epoch === "number" ? token.epoch : undefined;
        return (await isSessionCurrent(email, stamped)) ? token : null;
      },
      session({ session, token }) {
        if (token.sub) session.user.id = token.sub;
        return session;
      },
    },
  };
});
