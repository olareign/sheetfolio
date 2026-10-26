import type { Redis } from "@upstash/redis";
import type { KV } from "./credentials";

/** Redis, narrowed to what reset tokens need, so the app and the operator scripts bind the same way. */
export function kvFor(redis: () => Redis): () => KV {
  return () => {
    const client = redis();
    return {
      get: (key) => client.get(key),
      set: (key, value, opts) => client.set(key, value, opts),
      del: (...ks) => client.del(...ks),
      incr: (key) => client.incr(key),
      getdel: (key) => client.getdel(key),
    };
  };
}
