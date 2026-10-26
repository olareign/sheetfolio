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

export { keys } from "./redis-keys";
