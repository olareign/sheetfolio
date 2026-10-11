# Sheetfolio: Architecture and Decision Records

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: `docs/prd-v2.md`, `docs/requirements.md`, `docs/mvp-scope.md`, `docs/user-journeys.md`, `docs/ui-ux-spec.md`.
> This document **recommends** an architecture and records each major decision as an ADR with status **Proposed**. Nothing here is final until you accept it. No code, schema or API contract is written here: the data model is document 9 and the API spec is document 10.

Labels: **CONFIRMED**, **ASSUMED**, **OPEN**, **PROPOSED**, **NEW**.

---

## 1. What the architecture must satisfy

Drawn from the approved documents. These are the forces that decide the options.

| Force | Source |
| --- | --- |
| Tracked redirects are fast, never blocked by recording, and still work if recording fails | FR-1.1, FR-1.8, NFR-2, NFR-3 |
| Click records hold no IP and no visitor identity; bots excluded before counting | BR-5, FR-1.3, FR-1.4 |
| Reports by week, by link, by job, by member, with first/repeat per link (later) | FR-1.6, FR-1.7, FR-5.2 |
| Detailed records kept 12 months, then summarised | FR-1.9 |
| Weekly digest at Tuesday 07:00 in each member's time zone, 5 to 8 matched jobs | FR-3.1 to 3.3 |
| 10 formats as configuration of shared sections; format 1 unchanged | O-17, ui-ux-spec §6 |
| One master, many variants, per-section follow or freeze | BR-1, BR-2, BR-10 |
| Public pages under 1.5 s on 4G, Lighthouse 90+, all formats | NFR-1 |
| Best-effort availability on a small budget; solo builder | NFR-3, constraints |
| Low hundreds of members at first | NFR-4 (ASSUMED) |
| Email sign-in and Google sign-in (NEW this round) | Your answer |
| Paystack billing later (phase 4) | FR-4.7 |

Two facts shape everything: **the load is small**, and **the builder is one person**. The recommendation therefore prefers fewer moving parts over scale headroom.

---

## 2. Current state (read-only review, CONFIRMED facts)

Next.js App Router app on Vercel; Auth.js with email magic link through Resend; Upstash Redis as the only datastore; Zod schemas drive the content editor; Vercel Blob for images; draft and publish with cache revalidation; a view-count beacon; contact form and leads inbox; CV PDF; platform admin with suspend. The repository's own guide warns that this Next.js version has breaking changes: **implementation must read the bundled docs first** (a rule for document 14).

---

## 3. Recommended architecture (summary)

PROPOSED, as a set of building blocks. Names are roles, not products, unless a decision record says otherwise.

1. **Web application** (one deployable): public pages, member app, admin, redirect endpoints, email links.
2. **Primary database** for accounts, masters, variants, links, jobs, digests and click records (ADR-1).
3. **Cache/limiter store** for rate limiting and short-lived data (Redis, as today).
4. **File storage** for images and materials (Blob, as today).
5. **Email service** for sign-in links, invitations, digests (Resend, as today).
6. **Scheduled and queued work** for digest sending, summarising and retries (ADR-5).
7. **Payments** (phase 4): Paystack through a thin service boundary.
8. **Observability**: error log, failed-send and failed-recording views (NFR-11).

**Boundaries kept clean from day one** (cheap now, expensive later):
- Click *recording* is separate from click *redirecting*.
- Format definitions are *data*, not code paths.
- Digest *matching* is a pure function of jobs and members, testable without email.
- Payments, AI and email sit behind small interfaces so they can be swapped.

```
Visitor / member / admin
        │
   Web application ──► Redirect + page rendering (fast path, cache-friendly)
        │                     │ fire-and-forget
        │                     ▼
        │               Click recorder ──► Primary database
        │
        ├─► Member app / admin ──► Primary database
        ├─► Files (images)
        └─► Email service ◄── Scheduled digest job + queue
```

---

## 4. Decision records

Each record: context, options, recommendation, consequences, what would make us revisit. All **Proposed**.

### ADR-1: Primary datastore (settles O-11 part 1)

**Context.** The product now needs reports (by week, link, job), tag-overlap matching, retention and summarising, and later per-link first/repeat counts. The existing Redis-only choice came from PRD v1.0 ("no SQL"), written for a single-page app with counters and a leads inbox.

**Options compared.**

