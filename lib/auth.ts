import "server-only";
import NextAuth from "next-auth";
import Resend from "next-auth/providers/resend";
import { UpstashRedisAdapter } from "@auth/upstash-redis-adapter";
import { sendEmail } from "./email";
import { signInEmail } from "./email-templates";
import { env } from "./env";
import { redis } from "./redis";

const MAGIC_LINK_MINUTES = 60;

// Lazy config: env is read per request, so `next build` doesn't need secrets.
export const { handlers, auth, signIn, signOut } = NextAuth(() => {
  const e = env();

  return {
    // Adapter keys live under `auth:` so they never mix with the app's own `user:{email}` records.
    adapter: UpstashRedisAdapter(redis(), { baseKeyPrefix: "auth:" }),
    secret: e.AUTH_SECRET,
    session: { strategy: "database" },
    providers: [
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
      session({ session, user }) {
        session.user.id = user.id;
        return session;
      },
    },
  };
});
