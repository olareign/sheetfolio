import type { Metadata } from "next";
import Link from "next/link";
import { SuspendButton } from "@/components/admin/SuspendButton";
import { LocalTime } from "@/components/cms/LocalTime";
import { listSignups, listSites } from "@/lib/admin";
import { requireAdmin } from "@/lib/session";
import "@/styles/cms.css";

// Neutral title: a non-admin gets a 404 and nothing should hint that /admin exists.
export const metadata: Metadata = { title: { absolute: "Sheetfolio" }, robots: { index: false, follow: false } };

const STATUS = {
  live: { label: "Live", className: "sp-tag sp-tag--done" },
  changes: { label: "Unpublished changes", className: "sp-tag" },
  unpublished: { label: "Not published", className: "sp-tag" },
  suspended: { label: "Suspended", className: "sp-tag sp-tag--ongoing" },
} as const;

export default async function AdminPage() {
  await requireAdmin();
  const [sites, signups] = await Promise.all([listSites(), listSignups()]);
  const live = sites.filter((s) => s.status === "live" || s.status === "changes").length;
  const published = sites.filter((s) => s.minutesToFirstPublish !== undefined);
  const under30 = published.filter((s) => (s.minutesToFirstPublish ?? Infinity) < 30).length;

  return (
    <main className="cms-content cms-admin">
      <div className="cms-form-head">
        <h1 className="cms-title">Platform admin</h1>
        <Link href="/dashboard" className="sp-annot">
          Your dashboard
        </Link>
      </div>

      <div className="cms-stats">
        <div>
          <span className="sp-label">Sites</span>
          <span className="cms-stat">{sites.length}</span>
        </div>
        <div>
          <span className="sp-label">Live</span>
          <span className="cms-stat">{live}</span>
        </div>
        <div>
          <span className="sp-label">Signups</span>
          <span className="cms-stat">{signups.length}</span>
        </div>
        <div>
          <span className="sp-label">First publish &lt; 30 min</span>
          <span className="cms-stat">
            {under30}/{published.length}
          </span>
        </div>
      </div>

      <section className="cms-section" aria-labelledby="sites-title">
        <h2 id="sites-title">Sites</h2>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th scope="col">Site</th>
                <th scope="col">Status</th>
                <th scope="col">Signed up → first publish</th>
                <th scope="col">Last published</th>
                <th scope="col">Projects · certs</th>
                <th scope="col">Leads</th>
                <th scope="col">
                  <span className="sp-visually-hidden">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {sites.map((s) => (
                <tr key={s.slug}>
                  <td>
                    <b>{s.name}</b>
                    <span className="sp-annot">
                      <a href={`/${s.slug}`} target="_blank" rel="noopener">
                        /{s.slug}
                      </a>
                      {s.owner && ` · ${s.owner}`}
                    </span>
                  </td>
                  <td>
                    <span className={STATUS[s.status].className}>{STATUS[s.status].label}</span>
                  </td>
                  <td className="sp-annot">
                    {s.minutesToFirstPublish !== undefined
                      ? `${s.minutesToFirstPublish} min`
                      : !s.signedUpAt
                        ? "Seeded"
                        : s.publishedAt
                          ? "Not recorded" // published before first-publish tracking existed
                          : "Not published yet"}
                  </td>
                  <td className="sp-annot">{s.publishedAt ? <LocalTime iso={s.publishedAt} format="date" /> : "—"}</td>
                  <td className="sp-annot">
                    {s.projects} · {s.certifications}
                  </td>
                  <td className="sp-annot">
                    {s.leads}
                    {s.unread > 0 && ` (${s.unread} unread)`}
                  </td>
                  <td>
                    <SuspendButton slug={s.slug} suspended={s.status === "suspended"} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="cms-section" aria-labelledby="signups-title">
        <h2 id="signups-title">Signups</h2>
        <div className="cms-table-wrap">
          <table className="cms-table">
            <thead>
              <tr>
                <th scope="col">Email</th>
                <th scope="col">Site</th>
                <th scope="col">Role</th>
                <th scope="col">Signed up</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((u) => (
                <tr key={u.email}>
                  <td>{u.email}</td>
                  <td className="sp-annot">/{u.slug}</td>
                  <td className="sp-annot">{u.role}</td>
                  <td className="sp-annot">
                    <LocalTime iso={u.createdAt} format="datetime" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
