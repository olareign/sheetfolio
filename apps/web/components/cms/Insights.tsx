import { ExternalLink } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { CoverImage } from "@/components/sp/CoverImage";
import type { Cover } from "@/content/covers";
import { initials } from "@/content/derive";
import type { WeekViews } from "@/content/insights";

const number = new Intl.NumberFormat("en");

export type InsightsData = {
  name: string;
  slug: string;
  avatar?: string;
  state: { label: string; tone: "live" | "changes" | "off" };
  views: { total: number; note: string };
  enquiries: { total: number; unread: number };
  cv: { downloads: number; layout: string };
  projects: { total: number; withPhotos: number };
  weeks: WeekViews[];
  topProjects: { id: string; title: string; sub: string; views: number; cover: Cover }[];
  latestLeads: { id: string; name: string; message: string; ago: string; unread: boolean }[];
};

function Stat({ label, value, note, href }: { label: string; value: number; note: string; href?: string }) {
  const body = (
    <>
      <span className="ins-stat-label">{label}</span>
      <b className="ins-stat-value">{number.format(value)}</b>
      <span className="ins-stat-note">{note}</span>
    </>
  );
  return href ? (
    <Link href={href} className="ins-stat ins-stat--link">
      {body}
    </Link>
  ) : (
    <div className="ins-stat">{body}</div>
  );
}

function Chart({ weeks }: { weeks: WeekViews[] }) {
  const max = Math.max(1, ...weeks.map((w) => w.views));
  const total = weeks.reduce((n, w) => n + w.views, 0);
  return (
    <section className="ins-card" aria-labelledby="ins-weeks">
      <h2 id="ins-weeks">Views by week</h2>
      <div
        className="ins-bars"
        role="img"
        aria-label={`Page views over the last ${weeks.length} weeks: ${total} in total`}
      >
        {weeks.map((w, i) => (
          <span key={w.start} className="ins-bar-slot" title={`Week of ${w.start}: ${w.views} views`}>
            <span
              className={w.views === 0 ? "ins-bar ins-bar--zero" : "ins-bar"}
              style={{ height: `${Math.max(3, (w.views / max) * 100)}%`, animationDelay: `${i * 0.04}s` }}
            />
          </span>
        ))}
      </div>
      <div className="ins-axis">
        <span>{weeks.length} weeks ago</span>
        <span>This week</span>
      </div>
      {total === 0 && <p className="ins-empty">No views yet. Share your page link to start seeing visits.</p>}
    </section>
  );
}

export function Insights({ data }: { data: InsightsData }) {
  return (
    <div className="ins">
      <div className="ins-head">
        <div className="ins-who">
          {data.avatar ? (
            <Image className="ins-avatar" src={data.avatar} alt="" width={44} height={44} unoptimized />
          ) : (
            <span className="ins-avatar ins-avatar--initials" aria-hidden="true">
              {initials(data.name)}
            </span>
          )}
          <div>
            <b>{data.name}</b>
            <Link href={`/${data.slug}`} target="_blank" className="ins-url">
              /{data.slug} <ExternalLink size={13} strokeWidth={1.75} aria-hidden="true" />
            </Link>
            {!data.avatar && (
              <Link href="/dashboard/profile" className="ins-photo-cta">
                Add your photo: it is the picture people see on Featured
              </Link>
            )}
          </div>
        </div>
        <span className={`ins-state ins-state--${data.state.tone}`}>{data.state.label}</span>
      </div>

      <div className="ins-stats">
        <Stat label="Page views" value={data.views.total} note={data.views.note} />
        <Stat
          label="Enquiries"
          value={data.enquiries.total}
          note={data.enquiries.unread ? `${data.enquiries.unread} unread` : "All read"}
          href="/dashboard/leads"
        />
        <Stat label="CV downloads" value={data.cv.downloads} note={`${data.cv.layout} layout`} href="/dashboard/cv" />
        <Stat
          label="Projects"
          value={data.projects.total}
          note={`${data.projects.withPhotos} with photos`}
          href="/dashboard/projects"
        />
      </div>

      <div className="ins-grid">
        <Chart weeks={data.weeks} />

        <section className="ins-card" aria-labelledby="ins-top">
          <h2 id="ins-top">Most opened projects</h2>
          {data.topProjects.length === 0 ? (
            <p className="ins-empty">When visitors open your projects, the most popular appear here.</p>
          ) : (
            <ol className="ins-list">
              {data.topProjects.map((p) => (
                <li key={p.id}>
                  <Link href={`/dashboard/projects/${p.id}`} className="ins-row">
                    <span className="ins-thumb">
                      <CoverImage cover={p.cover} sizes="56px" />
                    </span>
                    <span className="ins-row-text">
                      <b>{p.title}</b>
                      <span>{p.sub}</span>
                    </span>
                    <b className="ins-num">{number.format(p.views)}</b>
                  </Link>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="ins-card" aria-labelledby="ins-leads">
          <h2 id="ins-leads">Latest enquiries</h2>
          {data.latestLeads.length === 0 ? (
            <p className="ins-empty">No enquiries yet. Visitors can message you from the form on your page.</p>
          ) : (
            <ol className="ins-list">
              {data.latestLeads.map((l) => (
                <li key={l.id}>
                  <Link href="/dashboard/leads" className="ins-row">
                    <span className="ins-avatar ins-avatar--initials ins-avatar--sm" aria-hidden="true">
                      {initials(l.name)}
                    </span>
                    <span className="ins-row-text">
                      <b>{l.name}</b>
                      <span>{l.message}</span>
                    </span>
                    <span className="ins-ago">{l.ago}</span>
                    {l.unread && <span className="ins-dot" role="img" aria-label="Unread" />}
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