| Criterion | A. Redis-only | B. SQL database (Postgres) as primary, Redis kept for limits/cache | C. Hybrid: Redis for hot counters, SQL for records |
| --- | --- | --- | --- |
| Weekly/link/job reports | Possible, but each report needs hand-built indexes or scans | Native queries | Native queries |
| Tag-overlap matching | Possible with sets, but multi-tag ranking is manual | Native | Native |
| Retention and summarising | Manual key expiry and rollups | Scheduled delete/insert from query | Same as B |
| Consistency (e.g., variant limits, idempotent webhooks) | Weak: no transactions across keys beyond scripts | Strong | Strong for records, weak for counters |
| Migration cost from today | None | One-off move of accounts, sites, leads | Same as B plus counters kept |
| Moving parts for a solo builder | 1 store | 2 stores (database + existing Redis) | 2 stores with a sync rule |
| Cost at low hundreds of members | Low | Low (free/small tiers exist) | Low |
| Risk | Reporting code becomes the product's hardest part | Migration effort and a new skill area | Two truths for counts |

**Recommendation (PROPOSED): B.** Move accounts, masters, variants, links, jobs, digests and click records to a SQL database; keep Redis for rate limiting and cache only. Reasoning: the new product is largely *reporting and matching*, which is where Redis-only is weakest; the data is relational (member → master → variant → link → click); transactions simplify plan limits and idempotent payment events later.

**Consequences.**
- PRD v1.0's "no SQL" rule is formally superseded (recorded in the PRD differences).
- A migration plan for existing data is required (document 13). The existing user's page must keep working through the move.
- Redis stays as a dependency, but with a smaller role.
- Which SQL product and host is an implementation choice for document 9 and 15; the requirement is "managed Postgres-compatible, with backups and a restore test (NFR-12)".

**Revisit if** click volume or member count grows far beyond the low hundreds, or the SQL cost/operations burden proves too high.

**Cheaper alternative if you disagree:** A can ship the MVP, but expect to rebuild reporting later. This risk is flagged, not hidden.

### ADR-2: Sign-in (settles O-11 part 2; includes your new Google request)

**Context.** Magic link via Auth.js v5 beta exists. You added Google sign-in. Journeys J1 and J6 depend on "magic link then continue to the editor", with the job preserved.

**Decision drivers.** Pre-release library risk; one account per person regardless of method; privacy; invitation-only during validation (O-16).

**Recommendation (PROPOSED).**
- Keep the sign-in library, **pinned to an exact version**, with a documented fallback plan (a short note in document 14 on how to swap it). Reassess when a stable release exists.
- **Methods:** email magic link **and** Google. Both resolve to the **same member account by verified email address**. A Google account whose email is not invited cannot create an account during validation.
- **Account linking rule (NEW):** if an invited email signs in with Google, it attaches to the invited account; no duplicate. Only Google emails marked verified by Google are accepted.
- **Admin** access is a role on the account, never a separate login system.
- **Session** length and cookie rules are set in document 11.

**Consequences.**
- Google sign-in adds a third-party identity provider: a privacy notice update (member-side, not visitor-side), consent screen setup and an app-verification step with Google (lead time, O-28).
- The "neutral message for unknown emails" rule (ui-ux-spec M1) applies to both methods.
- Visitors still never sign in (BR-5).

**Revisit if** the library's stable release changes behaviour, or Google sign-in lowers invite control.

### ADR-3: Content model and the 10 formats (settles O-11 part 3 and O-17)

**Context.** The existing CMS is schema-driven (Zod) and built for one format. All 10 formats are MVP scope; the approved mitigation is "formats as configuration of shared sections".

**Options.**
- A. Ten separate schemas and ten page components.
- B. **One shared section library with a format definition per category** (which sections, in what order, with what labels, rules and reminders).
- C. A fully generic page builder.

**Recommendation (PROPOSED): B.**
- A *section* has a type (see ui-ux-spec §6.1), a validation rule, a renderer and an editor.
- A *format* is data: an ordered list of sections, section labels, required fields, sample content, confidentiality reminders, and layout variant.
- Format 1 (drawing sheet) is expressed as a format definition **without changing its rendered output** (guarded by a visual/snapshot test, document 12).
- Adding a format is a contained change: new definition, optional new renderer variant, tests (NFR-13).
- The master and variants store *section content keyed by section id*, so changing format later (O-25) keeps hidden content.

**Consequences.**
- Layout differences between formats are renderer variants of shared sections, not new pages. If a format needs something truly unique (the menu layout, perhaps), that is added as a section type, not a fork.
- The generic fallback layout (story B6) is simply a format definition.
- Image-heavy formats get per-format image rules in the definition.

**Revisit if** more than two formats need unique section types, which would show the library is too narrow.

