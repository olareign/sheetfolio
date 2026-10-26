# Moving data from Redis to Postgres (Neon)

Redis (Upstash) held everything. The plan is for Postgres to hold what must not be lost, and Redis to keep what is
short-lived or rebuildable (rate limits, reset links, caches, hot counters). It moves in phases, one kind of data at
a time, and each kind has a switch that can be moved forward or back.

| Phase | Moves                                           | Setting                         | Status                             |
| ----- | ----------------------------------------------- | ------------------------------- | ---------------------------------- |
| 1     | accounts, passwords, sign-out stamps, enquiries | `ACCOUNTS_STORE`, `LEADS_STORE` | built; waiting for a Neon database |
| 2     | pages (draft and published), the page list      | `SITES_STORE`                   | not started                        |
| 3     | view and download counts (daily rollups)        | `STATS_STORE`                   | not started                        |
| 4     | remove the Redis paths and old keys             | none                            | after 1–3 are settled              |

## The switch (`lib/store/mode.ts`)

| Mode       | Reads from | Writes to                      | Use                                |
| ---------- | ---------- | ------------------------------ | ---------------------------------- |
| `redis`    | Redis      | Redis                          | the default; nothing changes       |
| `dual`     | Redis      | Redis, then copied to Postgres | fill Postgres and watch it         |
| `pg-first` | Postgres   | Postgres, then copied to Redis | live on Postgres, Redis as the net |
| `postgres` | Postgres   | Postgres                       | finished                           |

A failed copy is logged (`[store] <what>: copy to pg failed`) and never fails the visitor's request; the backfill
repairs it. A failure on the side being read from does fail the request, as it should.

## Pages (phase 2)

- Each page is one row in `sites`: the draft and the published copy as JSON, plus when they were saved, published and
  first published.
- **The list of page addresses stays in Redis in every mode** (the `sites` set). The view counter checks it on every
  visit, and that must not wake the database each time. `pnpm db:backfill --verify` checks the index against Postgres.
- In `dual` and `pg-first`, a save copies the _whole page_ as it now stands to the other side, not just the one change,
  so any save repairs a page the copy was missing or had behind.
- Two saves of one page at the same instant could leave the copy one step behind until the next save or backfill.
  A page has one editor, so this is rare; `--verify` reports it if it happens.

## Moving a store, step by step

1. **Create the Neon project** in the same region as Vercel (`iad1`, so AWS us-east-1). Copy its pooled connection string.
2. **Add `DATABASE_URL`** to Vercel (Production). Nothing changes yet: both settings still default to `redis`.
3. **Create the tables:** put `DATABASE_URL` in `apps/web/.env.local`, then `pnpm db:migrate`. It prints the database host first. It is safe to repeat.
4. **Start copying new writes:** set the store settings you are moving (`ACCOUNTS_STORE`, `LEADS_STORE`, `SITES_STORE`) to `dual` on Vercel and redeploy.
5. **Copy what already exists:** `pnpm db:backfill` (dry run, shows counts), then `pnpm db:backfill --apply`.
6. **Check it:** `pnpm db:backfill --verify` must end with "Postgres matches Redis." Fix or repeat step 5 if not.
7. **Watch for a day.** Look in the Vercel logs for `[store]` lines. None means every write reached both.
8. **Switch reads:** run steps 5 and 6 once more, then set both to `pg-first` and redeploy. People are now served from Postgres.
9. **Finish:** after a few quiet days set both to `postgres`.

**Going back:** set the setting to the previous mode and redeploy. In `dual` and `pg-first` both sides have every write, so nothing is lost by stepping back. In `postgres` Redis stops receiving writes: step back to `pg-first` _before_ anything goes wrong, not after.

## Things to know

- `pnpm seed` writes through the same stores as the app, so it obeys the three settings (set them and `DATABASE_URL` in the environment or `.env.local`).
- `pnpm db:backfill` only ever reads Redis. It writes to Postgres. After `postgres` mode, rows exist only in Postgres, so `--verify` will list them as "rows only in Postgres", which is normal.
- Migrations are forward-only: never edit one that has been applied, add the next numbered file. Plain DDL only (see `lib/db/migrate.ts`).
- Sign-in checks the sign-out stamp on every request, which is one small query in Postgres modes.
