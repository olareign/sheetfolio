import { ArrowRight, ArrowUpRight, Eye, FileDown, FolderKanban, Inbox, TrendingDown, TrendingUp } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CoverImage } from "@/components/sp/CoverImage";
import type { Cover } from "@/content/covers";
import { initials } from "@/content/derive";
import type { StrengthItem, WeekViews } from "@/content/insights";
import { CopyLink } from "./CopyLink";
import { seriesPoints, smoothPath } from "./chart-path";

const number = new Intl.NumberFormat("en");
const shortDate = new Intl.DateTimeFormat("en", { month: "short", day: "numeric", timeZone: "UTC" });
const weekLabel = (iso: string) => shortDate.format(new Date(`${iso}T00:00:00Z`));

export type InsightsData = {
  name: string;
  firstName: string;
  headline: string;
  slug: string;
  /** The page's full public address, for copying. */
  pageUrl: string;
  avatar?: string;
  live: boolean;
  state: { label: string; tone: "live" | "changes" | "off" };
  lede: string;
  views: { total: number; note: string; change: number | null; spark: number[] };
  enquiries: { total: number; unread: number };
  cv: { downloads: number; layout: string };
  projects: { total: number; withPhotos: number };
  weeks: WeekViews[];
  topProjects: { id: string; title: string; sub: string; views: number; cover: Cover }[];
  latestLeads: { id: string; name: string; message: string; ago: string; unread: boolean }[];
  strength: { percent: number; items: StrengthItem[] };
  /** Up to three project covers for the miniature of the page in the header. */
  covers: Cover[];
};

/** Names get one of six soft colours, always the same one for the same name. */
function tone(name: string): number {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 997;
  return h % 6;
}

function Avatar({ name, src, size }: { name: string; src?: string; size: number }) {
  return src ? (
    <Image className="ov-avatar" src={src} alt="" width={size} height={size} unoptimized />
  ) : (
    <span
      className={`ov-avatar ov-avatar--t${tone(name)}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

/** A thin line with a soft fill under it, drawn in a 100 × 32 box that stretches to fit its card. */
function Sparkline({ values, id }: { values: number[]; id: string }) {
  const pts = seriesPoints(values, 12).map(([x, y]) => [x, (y / 100) * 32] as const);
  const first = pts[0];
  const last = pts[pts.length - 1];
  if (!first || !last) return null;
  const line = smoothPath(pts);
  return (
    <svg className="ov-spark" viewBox="0 0 100 32" preserveAspectRatio="none" aria-hidden="true">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.28" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${last[0]},32 L${first[0]},32 Z`} fill={`url(#${id})`} />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
        strokeLinecap="round"
      />
    </svg>
  );
}