### ADR-4: Click recording and redirects

**Context.** Redirects must be fast and survive recording failure; no IP or identity is stored; bots must be excluded.

**Recommendation (PROPOSED).**
- The redirect decides the destination from stored data and answers immediately.
- Recording happens **after** the response is sent (fire-and-forget), with a retry buffer so a short database outage does not lose clicks when avoidable; losses are accepted and counted (FR-1.8).
- **Bot rules:** known preview/scanner user-agent list, plus "within 2 seconds of the send time" (FR-1.4). Rules live in configuration so they can be updated without a release.
- **What is stored:** time, link, type, member, digest, country, device class, first/repeat. The country is derived from the request at the edge and the address is discarded immediately; it is never written to storage or logs (BR-5). **Log hygiene is a requirement:** platform request logs can contain IPs, so the retention and access of those logs are reviewed in document 11.
- **First vs repeat** (O-19 still OPEN). Options for document 11: (a) per-link counts only, no repeat concept; (b) a short-lived, non-reversible token in a cookie set only on shared pages; (c) a salted, rotating hash of coarse signals. Each has a privacy cost; (a) is the least intrusive and is the **MVP default (PROPOSED)** because repeat visits are watch-only in the MVP.
- **Redirect safety:** the destination is looked up from a stored job or code, never taken from the URL (FR-1.1), preventing open-redirect abuse. Rate limits apply to public endpoints (NFR-7).
- **Retention:** nightly or weekly job summarises records older than 12 months into weekly per-link totals and deletes the rows (FR-1.9).

**Consequences.** Link click counting is eventually consistent by seconds to minutes; the UI says counts may lag (ui-ux-spec M10).

**Revisit if** recording loss exceeds an agreed share (threshold OPEN, O-29) or privacy review rejects the design.

### ADR-5: Scheduled and background work

**Context.** Needed: weekly digest send in each member's time zone (Tuesday 07:00 local, tolerance O-21), retries, 12-month summarising, later reminders and payment events.

**Options.**
- A. Scheduled routes on the current host only (cron calling an endpoint).
- B. **Scheduled trigger plus a durable queue**, still inside the same deployable.
- C. Separate worker service.

**Recommendation (PROPOSED): B.** A frequent scheduled trigger (for example every 15 minutes) finds members whose local Tuesday 07:00 has just passed and who have no digest sent for the week, and enqueues one send per member. Sends are idempotent per (member, week), so a repeated trigger cannot double-send. Failures retry with a limit and surface in the admin Failures screen (A9).

**Why not A:** one long run risks timeouts as members grow and has no per-member retry. **Why not C:** more to run than a solo builder needs at this scale.

**Consequences.** A 15-minute trigger sets the practical "07:00 member time" tolerance (answering O-21 as PROPOSED: within 15 minutes). Platform plan limits on scheduled jobs need checking (O-30).

**Revisit if** the member count or send volume exceeds the platform's job limits.

### ADR-6: Email

**Recommendation (PROPOSED).**
- Keep the existing email service for sign-in, invitations and digests, behind a small internal interface.
- Use a dedicated sending domain with authentication set up before the first digest (document 15).
- Digest sending respects unsubscribe, suppression and bounce handling; complaint rates are watched (document 11).
- The digest is a distinct stream from sign-in email so deliverability problems in one do not block the other (ASSUMED).

**Consequences.** Free-tier limits and rate limits must be checked against the first digest size (O-31).

### ADR-7: Hosting, environments and caching

**Recommendation (PROPOSED).**
- Keep the current host for the web application. Public pages use cached rendering with on-demand refresh at publish (existing pattern); redirect and recording endpoints are lightweight and avoid per-request heavy work.
- Environments: local, preview (per pull request), production. **Production deploys only from the main branch**, which is why docs live on a branch (CONFIRMED practice so far).
- Secrets only in platform configuration, never in the repository (NFR-7).
- Images are processed to sizes that meet NFR-1; limits OPEN (O-12).

**Revisit if** cost or performance of the current host fails NFR-1 for image-heavy formats.

### ADR-8: Tailoring aids and AI (phase 4, recorded early so MVP does not block it)

**Recommendation (PROPOSED).** AI sits behind one interface that takes a job ad and a master and returns a *draft variant*; it never publishes (FR-4.1). Model, provider and cap are OPEN (O-6). Nothing in the MVP calls an AI service. The variant editor's data model must already allow a "created from job" origin and an "AI draft" flag so phase 4 does not reshape it.

### ADR-9: Payments (phase 4, boundary only)

