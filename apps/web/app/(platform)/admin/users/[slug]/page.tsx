import { ArrowLeft, ExternalLink, Inbox } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActivityList } from "@/components/admin/ActivityList";
import { ActionButton } from "@/components/admin/ActionButton";
import { PlanTag, StatusTag } from "@/components/admin/badges";
import { DeleteAccount } from "@/components/admin/DeleteAccount";
import { PlanControl } from "@/components/admin/PlanControl";
import { LocalTime } from "@/components/cms/LocalTime";
import { collections, Slug } from "@/content/schemas";
import { getAccountDetail } from "@/lib/admin";
import { listActivity } from "@/lib/activity";
import { requireAdmin } from "@/lib/session";
import { resetAllowancesAction, setSuspendedAction, signOutEverywhereAction } from "../../actions";

const ENGINE = { groq: "Standard AI", claude: "Claude" } as const;

export default async function AdminUser({ params }: { params: Promise<{ slug: string }> }) {
  const { email: me } = await requireAdmin();
  const parsed = Slug.safeParse((await params).slug);
  if (!parsed.success) notFound();
  const slug = parsed.data;
  const [detail, activity] = await Promise.all([getAccountDetail(slug), listActivity({ slug, limit: 25 })]);
  if (!detail) notFound();

  const { account, draft } = detail;
  const record = account.record;
  const isAdmin = record.role === "admin";
  const isSelf = account.email === me;
  const suspended = detail.status === "suspended";
  const peak = Math.max(1, ...detail.views.map((v) => v.views));
  const weekViews = detail.views.slice(-7).reduce((a, v) => a + v.views, 0);
  const counts = draft
    ? (Object.keys(collections) as (keyof typeof collections)[]).map((name) => ({
        name,
        label: collections[name].label,
        count: draft[name].length,
      }))
    : [];

  return (
    <>
      <Link href="/admin/users" className="ad-back">
        <ArrowLeft size={15} aria-hidden="true" /> All users
      </Link>
      <header className="ad-head ad-head--row">
        <div>
          <h1>{draft?.profile.name ?? record.name}</h1>
          <p>
            {account.email} · <code>/{slug}</code>
          </p>
        </div>
        <div className="ad-badges">
          <PlanTag plan={record.plan} />
          <StatusTag status={detail.status} />
          {isAdmin && <span className="ad-plan">Admin</span>}
        </div>
      </header>

      <div className="ad-grid">
        <section className="ad-card" aria-labelledby="acct-title">
          <h2 id="acct-title">Account</h2>
          <dl className="ad-facts">
            <div>
              <dt>Joined</dt>
              <dd>
                <LocalTime iso={record.createdAt} format="datetime" />
              </dd>
            </div>
            <div>
              <dt>Sign-in</dt>
              <dd>
                {detail.hasPassword
                  ? `Password${detail.username ? ` · username ${detail.username}` : ""}`
                  : "No password set"}
              </dd>
            </div>
            <div>
              <dt>Role</dt>
              <dd>{isAdmin ? "Admin" : "Member"}</dd>
            </div>
          </dl>
          <div className="ad-block">
            <h3>Plan</h3>
            <PlanControl slug={slug} plan={record.plan} />
            <p className="ad-hint">Free accounts are tailored by standard AI, Pro accounts by Claude.</p>
          </div>
          <div className="ad-block">
            <h3>Sessions</h3>
            <div className="ad-inline">
              <ActionButton
                label="Sign out everywhere"
                pendingLabel="Signing out…"
                action={signOutEverywhereAction}
                args={[slug]}
                confirm={{
                  title: `Sign ${account.email} out everywhere?`,
                  body: "Every device they are signed in on is signed out at its next request. They can sign in again with their password.",
                  confirmLabel: "Sign out everywhere",
                }}
              />
            </div>
          </div>
        </section>

        <section className="ad-card" aria-labelledby="page-title">
          <h2 id="page-title">Page</h2>
          <dl className="ad-facts">
            <div>
              <dt>Status</dt>
              <dd>
                <StatusTag status={detail.status} />
              </dd>
            </div>
            <div>
              <dt>Last published</dt>
              <dd>
                {detail.published?.publishedAt ? (
                  <LocalTime iso={detail.published.publishedAt} format="datetime" />
                ) : (
                  "Never"
                )}
              </dd>
            </div>
            <div>
              <dt>Headline</dt>
              <dd>{draft?.profile.headline || "—"}</dd>
            </div>
          </dl>
          {counts.length > 0 && (
            <ul className="ad-counts" aria-label="Content on the page">
              {counts.map((c) => (
                <li key={c.name}>
                  <Link href={`/admin/content?c=${c.name}&slug=${slug}`}>
                    <b>{c.count}</b>
                    <span>{c.label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <div className="ad-block ad-inline">
            {detail.status !== "unpublished" && (
              <a className="sp-btn sp-btn--sm" href={`/${slug}`} target="_blank" rel="noopener">
                <ExternalLink size={14} aria-hidden="true" /> Open public page
              </a>
            )}
            <ActionButton
              label={suspended ? "Restore page" : "Suspend page"}
              pendingLabel={suspended ? "Restoring…" : "Suspending…"}
              danger={!suspended}
              action={setSuspendedAction}
              args={[slug, !suspended]}
              confirm={
                suspended
                  ? undefined
                  : {
                      title: `Suspend /${slug}?`,
                      body: "The public page, project pages, CV and enquiry form return 404 until you restore it. The owner can still edit but not publish.",
                      confirmLabel: "Suspend",
                    }
              }
            />
          </div>
        </section>

        <section className="ad-card" aria-labelledby="traffic-title">
          <h2 id="traffic-title">Traffic</h2>
          <div className="ad-stats">
            <div>
              <b>{weekViews}</b>
              <span>views, last 7 days</span>
            </div>
            <div>
              <b>{detail.cvDownloads}</b>
              <span>CV downloads</span>
            </div>
            <div>
              <b>{detail.leadTotals.total}</b>
              <span>enquiries{detail.leadTotals.unread > 0 && ` (${detail.leadTotals.unread} unread)`}</span>
            </div>
          </div>
          <ol className="ad-bars" aria-label="Page views, last 14 days">
            {detail.views.map((v) => (
              <li key={v.date} title={`${v.date}: ${v.views}`}>
                <span style={{ height: `${Math.max(4, (v.views / peak) * 100)}%` }} />
              </li>
            ))}
          </ol>
          <Link href={`/admin/leads?slug=${slug}`} className="ad-more">
            <Inbox size={14} aria-hidden="true" /> Enquiries for this page
          </Link>
        </section>

        <section className="ad-card" aria-labelledby="tailor-title">
          <h2 id="tailor-title">CV tailoring today</h2>
          {detail.allowance ? (
            <ul className="ad-allow">
              {detail.allowance.map((a) => (
                <li key={a.engine}>
                  <span>{ENGINE[a.engine]}</span>
                  <b>
                    {a.remaining}
                    <small>/{a.limit} left</small>
                  </b>
                </li>
              ))}
            </ul>
          ) : (
            <p className="ad-hint">The allowance counter could not be read just now.</p>
          )}
          <p className="ad-hint">
            {detail.versions} saved CV version{detail.versions === 1 ? "" : "s"}.
          </p>
          <div className="ad-inline">
            <ActionButton
              label="Reset allowance"
              pendingLabel="Resetting…"
              action={resetAllowancesAction}
              args={[slug]}
              confirm={{
                title: "Reset the tailoring allowance?",
                body: "They get all of today's tailorings back, on both engines.",
                confirmLabel: "Reset",
              }}
            />
          </div>
        </section>
      </div>

      <section className="ad-card" aria-labelledby="act-title">
        <header className="ad-card-head">
          <h2 id="act-title">Activity</h2>
          <Link href={`/admin/activity?slug=${slug}`} className="ad-more">
            See all
          </Link>
        </header>
        <ActivityList events={activity.events} empty="No activity recorded for this account yet." />
      </section>

      <section className="ad-card ad-danger" aria-labelledby="danger-title">
        <h2 id="danger-title">Danger zone</h2>
        {isAdmin || isSelf ? (
          <p className="ad-hint">
            {isSelf ? "You cannot delete your own account here." : "Admin accounts cannot be deleted from the console."}
          </p>
        ) : (
          <>
            <p className="ad-hint">
              Removes the account and everything it owns: the page, enquiries, saved CVs and view history. Use it for a
              deletion request or for abuse. It cannot be undone.
            </p>
            <DeleteAccount slug={slug} />
          </>
        )}
      </section>
    </>
  );
}
