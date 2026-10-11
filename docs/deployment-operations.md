# Sheetfolio: Deployment, Monitoring and Operational Requirements

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: `docs/architecture.md` (ADR-1 to ADR-11), `docs/security-privacy-risk.md`, `docs/testing-qa-strategy.md`, `docs/roadmap.md`, `docs/engineering-conventions.md`.
> This is the last of the 15 discovery documents. It describes where things run, how they are released, watched and recovered. It contains **no infrastructure code, configuration files or provisioning steps**. Prices and platform limits change often: every figure marked "to verify" must be checked on the provider's current page before a decision is final.

Labels: **CONFIRMED**, **ASSUMED**, **OPEN**, **PROPOSED**, **NEW**.

---

## 1. Decisions taken for this document

| Decision | Choice | Status |
| --- | --- | --- |
| Backend codebase | Separate repository (ADR-11) | CONFIRMED |
| Backend host | **No platform preference stated.** Options are compared and one is recommended in ADR-12 (§4). Your answer to the host question was "a separate repo for backend", which is already decided, so I treated the host as open | OPEN, recommendation PROPOSED |
| Frontend host | Stays on the current host (Vercel) | CONFIRMED |
| Monitoring level | **Essentials:** uptime check, error tracking, failure counters, weekly digest report, cost watch | CONFIRMED |
| Alert channels | **Email, phone push and a messaging app** (all three) | CONFIRMED |
| Recovery targets (O-15) | **Daily backups with a tested restore; accept up to 24 hours of data loss and about a day to recover** | CONFIRMED |
| Availability | Best effort, no formal uptime target (NFR-3) | CONFIRMED |

---

## 2. Operating context

- One operator (you), no on-call team, no fixed date (R-19).
- Low hundreds of members at first (NFR-4, ASSUMED); the load is small and spiky: the Tuesday digest window and clicks that follow it.
- Time-critical work is the **weekly digest send** and the **redirects** that follow. Everything else tolerates short outages.
- Members and visitors are mostly in Nigeria and possibly abroad; phones on mobile networks (P1).
- Privacy promises depend on infrastructure behaviour (logs, regions), so operations are part of the privacy design (R-2).

---

## 3. Components and where they run

| Component | Role | Host (PROPOSED) | Notes |
| --- | --- | --- | --- |
| Frontend app | Pages, member app, admin | Current host (Vercel) | Production from `main` only (CONFIRMED) |
| Backend API | Rules, redirects, recording, jobs | ADR-12 (below) | Reached from the frontend host's edge (ADR-11) |
| Background worker | Digest sends, retries, purge, summarising | Same platform as the API | Separate process from the web API so a send run cannot slow redirects |
| Scheduler | 15-minute dispatcher trigger, daily purge, weekly summariser | Platform scheduled jobs (ADR-5) | Check limits (O-30) |
| Primary database | SQL (ADR-1) | Managed Postgres-compatible | Daily backups, restore test (O-32) |
| Cache / limiter / queue store | Redis-compatible | Managed Redis-compatible store | Used for rate limits, cache, and queue (ADR-5) |
| File storage | Images, materials | Current blob storage | Limits per O-12 |
| Email service | Sign-in, invitations, digest | Current email service | Authenticated sending domain |
| Domain and DNS | One public domain | Current registrar/DNS | See §7 |
| Error tracking and uptime | Essentials monitoring | Third-party services (§9) | Must not capture visitor addresses |
| Source and pipelines | Two repositories | GitHub with pipelines | Secret scanning and dependency alerts |

---

## 4. ADR-12: Backend hosting (PROPOSED)

**Context.** The backend needs: an always-warm web service (cold starts would slow redirects, NFR-2), a separate worker, scheduled triggers, managed SQL with backups, a Redis-compatible store, private networking between them, preview environments, and a small budget for a solo operator.

**Options compared.**

