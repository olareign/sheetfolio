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

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "unknown";
}
