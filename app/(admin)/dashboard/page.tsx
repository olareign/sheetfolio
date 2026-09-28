import Link from "next/link";
import { LocalTime } from "@/components/cms/LocalTime";
import { issueHref, publishState } from "@/content/cms";
import { collections, PublishableSite, type CollectionName } from "@/content/schemas";
import { getCmsContext } from "@/lib/cms-data";

export const metadata = { title: "Overview" };

const STATE_LABEL = { live: "Live", changes: "Unpublished changes", unpublished: "Not published" } as const;

export default async function OverviewPage() {
  const { account, draft, published } = await getCmsContext();
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
          <span className="sp-label">Projects</span>
          <span className="cms-stat">{draft.projects.length}</span>
        </div>
        <div>
          <span className="sp-label">Page</span>
          <span className="sp-tb-mono">/{account.slug}</span>
        </div>
      </div>
      {/* TODO(day 4): views this week and unread leads. */}
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
