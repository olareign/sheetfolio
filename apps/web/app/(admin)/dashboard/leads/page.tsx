import { Mail } from "lucide-react";
import { LocalTime } from "@/components/cms/LocalTime";
import { MarkAllReadButton, MarkReadButton } from "@/components/cms/LeadActions";
import { Button } from "@/components/sp/Button";
import { getCmsContext } from "@/lib/cms-data";
import { countLeads, LEADS_PAGE_SIZE, listLeads } from "@/lib/site";

export const metadata = { title: "Leads" };

type Props = { searchParams: Promise<{ page?: string }> };

export default async function LeadsPage({ searchParams }: Props) {
  const { account, unread } = await getCmsContext();
  const requested = Number((await searchParams).page ?? "1");
  const page = Number.isInteger(requested) && requested > 0 ? requested : 1;
  const [leads, total] = await Promise.all([listLeads(account.slug, page - 1), countLeads(account.slug)]);
  const pages = Math.max(1, Math.ceil(total / LEADS_PAGE_SIZE));

  return (
    <main className="cms-content">
      <div className="cms-form-head">
        <h1 className="cms-title">Leads</h1>
        <div className="cms-lead-toolbar">
          <span className="sp-annot">
            {total} {total === 1 ? "enquiry" : "enquiries"} · {unread} unread
          </span>
          {unread > 0 && <MarkAllReadButton />}
        </div>
      </div>
      {leads.length === 0 ? (
        <div className="cms-empty">
          <p>No enquiries yet. They arrive here and by email when someone uses the form on your page.</p>
        </div>
      ) : (
        <ul className="cms-leads">
          {leads.map((lead) => (
            <li key={lead.id} className={lead.read ? "cms-lead" : "cms-lead is-unread"}>
              <div className="cms-lead-head">
                <div>
                  <b>{lead.name}</b>
                  <span className="sp-annot">
                    {lead.email}
                    {lead.company && ` · ${lead.company}`}
                  </span>
                </div>
                <div className="cms-lead-meta">
                  {!lead.read && <span className="sp-tag sp-tag--ongoing">Unread</span>}
                  <span className="sp-annot">
                    <LocalTime iso={lead.createdAt} format="datetime" />
                  </span>
                </div>
              </div>
              <p className="cms-lead-body">{lead.message}</p>
              <div className="cms-lead-actions">
                <Button
                  size="sm"
                  href={`mailto:${lead.email}?subject=${encodeURIComponent("Re: your enquiry")}`}
                  icon={<Mail size={16} strokeWidth={1.5} aria-hidden="true" />}
                >
                  Reply by email
                </Button>
                {!lead.read && <MarkReadButton id={lead.id} />}
              </div>
            </li>
          ))}
        </ul>
      )}
      {pages > 1 && (
        <nav className="cms-pager" aria-label="Leads pages">
          {page > 1 && (
            <Button href={`/dashboard/leads?page=${page - 1}`} size="sm">
              ← Newer
            </Button>
          )}
          <span className="sp-annot">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Button href={`/dashboard/leads?page=${page + 1}`} size="sm">
              Older →
            </Button>
          )}
        </nav>
      )}
    </main>
  );
}
