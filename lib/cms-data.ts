import "server-only";
import { cache } from "react";
import { requireAccount } from "./session";
import { getDraft, getPublishedFresh, getUnreadCount, getWeekViews, SiteError } from "./site";

/**
 * Everything the dashboard renders from, loaded once per request (layout + page share it).
 * Always reads fresh from Redis: the CMS must never show a cached draft.
 */
export const getCmsContext = cache(async () => {
  const { email, account } = await requireAccount();
  const [draft, published, unread, weekViews] = await Promise.all([
    getDraft(account.slug),
    getPublishedFresh(account.slug),
    getUnreadCount(account.slug),
    getWeekViews(account.slug),
  ]);
  if (!draft) throw new SiteError("NOT_FOUND", `Draft missing for ${account.slug}`);
  return { email, account, draft, published, unread, weekViews };
});
