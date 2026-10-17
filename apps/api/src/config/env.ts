import { z } from "zod";

// `.env.example` ships blank values (`KEY=`); a blank optional variable means "not set".
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((v) => (typeof v === "string" && v.trim() === "" ? undefined : v), schema.optional());

const EnvSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    PORT: z.coerce.number().int().min(1).max(65535).default(4000),
    WEB_ORIGIN: optional(z.url()),
    RESEND_API_KEY: optional(z.string()),
    RESEND_FROM: optional(z.string()).transform((v) => v ?? "Sheetfolio <onboarding@resend.dev>"),
  })
  .superRefine((env, ctx) => {
    // Outside production, mail without a key is printed to the console so local runs need no
    // Resend account. Production must be able to send, and must say which site may call it.
    if (env.NODE_ENV !== "production") return;
    if (!env.RESEND_API_KEY)
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "Required in production" });
    if (!env.WEB_ORIGIN) ctx.addIssue({ code: "custom", path: ["WEB_ORIGIN"], message: "Required in production" });
  });

export type Env = z.infer<typeof EnvSchema>;

/** Injection token for the validated environment. */
export const ENV = Symbol("ENV");

/** Throws one readable error listing every problem, so a bad deploy fails at boot, not mid-request. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const parsed = EnvSchema.safeParse(source);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
  }
  return parsed.data;
}
