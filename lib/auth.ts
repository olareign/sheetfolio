import "server-only";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { env, usesConsoleMail } from "./env";
import { redis } from "./redis";

// Lazy config: env is read per request, so `next build` doesn't need secrets.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const e = env();
  const devConsoleMail = usesConsoleMail();

  return {
    // Adapter keys live under `auth:` so they never mix with the app's own `user:{email}` records.
    adapter: UpstashRedisAdapter(redis(), { baseKeyPrefix: "auth:" }),
    secret: e.AUTH_SECRET,
    session: { strategy: "database" },
    providers: [
      Resend({
        apiKey: e.AUTH_RESEND_KEY,
        from: e.RESEND_FROM,
        maxAge: 60 * 60, // magic links last one hour
        ...(devConsoleMail && {
          // Local development without a Resend key: print the link instead of emailing it.
          // Never active in production (env() refuses to boot without AUTH_RESEND_KEY there).
          async sendVerificationRequest({ identifier, url }: { identifier: string; url: string }) {
            console.info(`\n[auth] Magic link for ${identifier}:\n${url}\n`);
          },
        }),
      }),
    ],
    pages: {
      signIn: "/login",
      verifyRequest: "/login?sent=1",
      error: "/login",
    },
    callbacks: {
      session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
  };
});