| Criterion | A. Container/managed platform (for example Render) | B. Same host as the frontend (serverless functions) | C. Small VPS you manage |
| --- | --- | --- | --- |
| Always-warm web service | Yes on paid instance types (to verify; free tiers may sleep) | Functions start on demand; cold starts possible | Yes |
| Separate worker process | Native | Awkward; uses queues and cron calling functions | Yes, you run it |
| Scheduled jobs | Native cron jobs (to verify minimum interval) | Cron triggering functions; plan limits (O-30) | You configure |
| Managed SQL with backups | Native, with backup/restore (to verify retention by plan) | Via a partner database | You run and back it up yourself |
| Redis-compatible store | Native managed store | Via a partner | You run it |
| Private network between parts | Native | Public calls only | You configure |
| Preview environments | Supported | Native | You build |
| Ops effort for one person | Low to medium | Lowest at first, grows with queue needs | **Highest** (patching, security, backups) |
| Cost | Predictable small monthly total (to verify) | Low at first, can climb with function time | Lowest base, but your time is the cost |
| Fit with your stack | Good: TypeScript service, Postgres, Redis, queue worker | Good for the API, weaker for workers | Good, but all manual |
| Lock-in | Moderate, standard containers and Postgres | Higher, platform-specific functions | Low |

**Recommendation (PROPOSED): A.** Run the backend API, worker, scheduler, SQL database and Redis-compatible store on one managed container platform, in a region close to most users (to verify region options, and note Nigeria is usually served best from a European or nearest African-adjacent region; O-73). The frontend stays on the current host. Reasons: native workers and cron fit ADR-5; managed backups serve the recovery target; private networking keeps the database off the public internet; operating effort stays low for one person.

**Consequences.**
- Two platforms to pay and watch (frontend host and backend host).
- A second set of environment variables and secrets (api-spec §2.1, conventions §13).
- Redirect path crosses from the frontend host's edge to the backend platform (ADR-11); the added delay is measured (T-1.13, O-61). **If the delay is too high, fall back to B or to hosting both on one platform.**
- Free or entry tiers may sleep, expire or limit the database; the **production tier must be chosen on verified current terms**, not assumed (O-74).

**Revisit if** cost exceeds the monthly cap (O-56), redirect delay exceeds budget, or the platform cannot meet the scheduled-job interval.

---

## 5. Environments

| Environment | Purpose | Data | Email | Deploys |
| --- | --- | --- | --- | --- |
| Local | Development | Fictional seed data | Printed to the console (existing behaviour) | Manual |
| Preview | One per pull request in each repository | Fictional data in a disposable database | Test sink | Automatic on pull request |
| Staging | Dry runs, migration rehearsals, restore tests, performance runs | Fictional or anonymised data | **Only to test mailboxes** | From `main` or a release branch, automatic |
| Production | Real members | Real | Real | **Only from `main`** (CONFIRMED), after a green pipeline |

