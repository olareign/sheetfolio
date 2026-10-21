import "server-only";
import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Resend from "next-auth/providers/resend";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { z } from "zod";
import { getUserRecord } from "./accounts";
import { authenticate, getSessionEpoch, isSessionCurrent } from "./credentials";
import { sendEmail } from "./email";
import { signInEmail } from "./email-templates";
import { env } from "./env";
import { allowLoginAttempt, clientIp } from "./ratelimit";
import { redis } from "./redis";

const MAGIC_LINK_MINUTES = 60;
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
    // Adapter keys live under `auth:` so they never mix with the app's own `user:{email}` records.
    adapter: UpstashRedisAdapter(redis(), { baseKeyPrefix: "auth:" }),
    secret: e.AUTH_SECRET,
    logger: {
      // A wrong password is expected traffic, and Auth.js would print a stack trace for each one.
      error(error) {
        if (error instanceof CredentialsSignin) return;
        console.error(`[auth][error] ${error.name}: ${error.message}`);
      },
    },
    // Password sign-in only works with JWT sessions. The adapter still stores users and the
    // one-time email-link tokens; the session itself is a signed cookie.
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
          return { id: account?.id ?? `cred:${found.email}`, email: found.email, name: account?.name };
        },
      }),
      Resend({
        apiKey: e.AUTH_RESEND_KEY,
        from: e.RESEND_FROM,
        maxAge: MAGIC_LINK_MINUTES * 60,
        // Branded template instead of Auth.js's generic one. `sendEmail` prints to the dev server log
        // when no Resend key is set outside production (production refuses to boot without one).
        async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
          const content = signInEmail({ url, email: identifier, expiresInMinutes: MAGIC_LINK_MINUTES });
          await sendEmail({ to: identifier, ...content });
        },
      }),
    ],
    pages: {
      signIn: "/login",
      verifyRequest: "/login?sent=1",
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
