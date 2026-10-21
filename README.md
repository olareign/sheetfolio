# Sheetfolio

Portfolio pages for civil engineers, managed from a schema-driven CMS.

- What to build: [`docs/prd.md`](docs/prd.md)
- How it looks: [`docs/design-system.md`](docs/design-system.md)

A pnpm workspace with two apps:

| App        | What                                                                       | Port  |
| ---------- | -------------------------------------------------------------------------- | ----- |
| `apps/web` | Next.js (App Router) + Upstash Redis: public pages, CMS, auth. MVP1 as-is. | :3000 |
| `apps/api` | NestJS: the backend for new work (email first; tracked links, digest).     | :4000 |

MVP1, the single Next.js app before the split, is kept as the `mvp1` tag and branch.

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill it in, see below
cp apps/api/.env.example apps/api/.env
pnpm dev                                       # both apps; or pnpm dev:web / pnpm dev:api
```

### Web environment (`apps/web/.env.local`)

| Variable                                             | Needed for                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Everything. Upstash console → database → REST API.                                              |
| `AUTH_SECRET`                                        | Sessions. Generate with `npx auth secret` (≥ 32 chars).                                         |
| `AUTH_RESEND_KEY`, `RESEND_FROM`                     | Magic-link email. Optional in development: without a key the link is printed to the dev server. |
| `NEXT_PUBLIC_SITE_URL`                               | Absolute links (e.g. `http://localhost:3000`).                                                  |
| `ADMIN_EMAILS`                                       | Comma-separated emails that get the `admin` role at onboarding.                                 |
| `BLOB_READ_WRITE_TOKEN`                              | Image uploads (Day 2).                                                                          |

The web app validates these on first use (`apps/web/lib/env.ts`) and fails with a list of what's missing.

### API environment (`apps/api/.env`)

| Variable                        | Needed for                                                                                     |
| ------------------------------- | ---------------------------------------------------------------------------------------------- |
| `PORT`                          | Listen port (default 4000).                                                                    |
| `WEB_ORIGIN`                    | The web app's origin, the only browser origin allowed to call the API. Required in production. |
| `RESEND_API_KEY`, `RESEND_FROM` | Email. Required in production; in development without a key, mail is printed to the console.   |

The API validates these at boot (`apps/api/src/config/env.ts`) and refuses to start with a list of what's wrong.
`GET /health` returns `{ status, email }`, where `email` is `resend` or `console`, so a misconfigured deploy is visible.

### Redis without an Upstash account

Run Redis behind Upstash's REST emulator ([SRH](https://github.com/hiett/serverless-redis-http)):

```bash
docker run -d --name sp-redis -p 6379:6379 redis:7
docker run -d --name sp-srh -p 8079:80 -e SRH_MODE=env -e SRH_TOKEN=local-dev-token -e SRH_CONNECTION_STRING=redis://host.docker.internal:6379 hiett/serverless-redis-http:latest
```

Then set `UPSTASH_REDIS_REST_URL=http://localhost:8079` and `UPSTASH_REDIS_REST_TOKEN=local-dev-token`.

Note: `@upstash/ratelimit` sends Lua scripts with an Upstash-only flag (`allow-key-locking`) that open-source
Redis rejects. Against a plain Redis the contact form logs `rate limiter unavailable` and fails open (the
enquiry still goes through). On Upstash the limit (5 per IP per hour) is enforced.

Without `AUTH_RESEND_KEY` in development, sign-in links and enquiry notifications are printed to the dev
server log instead of emailed.

## Deploying the web app to Vercel

Set Vercel → Project → Settings → **Root Directory** to `apps/web`. `apps/web/vercel.json` pins the framework to Next.js and the pnpm install/build commands, so the build is right even if
the project was imported before the code existed (Vercel then detects the framework as "Other" and every build
fails looking for a `public` output folder).

Set these in Vercel → Project → Settings → Environment Variables for **Production** (and Preview if you use it):

| Variable                                             | Notes                                                                                     |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Upstash database (REST)                                                                   |
| `AUTH_SECRET`                                        | `npx auth secret`                                                                         |
| `AUTH_RESEND_KEY`                                    | **Required in production**: the app refuses to serve without it                           |
| `RESEND_FROM`                                        | e.g. `Sheetfolio <no-reply@your-verified-domain>` (the domain must be verified in Resend) |
| `NEXT_PUBLIC_SITE_URL`                               | the production URL, e.g. `https://sheetfolio.vercel.app` (used for links, sitemap, OG)    |
| `ADMIN_EMAILS`                                       | who can open `/admin`                                                                     |
| `BLOB_READ_WRITE_TOKEN`                              | added automatically when you connect a Vercel Blob store                                  |