Rules:
- Previews and staging never use production secrets or production data (conventions §13).
- Preview frontends point at a matching preview backend or a stable test backend (api-spec §7).
- Sending real email outside production is blocked by configuration, not by discipline.
- Documentation-only branches do not deploy (as with PR #1).

---

## 6. Release and deployment process

### 6.1 Pipeline stages (builds on testing doc §7)
1. Lint, types, unit and component tests, secret scan, dependency alerts.
2. Contract and integration tests; privacy tests PR-1 to PR-5.
3. Build.
4. Deploy to preview; end-to-end and accessibility checks at phone width.
5. Merge to `main` → deploy to staging → smoke checks.
6. Promote to production (automatic or one-click; PROPOSED: **one-click** during the MVP so you choose the moment, O-75).
7. Production smoke checks: sign-in page loads, a test application link resolves, a test job redirect works, health endpoint is green.

### 6.2 Ordering across the two repositories
- **Contract changes:** backend first (additive), then frontend (ADR-11, conventions §7).
- **Database migrations:** run before the code that needs them, and be backward compatible with the previous release so a rollback is safe. Destructive steps happen in a later, separate release.
- Never deploy the frontend and backend together in one step if the contract changed incompatibly (it must not).

### 6.3 Rollback
| Situation | Action |
| --- | --- |
| Bad frontend release | Redeploy the previous build (instant on the current host) |
| Bad backend release | Redeploy the previous image/version; the compatibility rule keeps the frontend working |
| Bad migration | Run the reverse step if available; otherwise restore from the pre-deploy backup (§10) |
| Bad digest | Hold the queue, stop the dispatcher, fix, then resume; idempotency prevents double sends (ADR-5) |

### 6.4 Release timing
- Avoid deploying in the hours before the Tuesday send window (PROPOSED: no production deploys from Monday 18:00 to Tuesday 12:00 Lagos time) (O-76).
- Keep a short release log: date, version, what changed, who approved.

---

## 7. Domain, DNS, TLS and email authentication

| Item | Requirement |
| --- | --- |
| One public domain | Shared pages, job links and the app all use it; frontend and backend are reached through it (ADR-11) |
| TLS | HTTPS everywhere, automatic renewal; certificate expiry monitored |
| Redirect paths | `/s/{code}` and `/j/{job}` forwarded to the backend unchanged |
| Email sending domain | Dedicated sending domain or subdomain, with the standard sender authentication records and a reporting address, verified **before the dry run** (T-3.7). The digest stream is kept separate from sign-in email (ADR-6) |
| DNS access | Documented, with who can change it (you, plus the backup contact in an emergency, O-55) |
| Custom domains for members | Not in the MVP (O-9) |

---

## 8. Configuration and secrets

- All secrets live in each platform's secret store, never in code, logs, tickets or screenshots.
- Variables are documented by name and purpose, validated at startup with a clear missing-list (conventions §13).
- **Rotation plan:** any secret exposed or suspected exposed is rotated at once; routine rotation of key credentials (sessions, email, database, service credentials) at least yearly and after any team change (PROPOSED, O-77).
- **Inventory** (kept privately): sign-in secrets, session secret, database credentials, Redis credentials, email key, storage token, service credentials between frontend and backend (one per direction and environment), email event signing secret, monitoring keys. Phase 4 adds payment and AI keys.
- **Access:** only you hold production access; the backup contact (O-55) has a sealed emergency route (for example a password manager emergency share), not day-to-day access.
- Two-step verification is enabled on every platform account involved (source, hosts, email, DNS, registrar).

---

## 9. Monitoring and alerting (Essentials, CONFIRMED level)

### 9.1 What is watched
| Signal | Source | Why |
| --- | --- | --- |
| **Uptime** of the public site, a shared-page address, a job redirect, the sign-in page | External uptime checker, 1 to 5 minute checks | NFR-3, R-12 |
| **Errors** in frontend and backend | Error tracking service configured to **strip addresses, tokens and member content** | NFR-11, PR-1 |
| **Failed digest sends** and queue backlog | Failure counters in the Failures screen (A9) plus alert | R-9, FR-3.3 |
| **Missed Tuesday digest** (no sends started by 07:30 in the first time zone due) | Scheduler heartbeat | Core loop |
| **Failed click recordings** and loss share | Failure counters (ADR-4, O-29) | Gate integrity |
| **Bounce and complaint rates** | Email events (api-spec §6.1) | R-9, O-54 |
| **Database and platform health**: connections, disk, backups succeeded | Platform metrics | Recovery |
| **Redirect speed** (p50 and p95) | Synthetic checks and platform timings | NFR-2 |
| **Certificate expiry** | Uptime checker | Availability |
| **Cost** against the cap | Weekly check of platform billing pages; threshold alert if offered (O-56) | R-18 |
| **Security signals**: repeated sign-in failures, unusual redirect volume | Application counters | R-8 |

### 9.2 What is **not** watched
- Individual visitors, addresses or behaviour (BR-5).
- Email opens (FR-1.5, O-45).
- Member content.

### 9.3 Alert routing (CONFIRMED: email, phone push, messaging app)
| Severity | Examples | Channel | Expected response |
| --- | --- | --- | --- |
| **Urgent** | Site or redirects down; Tuesday digest not started; database unreachable; suspected breach | Phone push **and** messaging app | Within the hour when awake |
| **Important** | Failed sends above threshold; recording loss above 1%; backup failed; complaint rate above threshold | Messaging app and email | Same day |
| **Routine** | Weekly digest report; cost summary; dependency alerts; certificate expiring in 30 days | Email | Within the week |

Alert hygiene: every alert must be actionable; noisy alerts are tuned or removed; a quiet hours rule (PROPOSED: urgent only between 23:00 and 06:00 Lagos time, except the Tuesday window) (O-78).

### 9.4 Weekly operating report (automatic, email)
Digest sent / failed / retried, click recording loss, bounce and complaint rates, redirect speed, uptime, costs, open incidents. It is the operations companion to the admin Digest tab (A2).

---

## 10. Backup, restore and disaster recovery (O-15 answered)

| Item | Requirement |
| --- | --- |
| **Target** | Up to **24 hours** of data loss and about **a day** to recover (CONFIRMED) |
| Database | Automatic daily backups on the managed plan; retention at least 7 days (to verify on the chosen plan) |
| Restore test | **Before launch (G0/T-0.5.5) and then quarterly:** restore into staging, check row counts and a sample page (NFR-12) |
| Pre-change backups | A manual backup before every production migration and before the Redis-to-SQL cut-over |
| File storage | Uploaded files are backed up or versioned according to the provider; loss stance stated here: a lost image is recoverable by the member re-uploading, but the plan records whether the provider supports recovery (O-79) |
| Redis-compatible store | Treated as **rebuildable** (limits, cache); the queue is protected by idempotency, so a lost queue is recovered by the dispatcher (ADR-5) |
| Click data | The main exposure to a 24-hour loss; stated to you honestly in the gate reading: one day of lost clicks does not change the decision, but repeated loss does (O-29) |
| Code and documents | In source control with a second copy (the hosting provider) |
| Purge and backups | Purged data remains in backups until they roll off; this is stated in the notice and restoration procedure re-applies pending purges (data model §7) |
| **Restore runbook** | Written steps, who, in what order, how to confirm, how to communicate; stored somewhere not dependent on the systems being restored |

**Disaster scenarios and first moves**
| Scenario | First move |
| --- | --- |
| Backend platform outage | Public pages already cached keep serving; redirects fail safe where possible (FR-1.8); post a status note; wait or redeploy elsewhere (the system is container-based so a move is possible but slow) |
| Database corruption or deletion | Stop writes, restore the last good backup to a new instance, point the backend at it, announce the data loss window |
| Frontend host outage | Redirects and recording keep working (backend independent); communicate; wait or redeploy |
| Email provider outage | Hold the digest; retry within the week; notify members if skipped |
| DNS or domain problem | Use the registrar's recovery; backup contact helps (O-55) |
| Account takeover of a platform | Revoke tokens, rotate secrets, review logs, follow the breach runbook (security doc §7) |

---

## 11. Incident management (builds on security doc §7)

| Step | Rule |
| --- | --- |
| Severity | Urgent / important / routine as in §9.3 |
| Record | A short incident log: time, what happened, impact, actions, cause, follow-ups |
| Communication | Members: a short message for anything affecting a digest or their page. Visitors: no tracking-based notice is possible, so rely on status text on the site when needed |
| Privacy incidents | Follow the breach runbook; use the 72-hour planning target (to verify with the specialist) |
| After | Fix the cause, add a test or alert, update the relevant document |

**Status communication (O-80):** a simple status page or pinned status note is PROPOSED once members exist; in the pilot a direct message to members is enough.

---

## 12. Routine operations (the weekly and periodic rhythm)

| When | Task | Owner |
| --- | --- | --- |
| **Weekly (Mon–Fri)** | Collect and tag jobs; check source terms; build the digest (≈2 hours for 3 categories, hypothesis) | You |
| **Tuesday** | Confirm the send started on time; watch failures for the first hour | You |
| **Friday** | Review the Digest tab and the weekly operating report; drop sources with no clicks for 3 weeks | You |
| **Weekly** | Review error tracking and dependency alerts | You |
| **Monthly** | Cost check; pre-release library check (ADR-10); review bot rules; review suspended pages | You |
| **Quarterly** | Restore test; secrets and access review; review this document; re-check provider limits | You |
| **Before each phase** | Re-run the security assessment (R-20), check platform limits (O-30, O-31) | You |
| **Yearly** | Rotate key secrets; privacy review refresh; processor register check | You |

---

## 13. Capacity and cost management

| Topic | Rule |
| --- | --- |
| Capacity assumption | Low hundreds of members; one digest per member per week; clicks cluster after sends (NFR-4) |
| First load test | Once, at 10× the expected digest size and redirect traffic in staging (testing doc §13) |
| Scaling | Start with the smallest production-grade instance sizes; scale up on measured need, not guesses |
| Cost cap | Monthly cap set by you (O-56). Weekly check in the first months |
| Cost drivers to watch | Backend instances (always on), database size and backups, images and bandwidth, email volume, error tracking events, phase 4 AI usage |
| Cost levers | Image size limits, summarising click data, sampling error events, pausing preview environments when idle |
| Data growth | Detailed clicks capped by 12-month retention (FR-1.9); bot clicks removed after the tuning window |

---

## 14. Compliance and operational privacy checklist

Before inviting members (ties to security doc §10):
1. Log audit complete for every layer; shortest retention set (R-2).
2. Region choices recorded in the processor register (O-48, O-32, O-73).
3. Monitoring tools configured to exclude addresses, tokens and member content.
4. Backups encrypted; restore tested.
5. Admin extra verification enabled on the app and two-step verification on all platform accounts.
6. Sending domain authenticated and unsubscribe tested.
7. Incident runbook, restore runbook and backup contact in place.
8. Privacy notice matches what the infrastructure actually does.

---

## 15. Operational requirements (numbered, testable)

| ID | Requirement | Source |
| --- | --- | --- |
| OPS-1 | Production deploys only from `main`, after a green pipeline | CONFIRMED practice |
| OPS-2 | Previews and staging never use production secrets or data and never email real people outside the dry-run set | Conventions §13 |
| OPS-3 | Every production migration is preceded by a backup and is backward compatible with the previous release | §6.2 |
| OPS-4 | Rollback steps exist and are tested for frontend, backend and migrations | §6.3 |
| OPS-5 | The Tuesday digest start is monitored with an alert if it has not begun by 07:30 in the first due zone | §9.1 |
| OPS-6 | Redirects and recording are monitored for failure and speed; loss above 1% alerts | ADR-4, O-29 |
| OPS-7 | Monitoring and logs never store visitor addresses, tokens or member content | PR-1, §9.2 |
| OPS-8 | Daily database backups; restore tested before launch and quarterly | O-15, NFR-12 |
| OPS-9 | Recovery targets: ≤24 hours data loss, ≈1 day to recover | CONFIRMED |
| OPS-10 | Urgent alerts reach phone push and the messaging app; important alerts reach the messaging app and email | §9.3 |
| OPS-11 | Secrets are rotated after exposure, and key ones yearly | §8 |
| OPS-12 | Costs are reviewed weekly during the MVP against the cap | §13 |
| OPS-13 | A weekly operating report is produced automatically | §9.4 |
| OPS-14 | An incident log is kept for every urgent or privacy incident | §11 |
| OPS-15 | Two-step verification is enabled on every platform account | §8 |

---

## 16. Risks specific to operations

| Risk | Impact | Mitigation |
| --- | --- | --- |
| Entry-tier hosting sleeps or expires the database | Redirect delays or data loss | Choose the paid production tier on verified terms (O-74); test cold behaviour |
| Two hosting platforms double the failure surface | More to watch | Essentials monitoring; fall back to one platform (ADR-12 revisit) |
| Alert fatigue for one person | Real alerts ignored | Severity tiers; tune noise; quiet hours (O-78) |
| Deploy just before the Tuesday send | Missed or broken digest | Change freeze window (O-76) |
| Backup exists but restore untested | False confidence | Restore test is a gate (G0) and quarterly |
| Monitoring tools capture personal data | Breaks privacy promise | Scrub configuration; review (OPS-7) |
| Cost grows unnoticed | Project becomes unaffordable | Weekly cost check and cap |
| Operator absent | Digest missed, incident unhandled | Runbooks, backup contact, a "digest skipped" notice template |

---

## 17. Open questions added by this document

| ID | Question | Proposal |
| --- | --- | --- |
| O-73 | Backend and database region | PROPOSED: the nearest region to most members that the provider offers, decided with the log audit |
| O-74 | Which production tiers (instance, database, store) fit the budget? | Verify current terms before M0 hosting is created |
| O-75 | Automatic or one-click promotion to production? | PROPOSED: one-click during the MVP |
| O-76 | Change freeze before the Tuesday send? | PROPOSED: Monday 18:00 to Tuesday 12:00 Lagos time |
| O-77 | Secret rotation cadence | PROPOSED: yearly plus after exposure |
| O-78 | Quiet hours for non-critical alerts | PROPOSED: 23:00 to 06:00 Lagos time |
| O-79 | Does file storage support recovery of deleted or overwritten files? | Check with the provider |
| O-80 | Status page or message for outages | PROPOSED: direct message in the pilot, status note later |
| O-12 to O-15 | Upload limits, retention, time zone, backups | O-13 answered in the data model; **O-15 answered here** |

---

## 18. Approval

- [ ] Components and where they run (§3)
- [ ] ADR-12 backend hosting recommendation (§4), including that platform terms must be verified (O-74)
- [ ] Environments and release process (§5, §6)
- [ ] Domain, email authentication, secrets (§7, §8)
- [ ] Essentials monitoring and the three alert channels (§9)
- [ ] Backup, restore and recovery targets (§10)
- [ ] Routine operations and cost management (§12, §13)
- [ ] Operational requirements OPS-1 to OPS-15 (§15)
- [ ] Open questions O-73 to O-80 acknowledged
- [ ] **Approved: discovery set complete (documents 1 to 15)**
