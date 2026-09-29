import "server-only";
import { z } from "zod";

// `.env.example` ships blank values (`KEY=`); a blank optional variable means "not set".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    UPSTASH_REDIS_REST_URL: z.url(),
    UPSTASH_REDIS_REST_TOKEN: z.string().min(1),
    AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters (run `npx auth secret`)"),
    AUTH_RESEND_KEY: optional(z.string()),
    RESEND_FROM: optional(z.string()).transform((v) => v ?? "Sheetfolio <onboarding@resend.dev>"),
    BLOB_READ_WRITE_TOKEN: optional(z.string()),
    NEXT_PUBLIC_SITE_URL: optional(z.url()),
    ADMIN_EMAILS: optional(z.string()).transform((raw) =>
      (raw ?? "")
        .split(",")
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  })
  .superRefine((env, ctx) => {
    // Outside production the magic link is printed to the server console instead of emailed,
    // so local runs work without a Resend account. Production must be able to send mail.
    if (env.NODE_ENV === "production" && !env.AUTH_RESEND_KEY) {
      ctx.addIssue({ code: "custom", path: ["AUTH_RESEND_KEY"], message: "Required in production" });
    }
  });

export type Env = z.infer<typeof EnvSchema>;

/** Pure parser, exported for tests. Throws one readable error listing every problem. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
  }
  return parsed.data;
}

let cached: Env | undefined;

/** Validated server environment. Parsed lazily so `next build` can run without secrets. */
export function env(): Env {
  cached ??= parseEnv(process.env);
  return cached;
}

export function isAdminEmail(email: string): boolean {
  return env().ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

/** Local development without a Resend key: magic links are printed to the server console. */
export function usesConsoleMail(): boolean {
  const e = env();
  return e.NODE_ENV !== "production" && !e.AUTH_RESEND_KEY;
}

/**
 * Public base URL for absolute links (metadataBase, sitemap, OG). Validated on its own because it is
 * needed at build time, when the server secrets checked by `env()` may be absent.
 */
export function publicSiteUrl(): URL {
  const parsed = z.url().safeParse(process.env.NEXT_PUBLIC_SITE_URL);
  return new URL(parsed.success ? parsed.data : "http://localhost:3000");
}
