# Where the data lives

**Postgres (Neon)** holds everything that must not be lost: accounts, passwords and sign-out stamps, enquiries, pages
(draft and published), and the durable copy of view and download totals.

**Redis (Upstash)** holds only what is short-lived or rebuildable:

| Redis key                   | What                                            | If Redis is lost                |
| --------------------------- | ----------------------------------------------- | ------------------------------- |
| `reset:*`, `reset-latest:*` | password-reset links (expire after an hour)     | people ask for a new link       |
| `views:*`, `cv:*`           | live view and download counters                 | `pnpm db:stats restore --apply` |
| `sites`                     | index of page addresses, checked on every visit | `pnpm db:stats reindex`         |
| rate-limit counters         | throttling of sign-in, enquiries and reset asks | start again from zero           |

`DATABASE_URL` is required: the app refuses to start without it.

## Tables

`db/migrations/NNNN_*.sql`, applied in order and never edited afterwards (forward-only; plain DDL only, see
`lib/db/migrate.ts`). To change the schema add the next numbered file, then `pnpm db:migrate` (it prints the database
host first and is safe to repeat). Run it **before** deploying code that needs the change.

## Pages

- Each page is one row in `sites`: the draft and the published copy as JSON, plus when they were saved, published and
  first published.
- Creating a page also adds its address to the Redis `sites` set. If that update fails it is logged
  (`[store] register page: index update failed`) and the page still exists, but its views are not counted until
  `pnpm db:stats reindex` runs. The command only adds; it never removes.

## View and download totals

Live counters are bumped in Redis on every public visit, which keeps the database asleep. A daily job
(`/api/cron/stats`, scheduled in `vercel.json`, guarded by `CRON_SECRET` sent as a bearer token) copies their totals into
`stats_daily`, `stats_projects` and `stats_cv`. A copy only ever raises a number. Redis keeps daily counts for 90 days;
Postgres keeps them.

```bash
pnpm db:stats flush              # copy the live totals to Postgres now (the daily job does this too)
pnpm db:stats restore            # dry run: how much Redis is missing compared with Postgres
pnpm db:stats restore --apply    # fill in what Redis is missing (never lowers a live count)
pnpm db:stats reindex            # rebuild the Redis page index from Postgres
```

Everything counted since the last daily run is lost if Redis is lost before the job has run.

## Things to know

- The scripts read `DATABASE_URL` and the Upstash variables from the environment or `apps/web/.env.local`.
- `pnpm seed` writes accounts and pages straight to Postgres (and the page index to Redis).
- Sign-in checks the sign-out stamp on every request: one small query.
- Neon's free compute scales to zero, so the first request after a quiet spell is slower. `/api/health` pings the
  database at most every 30 seconds, so it cannot be used to keep it awake.
- Old keys from before the move (`user:*`, `cred:*`, `username:*`, `slug:*`, `site:*`, `leads:*`, `session-epoch:*`) may
  still sit in Redis. Nothing reads them. They are a cold backup of the data as it was at the move; delete them only
  when you are sure Postgres is right.