function Kpi({
  icon,
  accent,
  label,
  value,
  chip,
  href,
  children,
}: {
  icon: React.ReactNode;
  accent: "indigo" | "violet" | "emerald" | "amber";
  label: string;
  value: number;
  chip?: React.ReactNode;
  href?: string;
  children?: React.ReactNode;
}) {
  const body = (
    <>
      <div className="ov-kpi-top">
        <span className="ov-kpi-icon" aria-hidden="true">
          {icon}
        </span>
        {chip}
        {href && <ArrowUpRight className="ov-kpi-go" size={16} strokeWidth={1.75} aria-hidden="true" />}
      </div>
      <b className="ov-kpi-value">{number.format(value)}</b>
      <span className="ov-kpi-label">{label}</span>
      {children}
    </>
  );
  const className = `ov-kpi ov-kpi--${accent}`;
  return href ? (
    <Link href={href} className={`${className} ov-kpi--link`}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

function Delta({ change, fallback }: { change: number | null; fallback: string }) {
  if (change === null || change === 0) return <span className="ov-chip">{change === 0 ? "Steady" : fallback}</span>;
  const up = change > 0;
  const Icon = up ? TrendingUp : TrendingDown;
  return (
    <span className={`ov-chip ${up ? "ov-chip--up" : "ov-chip--down"}`}>
      <Icon size={13} strokeWidth={2} aria-hidden="true" />
      {up ? "+" : ""}
      {change}%
    </span>
  );
}

function ViewsCard({ weeks }: { weeks: WeekViews[] }) {
  const values = weeks.map((w) => w.views);
  const total = values.reduce((n, v) => n + v, 0);
  const max = Math.max(1, ...values);
  const peak = weeks.reduce<WeekViews | undefined>((best, w) => (!best || w.views > best.views ? w : best), undefined);
  const pts = seriesPoints(values);
  const line = smoothPath(pts);
  const first = pts[0];
  const last = pts[pts.length - 1];
  return (
    <section className="ov-card ov-views" aria-labelledby="ov-views-h">
      <header className="ov-card-head">
        <div>
          <h2 id="ov-views-h">Page views</h2>
          <p>Last {weeks.length} weeks</p>
        </div>
        <div className="ov-views-sum">
          <b>{number.format(total)}</b>
          {total > 0 && peak && <span>Best week: {number.format(peak.views)}</span>}
        </div>
      </header>
      <div className="ov-plot">
        <div className="ov-plot-y" aria-hidden="true">
          <span>{number.format(max)}</span>
          <span>{max > 1 ? number.format(Math.round(max / 2)) : ""}</span>
          <span>0</span>
        </div>
        <div className="ov-plot-area">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            <defs>
              <linearGradient id="ov-fill" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0" stopColor="var(--blueprint)" stopOpacity="0.32" />
                <stop offset="1" stopColor="var(--blueprint)" stopOpacity="0" />
              </linearGradient>
            </defs>
            {first && last && (
              <>
                <path className="ov-plot-fill" d={`${line} L${last[0]},100 L${first[0]},100 Z`} fill="url(#ov-fill)" />
                <path className="ov-plot-line" d={line} fill="none" vectorEffect="non-scaling-stroke" />
              </>
            )}
          </svg>
          <ol className="ov-plot-cols" aria-hidden="true">
            {weeks.map((w, i) => (
              <li key={w.start} style={{ ["--y" as string]: `${pts[i]?.[1] ?? 100}%` }}>
                <i className="ov-plot-dot" />
                <span className="ov-tip">
                  <b>{number.format(w.views)}</b> {w.views === 1 ? "view" : "views"}
                  <small>Week of {weekLabel(w.start)}</small>
                </span>
              </li>
            ))}
          </ol>
        </div>
        <div className="ov-plot-x" aria-hidden="true">
          {weeks.map((w, i) => (
            <span key={w.start}>{i % 3 === 0 || i === weeks.length - 1 ? weekLabel(w.start) : ""}</span>
          ))}
        </div>
      </div>
      <table className="sp-visually-hidden">
        <caption>Page views by week</caption>
        <tbody>
          {weeks.map((w) => (
            <tr key={w.start}>
              <th scope="row">Week of {w.start}</th>
              <td>{w.views}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {total === 0 && <p className="ov-empty">No views yet. Share your page link to start seeing visits.</p>}
    </section>
  );
}

function StrengthCard({ strength }: { strength: InsightsData["strength"] }) {
  const todo = strength.items.filter((i) => !i.done);
  const done = strength.items.length - todo.length;
  const C = 2 * Math.PI * 40;
  return (
    <section className="ov-card ov-strength" aria-labelledby="ov-strength-h">
      <header className="ov-strength-head">
        <div className="ov-ring" role="img" aria-label={`${strength.percent}% of your page is complete`}>
          <svg viewBox="0 0 100 100" aria-hidden="true">
            <circle className="ov-ring-track" cx="50" cy="50" r="40" />
            <circle
              className="ov-ring-bar"
              cx="50"
              cy="50"
              r="40"
              strokeDasharray={`${(strength.percent / 100) * C} ${C}`}
              transform="rotate(-90 50 50)"
            />
          </svg>
          <b>
            {strength.percent}
            <small>%</small>
          </b>
        </div>
        <div>
          <h2 id="ov-strength-h">{todo.length === 0 ? "Your page is complete" : "Complete your page"}</h2>
          <p>
            {done} of {strength.items.length} done
          </p>
        </div>
      </header>
      {todo.length === 0 ? (
        <p className="ov-empty">Every box is ticked. Keep your projects fresh and share your link.</p>
      ) : (
        <ul className="ov-todo">
          {todo.slice(0, 5).map((item) => (
            <li key={item.id}>
              <Link href={item.href}>
                <span className="ov-todo-box" aria-hidden="true" />
                <span>{item.label}</span>
                <ArrowRight size={15} strokeWidth={1.75} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      )}
      {todo.length > 5 && <p className="ov-more">and {todo.length - 5} more</p>}
    </section>
  );
}

function Miniature({ data }: { data: InsightsData }) {
  return (
    <div className="ov-mini" aria-hidden="true">
      <div className="ov-mini-bar">
        <i />
        <i />
        <i />
        <span>/{data.slug}</span>
      </div>
      <div className="ov-mini-body">
        <div className="ov-mini-id">
          <Avatar name={data.name} src={data.avatar} size={40} />
          <div>
            <b>{data.name}</b>
            <span>{data.headline}</span>
          </div>
        </div>
        <div className="ov-mini-covers">
          {data.covers.map((c, i) => (
            <span key={`${c.url}-${i}`}>
              <CoverImage cover={c} sizes="120px" />
            </span>
          ))}
        </div>
        <div className="ov-mini-lines">
          <i />
          <i />
        </div>
      </div>
    </div>
  );
}

export function Insights({ data }: { data: InsightsData }) {
  const maxProject = Math.max(1, ...data.topProjects.map((p) => p.views));
  return (
    <div className="ov">
      <section className="ov-hero">
        <div className="ov-hero-main">
          <span className={`ov-state ov-state--${data.state.tone}`}>
            <i aria-hidden="true" />
            {data.state.label}
          </span>
          <h1 className="ov-hello">Welcome back, {data.firstName}</h1>
          <p className="ov-lede">{data.lede}</p>
          <div className="ov-hero-actions">
            {data.live && (
              <Link href={`/${data.slug}`} target="_blank" rel="noopener" className="ov-btn ov-btn--solid">
                View your page <ArrowUpRight size={16} strokeWidth={2} aria-hidden="true" />
              </Link>
            )}
            <CopyLink url={data.pageUrl} className="ov-btn ov-btn--glass" />
            <code className="ov-addr">/{data.slug}</code>
          </div>
        </div>
        <Miniature data={data} />
      </section>

      <div className="ov-kpis">
        <Kpi
          icon={<Eye size={18} strokeWidth={1.75} />}
          accent="indigo"
          label="Page views · 30 days"
          value={data.views.total}
          chip={<Delta change={data.views.change} fallback={data.views.note} />}
        >
          <Sparkline values={data.views.spark} id="ov-spark-views" />
        </Kpi>
        <Kpi
          icon={<Inbox size={18} strokeWidth={1.75} />}
          accent="violet"
          label="Enquiries"
          value={data.enquiries.total}
          href="/dashboard/leads"
          chip={
            <span className={data.enquiries.unread ? "ov-chip ov-chip--accent" : "ov-chip"}>
              {data.enquiries.unread ? `${data.enquiries.unread} unread` : "All read"}
            </span>
          }
        />
        <Kpi
          icon={<FileDown size={18} strokeWidth={1.75} />}
          accent="emerald"
          label="CV downloads"
          value={data.cv.downloads}
          href="/dashboard/cv"
          chip={<span className="ov-chip">{data.cv.layout}</span>}
        />
        <Kpi
          icon={<FolderKanban size={18} strokeWidth={1.75} />}
          accent="amber"
          label="Projects"
          value={data.projects.total}
          href="/dashboard/projects"
          chip={
            <span className="ov-chip">
              {data.projects.withPhotos}/{data.projects.total} with photos
            </span>
          }
        >
          <span className="ov-meter" aria-hidden="true">
            <i
              style={{ width: `${data.projects.total ? (data.projects.withPhotos / data.projects.total) * 100 : 0}%` }}
            />
          </span>
        </Kpi>
      </div>

      <div className="ov-main">
        <ViewsCard weeks={data.weeks} />
        <StrengthCard strength={data.strength} />
      </div>

      <div className="ov-lists">
        <section className="ov-card" aria-labelledby="ov-top-h">
          <header className="ov-card-head">
            <div>
              <h2 id="ov-top-h">Most opened projects</h2>
              <p>What visitors click on first</p>
            </div>
            <Link href="/dashboard/projects" className="ov-link">
              All projects
            </Link>
          </header>
          {data.topProjects.length === 0 ? (
            <p className="ov-empty">When visitors open your projects, the most popular appear here.</p>
          ) : (
            <ol className="ov-list">
              {data.topProjects.map((p, i) => (
                <li key={p.id}>
                  <Link href={`/dashboard/projects/${p.id}`} className="ov-row">
                    <span className="ov-rank">{i + 1}</span>
                    <span className="ov-thumb">
                      <CoverImage cover={p.cover} sizes="56px" />
                    </span>
                    <span className="ov-row-text">
                      <b>{p.title}</b>
                      <span>{p.sub}</span>
                      <span className="ov-meter" aria-hidden="true">
                        <i style={{ width: `${(p.views / maxProject) * 100}%` }} />
                      </span>
                    </span>
                    <b className="ov-num">{number.format(p.views)}</b>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="ov-card" aria-labelledby="ov-leads-h">
          <header className="ov-card-head">
            <div>
              <h2 id="ov-leads-h">Latest enquiries</h2>
              <p>People who wrote to you</p>
            </div>
            <Link href="/dashboard/leads" className="ov-link">
              Open inbox
            </Link>
          </header>
          {data.latestLeads.length === 0 ? (
            <p className="ov-empty">No enquiries yet. Visitors can message you from the form on your page.</p>
          ) : (
            <ol className="ov-list">
              {data.latestLeads.map((l) => (
                <li key={l.id}>
                  <Link href="/dashboard/leads" className="ov-row">
                    <Avatar name={l.name} size={38} />
                    <span className="ov-row-text">
                      <b>{l.name}</b>
                      <span>{l.message}</span>
                    </span>
                    <span className="ov-ago">{l.ago}</span>
                    {l.unread && <span className="ov-dot" role="img" aria-label="Unread" />}
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
