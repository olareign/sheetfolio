import "server-only";
import { Redis } from "@upstash/redis";
import { env } from "./env";

let client: Redis | undefined;

/** Single Upstash client for the server. Never import this from client components. */
export function redis(): Redis {
  if (!client) {
    const { UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN } = env();
    client = new Redis({ url: UPSTASH_REDIS_REST_URL, token: UPSTASH_REDIS_REST_TOKEN });
  }
  return client;
}

/** Every Redis key the app owns, in one place (PRD §5.1). Auth.js keys live under `auth:`. */
export const keys = {
  user: (email: string) => `user:${email.toLowerCase()}`,
  slug: (slug: string) => `slug:${slug}`,
  draft: (slug: string) => `site:${slug}:draft`,
  published: (slug: string) => `site:${slug}:published`,
  viewsDay: (slug: string, day: string) => `views:${slug}:${day}`,
  viewsProject: (slug: string, projectId: string) => `views:${slug}:p:${projectId}`,
  leads: (slug: string) => `leads:${slug}`,
  leadsUnread: (slug: string) => `leads:${slug}:unread`,
  sites: () => "sites",
} as const;