Production deploys come from pushes to `main`. `vercel` from the CLI creates a Preview; use `vercel --prod` for production.

## Scripts

| Script                                          | Does |
| ----------------------------------------------- | ---- |
| Run from the repo root; each runs in both apps. |

| Script                         | Does                                                            |
| ------------------------------ | --------------------------------------------------------------- |
| `pnpm dev`                     | Web on :3000 and API on :4000 (`dev:web` / `dev:api` for one)   |
| `pnpm test`                    | Unit tests (web: in-memory Redis fake; API: Vitest + supertest) |
| `pnpm typecheck`               | `tsc --noEmit`                                                  |
| `pnpm lint`                    | ESLint                                                          |
| `pnpm format` / `format:check` | Prettier                                                        |
| `pnpm build`                   | Production builds (need no secrets)                             |

## Sign-in and accounts

Two ways in, both on `/login`:

- **Username (or email) and password**, the everyday way. Passwords are hashed with scrypt and stored under
  `cred:{email}`; `username:{name}` maps a username to its email. 8 attempts per account and 30 per IP per 15 minutes.
- **Email link**, for a first sign-in. Once signed in, **Settings → Sign-in** sets a password.

Recovery and safeguards:

- **Forgot password** (`/forgot-password` → `/reset-password?token=…`). The link is single-use, expires in an hour, and
  only the newest link works. Only a SHA-256 of the token is stored (`reset:{hash}`). The form answers identically
  whether or not the account exists, and does the work after responding, so neither the text nor the timing leaks
  who has an account. 3 requests per account and 10 per IP per hour.
- **Sign out everywhere.** A password change or reset bumps `session-epoch:{email}`; every session carries the epoch it
  was issued under and is rejected once it no longer matches. Changing your password in Settings keeps the current
  device signed in. Setting a first password does not sign anyone out. This costs one Redis read per signed-in request.
- **Notification.** Every change or reset emails the owner ("Your Sheetfolio password was changed") with a link back
  to `/forgot-password`.

Sessions are signed cookies (JWT), not database rows: Auth.js only supports password sign-in that way. The adapter
still stores users and email-link tokens under `auth:`.

### Seeding

Run from `apps/web` (`pnpm --filter @sheetfolio/web seed ...` from the root). Reads the Redis credentials in
`.env.local`, so check which database that points at before running anything.

| Command                                                                  | Does                                                        |
| ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| `pnpm seed --file seed/x.json --email a@b.com`                           | Write a page and link its slug to that sign-in email        |
| `pnpm seed --file seed/x.json --email a@b.com --username ada`            | ...and give the account a username and a generated password |
| `pnpm seed --credentials-only --slug idris-rasaq --username idris-rasaq` | Give an existing account a username and generated password  |
| `pnpm seed --credentials-only --slug idris-rasaq --reset-password`       | Replace an existing password                                |
| `pnpm seed --list`                                                       | Accounts and whether each has a password                    |

Add `--force` to overwrite an existing page. Generated passwords go to `.credentials.local` (git-ignored, owner-only)
and are never printed; set `SEED_PASSWORD` to choose one. Seed files: `seed/idris.json`, `seed/abdulrasaq.json`.

## Layout

Web (`apps/web/`):

```
app/(public)     landing, /[slug] profile and /[slug]/projects/[id] (ISR, purged on publish)
app/(admin)/preview  the signed-in engineer's draft, rendered like the public page
app/(auth)       /login, /onboarding
app/(admin)      /dashboard (CMS)
content/         Zod schemas: one definition per content type drives forms, validation and types
lib/             env, redis (keys), auth, session, site (draft/publish/views/leads), accounts
components/sp/   design-system components
components/public/ public page sections
components/cms/  dashboard components
styles/          tokens.css + sp.css (verbatim from the design system), app.css (layout)
```

API (`apps/api/src/`):

```
config/          validated environment (ENV token), loaded once at boot
email/           EmailService: Resend REST, console fallback in development
health/          GET /health
```

Redis keys follow PRD §5.1. Auth.js adapter keys are stored under `auth:` so they never collide with the app's `user:{email}` records.
