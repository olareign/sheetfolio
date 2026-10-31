import { ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionButton";
import { Pager } from "@/components/admin/Pager";
import { StatusTag } from "@/components/admin/badges";
import { collections, type CollectionName } from "@/content/schemas";
import { listContent } from "@/lib/admin";
import { contentQuery, paginate, type SearchParams } from "@/lib/admin-query";
import { removeItemAction } from "../actions";

export default async function AdminContent({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = contentQuery(await searchParams);
  const rows = await listContent({ collection: query.collection, q: query.q, slug: query.slug });
  const view = paginate(rows, query.page);
  const params = { c: query.collection, q: query.q, slug: query.slug };
  const label = collections[query.collection].label;

  return (
    <>
      <header className="ad-head">
        <div>
          <h1>Content</h1>
          <p>
            What people have put on their pages, across every account. Remove something that breaks the rules and it
            disappears from the public page at once.
          </p>
        </div>
      </header>

      <nav className="ad-tabs" aria-label="Kind of content">
        {(Object.keys(collections) as CollectionName[]).map((name) => (
          <Link
            key={name}
            href={`/admin/content?c=${name}${query.slug ? `&slug=${query.slug}` : ""}`}
            aria-current={name === query.collection ? "page" : undefined}
          >
            {collections[name].label}
          </Link>
        ))}
      </nav>

      <form className="ad-filters" method="get" role="search" aria-label={`Search ${label.toLowerCase()}`}>
        <input type="hidden" name="c" value={query.collection} />
        <label className="ad-field ad-field--grow">
          <span>Search</span>
          <input
            className="sp-input"
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Title, text, address or email"
          />
        </label>
        {query.slug && <input type="hidden" name="slug" value={query.slug} />}
        <button type="submit" className="sp-btn sp-btn--primary sp-btn--sm">
          Search
        </button>
        {(query.q || query.slug) && (
          <Link href={`/admin/content?c=${query.collection}`} className="ad-more">
            Clear{query.slug ? ` /${query.slug}` : ""}
          </Link>
        )}
      </form>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th scope="col">{label.replace(/s$/, "")}</th>
              <th scope="col">Owner</th>
              <th scope="col">On the live page</th>
              <th scope="col">
                <span className="sp-visually-hidden">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => (
              <tr key={`${r.slug}-${r.id}`}>
                <td data-label={label.replace(/s$/, "")}>
                  <b>{r.title}</b>
                  {r.detail && <small className="ad-clamp">{r.detail}</small>}
                </td>
                <td data-label="Owner">
                  <Link href={`/admin/users/${r.slug}`}>/{r.slug}</Link>
                  <small>{r.owner}</small>
                </td>
                <td data-label="On the live page">
                  {r.live ? (
                    <StatusTag status="live" />
                  ) : r.pageStatus === "suspended" ? (
                    <StatusTag status="suspended" />
                  ) : (
                    <span className="sp-tag">Draft only</span>
                  )}
                </td>
                <td className="ad-row-action">
                  {r.live && (
                    <a
                      className="sp-btn sp-btn--sm"
                      href={`/${r.slug}`}
                      target="_blank"
                      rel="noopener"
                      aria-label={`Open /${r.slug}`}
                    >
                      <ExternalLink size={14} aria-hidden="true" />
                    </a>
                  )}
                  <ActionButton
                    label="Remove"
                    pendingLabel="Removing…"
                    icon={<Trash2 size={14} aria-hidden="true" />}
                    danger
                    ariaLabel={`Remove ${r.title} from /${r.slug}`}
                    action={removeItemAction}
                    args={[r.slug, r.collection, r.id]}
                    confirm={{
                      title: `Remove “${r.title}”?`,
                      body: `It is taken off /${r.slug}, from the draft and the live page. The owner is not notified, and it is recorded in the activity log.`,
                      confirmLabel: "Remove",
                    }}
                  />
                </td>
              </tr>
            ))}
            {view.rows.length === 0 && (
              <tr>
                <td colSpan={4} className="ad-empty-cell">
                  Nothing here{query.q ? " matches that search" : ""}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager
        basePath="/admin/content"
        params={params}
        page={view.page}
        pages={view.pages}
        total={view.total}
        noun="items"
      />
    </>
  );
}
