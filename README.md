# Dosinex

Portfolio pages for civil engineers, managed from a schema-driven CMS.

- What to build: [`docs/prd.md`](docs/prd.md)
- How it looks: [`docs/design-system.md`](docs/design-system.md)

A pnpm workspace with one app, `apps/web`: Next.js (App Router) + Upstash Redis, serving the public pages, the CMS and
sign-in. It owns the whole user flow (sign-in, onboarding, profile creation) and calls no other service.

The NestJS backend lives in its own repo, [`olareign/sheetfolio-api`](https://github.com/olareign/sheetfolio-api). It is
**not connected to this app and not deployed**, which keeps hosting costs at zero while the product is market tested.
Wiring the two together is a later step.

MVP1, the single Next.js app before the monorepo, is kept as the `mvp1` tag and branch.

## Setup

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill it in, see below
pnpm dev                                       # http://localhost:3000
```

### Web environment (`apps/web/.env.local`)

| Variable                                             | Needed for                                                                                      |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` | Everything. Upstash console → database → REST API.                                              |
| `AUTH_SECRET`                                        | Sessions. Generate with `npx auth secret` (≥ 32 chars).                                         |
| `AUTH_RESEND_KEY`, `RESEND_FROM`                     | Magic-link email. Optional in development: without a key the link is printed to the dev server. |
| `NEXT_PUBLIC_SITE_URL`                               | Absolute links (e.g. `http://localhost:3000`).                                                  |
| `ADMIN_EMAILS`                                       | Comma-separated emails that get the `admin` role at onboarding.                                 |
| `BLOB_READ_WRITE_TOKEN`                              | Image uploads, and the copies of project website pictures (see Project previews).               |
| `ANTHROPIC_API_KEY`                                  | Optional. Switches on Tailor to a job (AI). Without it the page says the feature is off.         |
| `ANTHROPIC_MODEL`                                    | Optional. Default `claude-opus-5-5`; `claude-sonnet-5-5` is faster and cheaper.                  |
| `SCREENSHOT_URL_TEMPLATE`                            | Optional. Screenshot service for project previews; `{url}` is replaced by the link. Default: Microlink. |

The web app validates these on first use (`apps/web/lib/env.ts`) and fails with a list of what's missing.

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
| `RESEND_FROM`                                        | e.g. `Dosinex <no-reply@your-verified-domain>` (the domain must be verified in Resend) |
| `NEXT_PUBLIC_SITE_URL`                               | the production URL, e.g. `https://dosinex.vercel.app` (used for links, sitemap, OG)    |
| `ADMIN_EMAILS`                                       | who can open `/admin`                                                                     |
| `BLOB_READ_WRITE_TOKEN`                              | added automatically when you connect a Vercel Blob store                                  |

Production deploys come from pushes to `main`. `vercel` from the CLI creates a Preview; use `vercel --prod` for production.

## Scripts

| Script                         | Does                                |
| ------------------------------ | ----------------------------------- |
| `pnpm dev`                     | Web on :3000                        |
| `pnpm test`                    | Unit tests (in-memory Redis fake)   |
| `pnpm typecheck`               | `tsc --noEmit`                      |
| `pnpm lint`                    | ESLint                              |
| `pnpm format` / `format:check` | Prettier                            |
| `pnpm build`                   | Production builds (need no secrets) |

## CV templates

A page can offer its visitors up to four CV layouts. Each is the same content, drawn differently, as a PDF generated on
request from the published page (`/api/cv/{slug}?template=…`).

| Template       | Look                                     | Best for                                |
| -------------- | ---------------------------------------- | --------------------------------------- |
| Classic        | Serif, centred name, underlined headings | Government, law, academia, engineering  |
| Modern         | Sans-serif, one accent colour (default)  | Tech and most professions               |
| Projects first | Sans-serif, projects ahead of experience | Engineers, freelancers, career changers |
| Minimal        | Sans-serif, no lines or colour at all    | Maximum compatibility                   |

**The owner chooses which layouts their page offers**, and which is the default, in the dashboard under
**Dashboard → CV** (every layout is on by default; Modern is the default). The same page shows a live preview of your saved draft in any layout, as the real PDF (`/api/cv/preview`, signed-in owner only, never cached). The choice is part of the draft, so it
reaches the public page on **Publish**. On the page, one offered layout is a plain "Download CV" button; several open a
list with the default first. The route only serves offered layouts: a missing, unknown or not-offered `?template=` gets the
page's default.

All four follow the same ATS rules: one column; real, selectable text; standard section names (Summary, Experience,
Projects, Skills, Education); contact details in the body, not a header or footer; plain bullets; no photos, icons,
tables, text boxes or coloured backgrounds; words never split by hyphenation. No Dosinex furniture appears on a CV
(no drawing numbers or revision stamps).

- Layouts are data in `lib/cv-layouts.ts`; one renderer (`lib/cv-pdf.tsx`) draws them, so they cannot drift apart.
  To add a template, add its id in `content/cv-templates.ts` and a layout entry.
- What goes on the CV is `content/cv.ts`. Line breaks in an experience's Notes become separate bullets.
- Fonts are embedded (`lib/fonts`, see its README) so Yoruba letters (Ọ, ẹ, ṣ), ₦ and curly quotes print correctly.
  Emoji and scripts the fonts lack (for example CJK) are removed from the CV rather than printed as junk.
- Tests read each PDF back as text, the way an ATS would (`test/pdf-text.ts`).

## Project previews and covers

A project's picture comes from, in order: a photo the owner uploaded, the picture read from the project's website, a stock photo for
its category (`public/stock/projects`, labelled "Stock photo" on the card).

- Saving a project with a **Project website** link reads that site (`lib/site-preview.ts`): its Open Graph or Twitter picture,
  title and description. A site with no picture gets a screenshot of its first screen instead. An empty "What was done" is filled
  from the site's description. The result is stored on the project as `preview` (written by the server, never by the form).
- The picture is copied into Blob storage when `BLOB_READ_WRITE_TOKEN` is set, so a page never depends on someone else's server.
  Without Blob (local runs) the site's own https picture is linked and screenshots are skipped.
- Requests are made on a user-supplied URL, so each redirect hop is checked against private networks, with a 4 s timeout, a size
  cap, and HTML or raster images only. If a site can't be read, the project still saves and the dashboard says what to do.
- The screenshot service sees only the project's public URL. Swap it with `SCREENSHOT_URL_TEMPLATE`.
- Stock photos are credited in `apps/web/public/stock/CREDITS.md`.

## Tailor to a job

Dashboard → Tailor to a job: the owner gives a job link or pastes the description and Claude
proposes a headline, summary, skills, experience wording and ordering from what is already on their page. They review
and edit it, download a PDF, and may keep up to three versions (table `tailored_cvs`, migration `0004`; apply it with
`pnpm db:migrate` before deploying). A version is an overlay on the page, so it never copies or changes the page; only
"Use on my page" does, and the first use keeps the owner's own wording for "Restore". Five runs per person per rolling
day (`DAILY_TAILORINGS`); the limiter fails closed because each run costs money. Contact details, private details,
referees and photos are never sent to Claude.

## Marketing pages

`/`, `/product`, `/examples`, `/stories` and `/pricing` live in `app/(marketing)` and read their copy from `content/marketing.ts`.
Stories and quotes there are **samples** (marked as such on screen) until real ones replace them; set `sample: false` for a real one.

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
- **Notification.** Every change or reset emails the owner ("Your Dosinex password was changed") with a link back
  to `/forgot-password`.

Sessions are signed cookies (JWT), not database rows: Auth.js only supports password sign-in that way. The adapter
still stores users and email-link tokens under `auth:`.

### Seeding

Run from `apps/web` (`pnpm --filter @dosinex/web seed ...` from the root). Reads the Redis credentials in
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

Redis keys follow PRD §5.1. Auth.js adapter keys are stored under `auth:` so they never collide with the app's `user:{email}` records.
