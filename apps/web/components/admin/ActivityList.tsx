import {
  Activity as Pulse,
  Inbox,
  LogIn,
  Rocket,
  ShieldCheck,
  Sparkles,
  UserPlus,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { LocalTime } from "@/components/cms/LocalTime";
import type { ActivityEvent } from "@/lib/activity";
import type { ActivityType } from "@/lib/activity-types";

const ICONS: Record<ActivityType, LucideIcon> = {
  signup: UserPlus,
  login: LogIn,
  publish: Rocket,
  lead: Inbox,
  tailor: Sparkles,
  admin: ShieldCheck,
};

function who(e: ActivityEvent) {
  if (e.type === "admin") return e.actor ?? "An admin";
  return e.email ?? (e.slug ? `/${e.slug}` : "Someone");
}

/** A readable timeline. Account addresses link to the account's admin page. */
export function ActivityList({
  events,
  empty = "Nothing has happened yet.",
}: {
  events: ActivityEvent[];
  empty?: string;
}) {
  if (events.length === 0) {
    return (
      <p className="ad-empty">
        <Pulse size={16} aria-hidden="true" /> {empty}
      </p>
    );
  }
  return (
    <ol className="ad-feed">
      {events.map((e, i) => {
        const Icon = ICONS[e.type];
        return (
          <li key={`${e.at}-${i}`} className={`ad-feed-item ad-feed--${e.type}`}>
            <span className="ad-feed-icon" aria-hidden="true">
              <Icon size={15} strokeWidth={1.75} />
            </span>
            <div className="ad-feed-text">
              <p>
                <b>{who(e)}</b> {e.detail ?? e.type}
                {e.slug && e.type !== "signup" && (
                  <>
                    {" "}
                    · <Link href={`/admin/users/${e.slug}`}>/{e.slug}</Link>
                  </>
                )}
              </p>
              <small>
                <LocalTime iso={e.at} format="datetime" />
              </small>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
