import { Trash2 } from "lucide-react";
import Link from "next/link";
import { ActionButton } from "@/components/admin/ActionButton";
import { Pager } from "@/components/admin/Pager";
import { LocalTime } from "@/components/cms/LocalTime";
import { leadsQuery, PAGE_SIZE, type SearchParams } from "@/lib/admin-query";
import { leads } from "@/lib/store";
import { deleteLeadAction } from "../actions";

export default async function AdminLeads({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = leadsQuery(await searchParams);
  const { rows, total } = await leads().search({ ...query, pageSize: PAGE_SIZE });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const params = { q: query.q, slug: query.slug, unread: query.unreadOnly ? "1" : undefined };

  return (
    <>
      <header className="ad-head">
        <div>
          <h1>Enquiries</h1>
          <p>
            Every message sent through a public page. Delete spam; owners see their own enquiries in their dashboard.
          </p>
        </div>
      </header>

      <form className="ad-filters" method="get" role="search" aria-label="Filter enquiries">
        <label className="ad-field ad-field--grow">
          <span>Search</span>
          <input
            className="sp-input"
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Name, email, company, message or page"
          />
        </label>
        {query.slug && <input type="hidden" name="slug" value={query.slug} />}
        <label className="ad-check">
          <input type="checkbox" name="unread" value="1" defaultChecked={query.unreadOnly} /> Unread only
        </label>
        <button type="submit" className="sp-btn sp-btn--primary sp-btn--sm">
          Apply
        </button>
        {(query.q || query.slug || query.unreadOnly) && (
          <Link href="/admin/leads" className="ad-more">
            Clear{query.slug ? ` /${query.slug}` : ""}
          </Link>
        )}
      </form>

      <ul className="ad-leads">
        {rows.map((l) => (
          <li key={l.id} className={l.read ? "ad-lead" : "ad-lead ad-lead--unread"}>
            <div className="ad-lead-head">
              <div>
                <b>{l.name}</b> <span className="ad-lead-mail">{l.email}</span>
                {l.company && <small> · {l.company}</small>}
              </div>
              <div className="ad-lead-meta">
                <Link href={`/admin/users/${l.slug}`}>/{l.slug}</Link>
                <small>
                  <LocalTime iso={l.createdAt} format="datetime" />
                </small>
              </div>
            </div>
            <p className="ad-lead-body">{l.message}</p>
            <div className="ad-lead-foot">
              {!l.read && <span className="sp-tag sp-tag--ongoing">Unread</span>}
              <ActionButton
                label="Delete"
                pendingLabel="Deleting…"
                icon={<Trash2 size={14} aria-hidden="true" />}
                danger
                ariaLabel={`Delete the enquiry from ${l.name}`}
                action={deleteLeadAction}
                args={[l.slug, l.id]}
                confirm={{
                  title: "Delete this enquiry?",
                  body: `It is removed from /${l.slug}'s inbox for good. The owner is not notified.`,
                  confirmLabel: "Delete",
                }}
              />
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="ad-empty">No enquiries match.</li>}
      </ul>
      <Pager
        basePath="/admin/leads"
        params={params}
        page={Math.min(query.page, pages - 1)}
        pages={pages}
        total={total}
        noun="enquiries"
      />
    </>
  );
}
