import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
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

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
