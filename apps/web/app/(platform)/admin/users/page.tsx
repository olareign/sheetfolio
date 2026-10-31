import Link from "next/link";
import { PlanTag, StatusTag } from "@/components/admin/badges";
import { Pager } from "@/components/admin/Pager";
import { LocalTime } from "@/components/cms/LocalTime";
import { filterAccounts, listAccounts } from "@/lib/admin";
import { paginate, usersQuery, type SearchParams } from "@/lib/admin-query";

export default async function AdminUsers({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = usersQuery(await searchParams);
  const all = await listAccounts();
  const { page, ...filters } = query;
  const found = filterAccounts(all, filters);
  const view = paginate(found, page);
  const params = { q: query.q, plan: query.plan, status: query.status, role: query.role };

  return (
    <>
      <header className="ad-head">
        <div>
          <h1>Users</h1>
          <p>Everyone with an account. Open one to change their plan, suspend their page or look at their activity.</p>
        </div>
      </header>

      <form className="ad-filters" method="get" role="search" aria-label="Filter users">
        <label className="ad-field ad-field--grow">
          <span>Search</span>
          <input
            className="sp-input"
            type="search"
            name="q"
            defaultValue={query.q}
            placeholder="Name, email, address or headline"
          />
        </label>
        <label className="ad-field">
          <span>Plan</span>
          <select className="ad-select" name="plan" defaultValue={query.plan ?? ""}>
            <option value="">Any plan</option>
            <option value="free">Free</option>
            <option value="pro">Pro</option>
          </select>
        </label>
        <label className="ad-field">
          <span>Page</span>
          <select className="ad-select" name="status" defaultValue={query.status ?? ""}>
            <option value="">Any status</option>
            <option value="live">Live</option>
            <option value="changes">Live, edits pending</option>
            <option value="unpublished">Not published</option>
            <option value="suspended">Suspended</option>
          </select>
        </label>
        <label className="ad-field">
          <span>Role</span>
          <select className="ad-select" name="role" defaultValue={query.role ?? ""}>
            <option value="">Any role</option>
            <option value="engineer">Member</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <button type="submit" className="sp-btn sp-btn--primary sp-btn--sm">
          Apply
        </button>
        {(query.q || query.plan || query.status || query.role) && (
          <Link href="/admin/users" className="ad-more">
            Clear
          </Link>
        )}
      </form>

      <div className="ad-table-wrap">
        <table className="ad-table">
          <thead>
            <tr>
              <th scope="col">Account</th>
              <th scope="col">Plan</th>
              <th scope="col">Page</th>
              <th scope="col">Joined</th>
              <th scope="col">Content</th>
              <th scope="col">Enquiries</th>
              <th scope="col">
                <span className="sp-visually-hidden">Open</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {view.rows.map((r) => (
              <tr key={r.slug}>
                <td data-label="Account">
                  <Link href={`/admin/users/${r.slug}`} className="ad-name">
                    {r.name}
                  </Link>
                  <small>
                    {r.email} · /{r.slug}
                    {r.role === "admin" && <span className="ad-plan"> Admin</span>}
                  </small>
                </td>
                <td data-label="Plan">
                  <PlanTag plan={r.plan} />
                </td>
                <td data-label="Page">
                  <StatusTag status={r.status} />
                </td>
                <td data-label="Joined">
                  <LocalTime iso={r.createdAt} format="date" />
                </td>
                <td data-label="Content">
                  {r.projects} projects · {r.certifications} certs
                </td>
                <td data-label="Enquiries">
                  {r.leads}
                  {r.unread > 0 && <span className="ad-unread"> · {r.unread} unread</span>}
                </td>
                <td className="ad-row-action">
                  <Link href={`/admin/users/${r.slug}`} className="sp-btn sp-btn--sm">
                    Manage
                  </Link>
                </td>
              </tr>
            ))}
            {view.rows.length === 0 && (
              <tr>
                <td colSpan={7} className="ad-empty-cell">
                  No account matches those filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <Pager
        basePath="/admin/users"
        params={params}
        page={view.page}
        pages={view.pages}
        total={view.total}
        noun="accounts"
      />
    </>
  );
}
