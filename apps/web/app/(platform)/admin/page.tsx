import {
  ArrowUpRight,
  Eye,
  FileDown,
  Inbox,
  Rocket,
  ShieldAlert,
  Timer,
  UserPlus,
  Users,
  Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { ActivityList } from "@/components/admin/ActivityList";
import { getOverview } from "@/lib/admin";
import { listActivity } from "@/lib/activity";

type Kpi = { label: string; value: string; note?: string; icon: LucideIcon; href?: string; tone?: "warn" };

const n = (value: number) => value.toLocaleString("en");

export default async function AdminOverview() {
  const [o, recent] = await Promise.all([getOverview(), listActivity({ limit: 12 })]);
  const kpis: Kpi[] = [
    {
      label: "Accounts",
      value: n(o.totals.users),
      note: `${n(o.signupsWeek)} joined this week`,
      icon: Users,
      href: "/admin/users",
    },
    {
      label: "Live pages",
      value: n(o.totals.publishedPages),
      note: `of ${n(o.totals.pages)} pages`,
      icon: Rocket,
      href: "/admin/users?status=live",
    },
    {
      label: "Pro accounts",
      value: n(o.totals.proUsers),
      note: "Claude tailoring",
      icon: Zap,
      href: "/admin/users?plan=pro",
    },
    { label: "Page views", value: n(o.viewsWeek), note: "last 7 days", icon: Eye },
    { label: "CV downloads", value: n(o.cvDownloads), note: "all time", icon: FileDown },
    {
      label: "Enquiries",
      value: n(o.leads.total),
      note: `${n(o.leads.unread)} unread`,
      icon: Inbox,
      href: "/admin/leads",
    },
    {
      label: "Time to first publish",
      value: o.medianMinutesToPublish === undefined ? "—" : `${o.medianMinutesToPublish} min`,
      note: o.underThirty.of ? `${o.underThirty.count} of ${o.underThirty.of} under 30 min` : "median",
      icon: Timer,
    },
    {
      label: "Suspended pages",
      value: n(o.totals.suspendedPages),
      note: o.totals.suspendedPages ? "Taken off the public site" : "None",
      icon: ShieldAlert,
      href: "/admin/users?status=suspended",
      tone: o.totals.suspendedPages ? "warn" : undefined,
    },
  ];

  return (
    <>
      <header className="ad-head">
        <div>
          <span className="ad-eyebrow">
            <UserPlus size={14} aria-hidden="true" /> Platform admin
          </span>
          <h1>Overview</h1>
          <p>Every account, page and enquiry on Dosinex, and what people have been doing.</p>
        </div>
      </header>

      <ul className="ad-kpis">
        {kpis.map(({ label, value, note, icon: Icon, href, tone }) => {
          const inner = (
            <>
              <span className="ad-kpi-icon" aria-hidden="true">
                <Icon size={18} strokeWidth={1.75} />
              </span>
              <span className="ad-kpi-label">{label}</span>
              <b className="ad-kpi-value">{value}</b>
              {note && <small>{note}</small>}
              {href && <ArrowUpRight className="ad-kpi-go" size={16} aria-hidden="true" />}
            </>
          );
          return (
            <li key={label} className={tone === "warn" ? "ad-kpi ad-kpi--warn" : "ad-kpi"}>
              {href ? (
                <Link href={href} className="ad-kpi-link">
                  {inner}
                </Link>
              ) : (
                <div className="ad-kpi-link">{inner}</div>
              )}
            </li>
          );
        })}
      </ul>

      <section className="ad-card" aria-labelledby="recent-title">
        <header className="ad-card-head">
          <h2 id="recent-title">Recent activity</h2>
          <Link href="/admin/activity" className="ad-more">
            See all
          </Link>
        </header>
        <ActivityList
          events={recent.events}
          empty="No activity recorded yet. It appears here as people use the site."
        />
      </section>
    </>
  );
}
