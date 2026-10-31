import "server-only";
import { z } from "zod";
import { redis } from "./redis";
import { keys } from "./redis-keys";

/*
 * The account activity log the admin console reads: who signed up, signed in, published, received an enquiry, ran a
 * tailoring or was changed by an admin. It lives in Upstash Redis because it is short-lived and capped, not because it
 * matters more than the data in Postgres. Each event holds only what happened and to whom, never a password, a message
 * or an IP address.
 *
 * Recording never breaks the thing being recorded: a Redis failure is logged and the sign-in, publish or enquiry goes on.
 */

import { ACTIVITY_TYPES, type ActivityType } from "./activity-types";

export { ACTIVITY_TYPES, type ActivityType };

export const ActivityEvent = z.object({
  at: z.iso.datetime(),
  type: z.enum(ACTIVITY_TYPES),
  /** The page address the event is about, when there is one. */
  slug: z.string().max(60).optional(),
  email: z.string().max(254).optional(),
  /** A short plain sentence, e.g. "Published the page". Never user-written text. */
  detail: z.string().max(200).optional(),
  /** For admin actions: the admin who did it. */
  actor: z.string().max(254).optional(),
});
export type ActivityEvent = z.infer<typeof ActivityEvent>;

/** Newest events kept in the platform-wide log, and per account. */
export const FEED_MAX = 2000;
export const USER_MAX = 200;
/** Both logs are dropped after this long without a new event. */
const TTL_SECONDS = 90 * 24 * 60 * 60;

export type NewActivity = Omit<ActivityEvent, "at"> & { at?: Date };

export async function recordActivity(input: NewActivity): Promise<void> {
  try {
    const parsed = ActivityEvent.safeParse({ ...input, at: (input.at ?? new Date()).toISOString() });
    if (!parsed.success) return;
    const event = JSON.stringify(parsed.data);
    const client = redis();
    const pipeline = client.pipeline();
    pipeline.lpush(keys.activityFeed(), event);
    pipeline.ltrim(keys.activityFeed(), 0, FEED_MAX - 1);
    pipeline.expire(keys.activityFeed(), TTL_SECONDS);
    if (parsed.data.slug) {
      pipeline.lpush(keys.activityUser(parsed.data.slug), event);
      pipeline.ltrim(keys.activityUser(parsed.data.slug), 0, USER_MAX - 1);
      pipeline.expire(keys.activityUser(parsed.data.slug), TTL_SECONDS);
    }
    await pipeline.exec();
  } catch (err) {
    console.error("[activity] could not record:", err instanceof Error ? err.message : err);
  }
}

/** Redis hands back JSON strings or, through Upstash's client, already-parsed objects; either becomes an event or nothing. */
function toEvent(raw: unknown): ActivityEvent | null {
  try {
    const value = typeof raw === "string" ? JSON.parse(raw) : raw;
    const parsed = ActivityEvent.safeParse(value);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export type ActivityQuery = {
  /** One account's log instead of the platform-wide one. */
  slug?: string;
  type?: ActivityType;
  /** Skip this many of the newest events, for paging. */
  offset?: number;
  limit?: number;
};

/** Newest first. A type filter is applied after reading, so a filtered page can hold fewer than `limit` events. */
export async function listActivity(query: ActivityQuery = {}): Promise<{ events: ActivityEvent[]; more: boolean }> {
  const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
  const offset = Math.max(query.offset ?? 0, 0);
  const key = query.slug ? keys.activityUser(query.slug) : keys.activityFeed();
  // One extra event tells whether another page exists. With a filter, read wider so a page is not left nearly empty.
  const span = query.type ? Math.min(limit * 5, 1000) : limit;
  const raw = await redis().lrange<unknown>(key, offset, offset + span);
  const events = raw.flatMap((r) => toEvent(r) ?? []);
  const matching = query.type ? events.filter((e) => e.type === query.type) : events;
  return { events: matching.slice(0, limit), more: query.type ? raw.length > span : raw.length > limit };
}

/** Events of one type since a moment, from the platform-wide log (e.g. tailoring runs in the last day). */
export async function countActivitySince(type: ActivityType, since: Date): Promise<number> {
  const raw = await redis().lrange<unknown>(keys.activityFeed(), 0, FEED_MAX - 1);
  return raw.filter((r) => {
    const e = toEvent(r);
    return e !== null && e.type === type && Date.parse(e.at) >= since.getTime();
  }).length;
}
