# Sheetfolio

Portfolio pages for civil engineers, managed from a schema-driven CMS. Next.js (App Router) + Upstash Redis.

- What to build: [`docs/prd.md`](docs/prd.md)
- How it looks: [`docs/design-system.md`](docs/design-system.md)

## Setup

```bash
pnpm install
cp .env.example .env.local   # then fill it in, see below
pnpm dev
```

### Environment

| Variable                                             | Needed for                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Everything. Upstash console → database → REST API.                                              |
| `AUTH_SECRET`                                        | Sessions. Generate with `npx auth secret` (≥ 32 chars).                                         |
| `AUTH_RESEND_KEY`, `RESEND_FROM`                     | Magic-link email. Optional in development: without a key the link is printed to the dev server. |
| `NEXT_PUBLIC_SITE_URL`                               | Absolute links (e.g. `http://localhost:3000`).                                                  |
| `ADMIN_EMAILS`                                       | Comma-separated emails that get the `admin` role at onboarding.                                 |
| `BLOB_READ_WRITE_TOKEN`                              | Image uploads (Day 2).                                                                          |

The app validates these on first use (`lib/env.ts`) and fails with a list of what's missing.

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

## Deploying to Vercel

`vercel.json` pins the framework to Next.js and the pnpm install/build commands, so the build is right even if
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

| Script                                    | Does                                                                                          |
| ----------------------------------------- | --------------------------------------------------------------------------------------------- |
| `pnpm dev`                                | Dev server on :3000                                                                           |
| `pnpm test`                               | Unit tests (in-memory Redis fake)                                                             |
| `pnpm typecheck`                          | `tsc --noEmit`                                                                                |
| `pnpm lint`                               | ESLint                                                                                        |
| `pnpm format` / `format:check`            | Prettier                                                                                      |
| `pnpm build`                              | Production build (needs no secrets)                                                           |
| `pnpm seed [--force] [--email you@x.com]` | Load `seed/idris.json` (PRD §9) into draft + published; `--email` links the slug to a sign-in |

## Layout

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

Redis keys follow PRD §5.1. Auth.js adapter keys are stored under `auth:` so they never collide with the app's `user:{email}` records.
