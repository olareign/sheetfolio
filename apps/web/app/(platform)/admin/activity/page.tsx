import Link from "next/link";
import { ActivityList } from "@/components/admin/ActivityList";
import { listActivity } from "@/lib/activity";
import { ACTIVITY_LABELS, ACTIVITY_TYPES } from "@/lib/activity-types";
import { activityQuery, pageHref, type SearchParams } from "@/lib/admin-query";

const SIZE = 50;

export default async function AdminActivity({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = activityQuery(await searchParams);
  const { events, more } = await listActivity({
    slug: query.slug,
    type: query.type,
    offset: query.page * SIZE,
    limit: SIZE,
  });
  const params = { type: query.type, slug: query.slug };

  return (
    <>
      <header className="ad-head">
        <div>
          <h1>Activity</h1>
          <p>
            Sign-ups, sign-ins, publishes, enquiries, tailorings and admin changes, newest first. Kept in Upstash for up
            to 90 days; it holds no passwords, messages or IP addresses.
          </p>
        </div>
      </header>

      <nav className="ad-tabs" aria-label="Kind of activity">
        <Link
          href={pageHref("/admin/activity", { slug: query.slug }, 0)}
          aria-current={query.type ? undefined : "page"}
        >
          Everything
        </Link>
        {ACTIVITY_TYPES.map((t) => (
          <Link
            key={t}
            href={pageHref("/admin/activity", { type: t, slug: query.slug }, 0)}
            aria-current={query.type === t ? "page" : undefined}
          >
            {ACTIVITY_LABELS[t]}
          </Link>
        ))}
      </nav>
      {query.slug && (
        <p className="ad-filter-note">
          Only <b>/{query.slug}</b>.{" "}
          <Link href={pageHref("/admin/activity", { type: query.type }, 0)}>Show everyone</Link>
        </p>
      )}

      <section className="ad-card" aria-label="Activity">
        <ActivityList events={events} empty="Nothing recorded for this filter." />
      </section>

      {(query.page > 0 || more) && (
        <nav className="ad-pager" aria-label="Pages">
          <span>Page {query.page + 1}</span>
          <span className="ad-pager-links">
            {query.page > 0 && (
              <Link className="sp-btn sp-btn--sm" href={pageHref("/admin/activity", params, query.page - 1)} rel="prev">
                Newer
              </Link>
            )}
            {more && (
              <Link className="sp-btn sp-btn--sm" href={pageHref("/admin/activity", params, query.page + 1)} rel="next">
                Older
              </Link>
            )}
          </span>
        </nav>
      )}
    </>
  );
}
