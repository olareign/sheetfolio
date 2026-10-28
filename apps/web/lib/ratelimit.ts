import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { DAILY_TAILORINGS } from "../content/tailor";
import { redis } from "./redis";

let contact: Ratelimit | undefined;

/** Contact form: 5 enquiries per IP per hour (PRD §3.4, §8). */
export function contactLimiter(): Ratelimit {
  contact ??= new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(5, "1 h"),
    prefix: "ratelimit:contact",
    analytics: false,
  });
  return contact;
}

let loginByAccount: Ratelimit | undefined;
let loginByIp: Ratelimit | undefined;

/**
 * Password sign-in: 8 attempts per account and 30 per IP per 15 minutes. The account limit stops
 * guessing at one password from many addresses; the IP limit stops one address trying many accounts.
 * Fails open if Redis is unreachable, like the contact form: a limiter outage must not lock everyone out.
 */
export async function allowLoginAttempt(identifier: string, ip: string): Promise<boolean> {
  loginByAccount ??= new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(8, "15 m"),
    prefix: "ratelimit:login:account",
    analytics: false,
  });
  loginByIp ??= new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(30, "15 m"),
    prefix: "ratelimit:login:ip",
    analytics: false,
  });
  try {
    const [account, address] = await Promise.all([
      loginByAccount.limit(identifier.trim().toLowerCase()),
      loginByIp.limit(ip),
    ]);
    return account.success && address.success;
  } catch (err) {
    console.error("[auth] rate limiter unavailable:", err instanceof Error ? err.message : err);
    return true;
  }
}

let resetByAccount: Ratelimit | undefined;
let resetByIp: Ratelimit | undefined;

/**
 * Password-reset requests: 3 per account and 10 per IP per hour. This stops someone using the form
 * to flood a person's inbox with reset emails. Fails open like the other limiters.
 */
export async function allowResetRequest(identifier: string, ip: string): Promise<boolean> {
  resetByAccount ??= new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(3, "1 h"),
    prefix: "ratelimit:reset:account",
    analytics: false,
  });
  resetByIp ??= new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "ratelimit:reset:ip",
    analytics: false,
  });
  try {
    const [account, address] = await Promise.all([
      resetByAccount.limit(identifier.trim().toLowerCase()),
      resetByIp.limit(ip),
    ]);
    return account.success && address.success;
  } catch (err) {
    console.error("[auth] rate limiter unavailable:", err instanceof Error ? err.message : err);
    return true;
  }
}

let cvImportByAccount: Ratelimit | undefined;

/** CV imports: 10 per account per hour. Reading a PDF costs real CPU, so a script cannot loop on it. */
export async function allowCvImport(accountKey: string): Promise<boolean> {
  cvImportByAccount ??= new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "ratelimit:cv-import:account",
    analytics: false,
  });
  try {
    return (await cvImportByAccount.limit(accountKey.trim().toLowerCase())).success;
  } catch (err) {
    console.error("[cv-import] rate limiter unavailable:", err instanceof Error ? err.message : err);
    return true;
  }
}

let signupByIp: Ratelimit | undefined;

/** Sign-ups: 10 per IP per hour, enough for a shared office network but not for filling the directory with junk. */
export async function allowSignup(ip: string): Promise<boolean> {
  signupByIp ??= new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(10, "1 h"),
    prefix: "ratelimit:signup:ip",
    analytics: false,
  });
  try {
    return (await signupByIp.limit(ip)).success;
  } catch (err) {
    console.error("[auth] rate limiter unavailable:", err instanceof Error ? err.message : err);
    return true;
  }
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}

let tailorByAccount: Ratelimit | undefined;
const tailorLimiter = (): Ratelimit =>
  (tailorByAccount ??= new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(DAILY_TAILORINGS, "24 h"),
    prefix: "ratelimit:tailor:account",
    analytics: false,
  }));

export type TailorQuota = { remaining: number; limit: number };

/**
 * AI tailorings left today for one account, without using one. Each run costs real money, so unlike the other limiters
 * this one fails closed: if the counter cannot be read, nobody gets a run until it can.
 */
export async function tailorQuota(accountKey: string): Promise<TailorQuota | null> {
  try {
    const { remaining, limit } = await tailorLimiter().getRemaining(accountKey.trim().toLowerCase());
    return { remaining, limit };
  } catch (err) {
    console.error("[tailor] rate limiter unavailable:", err instanceof Error ? err.message : err);
    return null;
  }
}

/** Uses one of today's tailorings. Null when the counter is unavailable (see `tailorQuota`). */
export async function takeTailorRun(accountKey: string): Promise<(TailorQuota & { allowed: boolean }) | null> {
  try {
    const { success, remaining, limit } = await tailorLimiter().limit(accountKey.trim().toLowerCase());
    return { allowed: success, remaining, limit };
  } catch (err) {
    console.error("[tailor] rate limiter unavailable:", err instanceof Error ? err.message : err);
    return null;
  }
}