**Recommendation (PROPOSED).** Payments are an isolated module: plan state is the application's source of truth, updated by *verified, idempotent* payment events (FR-4.8). Failed or duplicate events change nothing. Recurring USD support is verified before design (O-7). The MVP contains no payment code, but plan fields exist in the data model with a "free during validation" value so migration is unnecessary later.

### ADR-10: Libraries and versions

**Recommendation (PROPOSED).**
- Pin every dependency to an exact version; update deliberately.
- Treat pre-release libraries as risks with named owners and an upgrade check each month.
- Because the framework version differs from common knowledge, implementers must read the bundled framework docs before writing code (repository rule).
- Prefer well-supported libraries; avoid adding a dependency for something small.

---

## 5. Cross-cutting concerns

| Concern | Approach (PROPOSED) |
| --- | --- |
| **Security** | Server-side authorisation on every member and admin action; members can only reach their own records; admin role checked server-side; input validation at every boundary; upload type/size checks; webhook signature checks (phase 4). Detail in document 11. |
| **Privacy** | No IP stored; country only; no visitor identity; log retention reviewed; the public repository's personal data removed before invitations (known risk). |
| **Performance** | Cached public pages; image sizing; lightweight redirect; budgets enforced in tests (document 12). |
| **Observability** | Error log; counters for failed sends, failed recordings, queue backlog; admin Failures screen (A9). |
| **Backups** | Managed database backups with a tested restore before launch; targets OPEN (O-15). Blob and Redis recovery stance stated in document 15. |
| **Testability** | Matching and format rules are pure and unit-tested; redirects and recording tested with a fake store; end-to-end tests for J1 to J6. |
| **Migration** | Move existing data in a reversible, rehearsed step; the first real user's page must not go offline (document 13). |
| **Accessibility** | Enforced through the shared section renderers, tested per format. |

---

## 6. Risks specific to the architecture

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Moving to SQL delays the MVP | Loop tested late | Do it first and small; migrate only what exists today (one user); no feature work on the old store beyond bug fixes |
| Format configuration proves too rigid | Forks creep in | ADR-3 revisit trigger; start with formats 2 and 3 to test the library before the rest |
| Pre-release sign-in library breaks | Members locked out | Exact pin, fallback note, test of both sign-in methods |
| Google verification takes weeks | Delays Google launch | Start early; magic link alone is enough for the MVP (see O-28) |
| Scheduled-job limits too low | Digest misses its slot | Check platform limits first (O-30); keep sends idempotent so a late run is safe |
| Recording loss unnoticed | Gate numbers wrong | Failure counters visible to admin; agreed loss threshold (O-29) |
| Platform request logs contain IPs | Breaks the privacy promise | Document 11 reviews log retention and access before launch |

---

## 7. Differences from the current implementation

| Area | Today | Proposed | Needs approval |
| --- | --- | --- | --- |
| Datastore | Redis only | SQL primary, Redis for limits/cache | ADR-1 |
| Sign-in | Magic link | Magic link plus Google, one account by verified email | ADR-2 |
| Content | One format, schema-driven | Shared sections plus format definitions | ADR-3 |
| Measurement | View counters | Per-click records with retention and summaries | ADR-4 |
| Background work | None | Scheduled trigger plus queue | ADR-5 |

---

## 8. Open questions added by this document

| ID | Question | Proposal |
| --- | --- | --- |
| O-28 | Google sign-in: acceptable if the MVP launches with magic link alone while Google verification is pending? | PROPOSED: yes |
| O-29 | What share of lost click recordings is acceptable before the gate numbers are distrusted? | PROPOSED: under 1% |
| O-30 | Do the host's scheduled-job and queue limits fit a 15-minute trigger and the first digest? | Check before phase 3 |
| O-31 | Do the email service's free-tier limits fit the first digest and sign-in volume? | Check before phase 3 |
| O-32 | Which managed SQL product and region? | Decide in documents 9 and 15 |
| O-21 | Tolerance for "07:00 member time" | PROPOSED: within 15 minutes (ADR-5) |

---

## 9. Approval

- [ ] ADR-1 datastore recommendation (SQL primary, Redis kept for limits and cache)
- [ ] ADR-2 sign-in (magic link plus Google, one account by verified email)
- [ ] ADR-3 formats as configuration of shared sections
- [ ] ADR-4 to ADR-7 click recording, background work, email, hosting
- [ ] ADR-8 to ADR-10 recorded as boundaries and rules
- [ ] Open questions O-28 to O-32 acknowledged; O-21 answered as proposed
- [ ] Approved to start document 9 (database design and data model)
