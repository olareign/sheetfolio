import Link from "next/link";
import { LocalTime } from "@/components/cms/LocalTime";
import { issueHref, publishState } from "@/content/cms";
import { collections, PublishableSite, type CollectionName } from "@/content/schemas";
import { getCmsContext } from "@/lib/cms-data";
import { getProjectViews } from "@/lib/site";

export const metadata = { title: "Overview" };

const STATE_LABEL = {
  live: "Live",
  changes: "Unpublished changes",
  unpublished: "Not published",
  suspended: "Suspended · contact support",
} as const;

export default async function OverviewPage() {
  const { account, draft, published, unread, weekViews } = await getCmsContext();
  const weekTotal = weekViews.reduce((n, d) => n + d.views, 0);
  const projectViews = await getProjectViews(
    account.slug,
    draft.projects.map((p) => p.id),
  );
  const ranked = [...draft.projects]
    .map((p) => ({ ...p, views: projectViews[p.id] ?? 0 }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 5);
  const state = publishState(draft, published);
  const readiness = PublishableSite.safeParse(draft);
  const todo = readiness.success
    ? []
    : readiness.error.issues.map((i) => ({ href: issueHref(i.path.join(".")), message: i.message }));
  const empty = (Object.keys(collections) as CollectionName[]).filter(
    (n) => draft[n].length === 0 && n !== "testimonials" && n !== "referees",
  );

  return (
    <main className="cms-content">
      <h1 className="cms-title">Overview</h1>
      <div className="cms-stats">
        <div>
          <span className="sp-label">Status</span>
          <span className="sp-tb-val">{STATE_LABEL[state]}</span>
        </div>
        <div>
          <span className="sp-label">Last published</span>
          <span className="sp-tb-val">
            {published?.publishedAt ? <LocalTime iso={published.publishedAt} format="datetime" /> : "Never"}
          </span>
        </div>
        <div>
          <span className="sp-label">Views this week</span>
          <span className="cms-stat">{weekTotal}</span>
        </div>
        <div>
          <span className="sp-label">Unread leads</span>
          <Link href="/dashboard/leads" className="cms-stat">
            {unread}
          </Link>
        </div>
      </div>
      {ranked.some((p) => p.views > 0) && (
        <section className="cms-section" aria-labelledby="pv-title">
          <h2 id="pv-title">Most viewed projects</h2>
          <table className="sp-spec">
            <caption className="sp-visually-hidden">All-time views per project</caption>
            <tbody>
              {ranked.map((p) => (
                <tr key={p.id}>
                  <th scope="row">{p.drawingNo}</th>
                  <td>
                    {p.title} · <span className="sp-annot">{p.views} views</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
      {(todo.length > 0 || empty.length > 0) && (
        <section className="cms-section" aria-labelledby="todo-title">
          <h2 id="todo-title">{todo.length ? "Before you can publish" : "To make your page complete"}</h2>
          <ul className="cms-todo">
            {todo.map((t) => (
              <li key={t.message}>
                <Link href={t.href}>{t.message}</Link>
              </li>
            ))}
            {empty.map((n) => (
              <li key={n}>
                <Link href={`/dashboard/${n}/new`}>Add {collections[n].label.toLowerCase()}</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
