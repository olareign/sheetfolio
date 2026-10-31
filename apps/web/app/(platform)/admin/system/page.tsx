import { CheckCircle2, CircleSlash } from "lucide-react";
import { ActionButton } from "@/components/admin/ActionButton";
import { getSystemStatus } from "@/lib/admin";
import { reindexPagesAction } from "../actions";

const n = (value: number) => value.toLocaleString("en");

export default async function AdminSystem() {
  const status = await getSystemStatus();
  const { redis } = status;
  const inSync = redis.indexed >= redis.pages;

  return (
    <>
      <header className="ad-head">
        <div>
          <h1>System</h1>
          <p>
            What the platform runs on. Accounts, pages and enquiries are in Postgres; Upstash holds counters, reset
            links and the page index.
          </p>
        </div>
      </header>

      <div className="ad-grid">
        <section className="ad-card" aria-labelledby="redis-title">
          <h2 id="redis-title">Upstash Redis</h2>
          <dl className="ad-facts">
            <div>
              <dt>Keys in total</dt>
              <dd>{redis.dbsize === null ? "Unavailable" : n(redis.dbsize)}</dd>
            </div>
            {redis.groups.map((g) => (
              <div key={g.label}>
                <dt>{g.label}</dt>
                <dd>
                  {n(g.count)}
                  {g.capped && "+"}
                </dd>
              </div>
            ))}
          </dl>
          <div className="ad-block">
            <h3>Page index</h3>
            <p className="ad-hint">
              The index lists every page address so a visit can be counted without waking the database.{" "}
              <b>
                {n(redis.indexed)} indexed, {n(redis.pages)} in Postgres.
              </b>{" "}
              {inSync ? "In sync." : "Some pages are missing from the index, so their views are not being counted."}
            </p>
            <div className="ad-inline">
              <ActionButton
                label="Rebuild the index"
                pendingLabel="Rebuilding…"
                primary={!inSync}
                action={reindexPagesAction}
                args={[]}
              />
            </div>
          </div>
        </section>

        <section className="ad-card" aria-labelledby="pg-title">
          <h2 id="pg-title">Postgres (Neon)</h2>
          <dl className="ad-facts">
            {Object.entries(status.tables).map(([table, count]) => (
              <div key={table}>
                <dt>{table.replace(/_/g, " ")}</dt>
                <dd>{n(count)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="ad-card" aria-labelledby="int-title">
          <h2 id="int-title">Services</h2>
          <ul className="ad-services">
            {status.integrations.map((i) => (
              <li key={i.name}>
                {i.on ? (
                  <CheckCircle2 className="ad-on" size={18} aria-hidden="true" />
                ) : (
                  <CircleSlash className="ad-off" size={18} aria-hidden="true" />
                )}
                <div>
                  <b>{i.name}</b>
                  <small>
                    {i.on ? "On" : "Off"} · {i.note}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
