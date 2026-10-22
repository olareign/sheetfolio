import type { DayViews } from "@/lib/site";

/*
 * Pure maths behind the dashboard Overview: weekly view buckets and the month-on-month change. No I/O, so it is
 * tested on its own and the page only fetches.
 */

export type WeekViews = { start: string; views: number };

/** Groups daily counts (oldest first) into 7-day weeks ending on the last day given. Leftover oldest days are dropped. */
export function weeklyViews(days: readonly DayViews[]): WeekViews[] {
  const weeks: WeekViews[] = [];
  for (let end = days.length; end - 7 >= 0; end -= 7) {
    const slice = days.slice(end - 7, end);
    weeks.unshift({ start: slice[0]?.date ?? "", views: slice.reduce((n, d) => n + d.views, 0) });
  }
  return weeks;
}

/** Views in the last 30 days and the change against the 30 days before. `change` is null when there is nothing to compare with. */
export function monthChange(days: readonly DayViews[]): { current: number; previous: number; change: number | null } {
  const sum = (xs: readonly DayViews[]) => xs.reduce((n, d) => n + d.views, 0);
  const current = sum(days.slice(-30));
  const previous = sum(days.slice(-60, -30));
  const change = previous === 0 ? null : Math.round(((current - previous) / previous) * 100);
  return { current, previous, change };
}

export function changeLabel({ current, change }: { current: number; change: number | null }): string {
  if (change === null) return current > 0 ? "New this month" : "No views yet";
  if (change === 0) return "Same as last month";
  return `${change > 0 ? "+" : ""}${change}% this month`;
}

/** "now", "5m", "2h", "3d", "4w" between `iso` and `now`. Compact on purpose: it sits beside a name in a list. */
export function ago(iso: string, now: Date): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  return days < 7 ? `${days}d` : `${Math.floor(days / 7)}w`;
}
