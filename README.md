# Siteproof

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

## Scripts

| Script                         | Does                                |
| ------------------------------ | ----------------------------------- |
| `pnpm dev`                     | Dev server on :3000                 |
| `pnpm test`                    | Unit tests (in-memory Redis fake)   |
| `pnpm typecheck`               | `tsc --noEmit`                      |
| `pnpm lint`                    | ESLint                              |
| `pnpm format` / `format:check` | Prettier                            |
| `pnpm build`                   | Production build (needs no secrets) |

## Layout

```
app/(public)     landing, public profile pages
app/(auth)       /login, /onboarding
app/(admin)      /dashboard (CMS)
content/         Zod schemas: one definition per content type drives forms, validation and types
lib/             env, redis (keys), auth, session, site (draft/publish/views/leads), accounts
components/sp/   design-system components
styles/          tokens.css + sp.css (verbatim from the design system), app.css (layout)
```

Redis keys follow PRD §5.1. Auth.js adapter keys are stored under `auth:` so they never collide with the app's `user:{email}` records.
