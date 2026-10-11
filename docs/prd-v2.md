# Sheetfolio: Product Brief and PRD (v2)

> Status: **DRAFT for approval**, 11 Oct 2026 (updated after documents 1 to 15 were drafted; see §15 and `docs/open-questions.md`)
> Owner: Olareign (@olareign) · Builder: solo
> Supersedes `docs/prd.md` (v1.0, civil-engineer-only) once approved. Until then v1.0 describes the code that exists today.
> Source of decisions: the Sheetfolio founder plan (10 Oct 2026) and the discovery session of 11 Oct 2026.

## 0. How to read this document

Every statement carries one of these labels. Nothing marked ASSUMED or OPEN may be built as if it were settled.

| Label | Meaning |
| --- | --- |
| **CONFIRMED** | You decided it in the founder plan or in discovery. |
| **ASSUMED** | A working assumption I made. Not approved as a requirement. |
| **OPEN** | Unresolved. Needs your decision or evidence. |
| **PROPOSED** | My recommendation. Needs your approval. |

No architecture, technology stack, database schema or API contract is fixed here. Those come in later documents (§14).

---

## 1. Product brief

### 1.1 One-line vision
**CONFIRMED.** Sheetfolio grows from one engineer's portfolio into a job-hunting loop for every profession: matched jobs arrive weekly, members tailor a page to each one, and tracked links show who opened it.

### 1.2 Problem
Job seekers in practical professions describe their work in a flat CV, send the same document to every employer, and never learn whether anyone opened it. Generic portfolio builders are made for designers and developers.

The following is the founder's framing from the plan and the v1 PRD. It has not been validated with other professions (see §12).

- A CV hides the evidence of the work (projects, photos, certificates).
- Tailoring a CV to each job is slow, so most people don't.
- Candidates get no signal on whether an application was opened.

### 1.3 Core idea
**CONFIRMED.** The portfolio page is the artifact. The product is the weekly loop: matched jobs, a tailored page for each, and tracked views.

North-star step: a member who tailors a page for a job they found in the digest.

### 1.4 What exists today
**CONFIRMED** (code review of `olareign/sheetfolio`, 11 Oct 2026). A working app for civil-engineer portfolio pages: magic-link sign-in, schema-driven CMS, draft and publish, public page and project pages, contact form with leads inbox, daily view counters, CV PDF, and a platform `/admin` with suspend. It serves a first real user.

Sheetfolio **extends** this code. The engineering page and design system become native format 1 (§6).

---

## 2. Users and stakeholders

| User | Goal | Status |
| --- | --- | --- |
| **Member (job seeker)** | Show real work, find matched jobs, apply with a tailored page, learn what was opened | CONFIRMED |
| **Visitor (employer or recruiter)** | Judge fit fast; never has to sign up | CONFIRMED |
| **Platform admin (Olareign)** | Curate the weekly digest, read the numbers, suspend abuse | CONFIRMED |
| **Recruiter (paying)** | Search members, contact them | CONFIRMED as a plan tier; **launch is parked** until verification ships |

Personas, accessibility needs and technical limits per category are **OPEN** and need user research (§12).

---

## 3. Confirmed decisions

| Topic | Decision |
| --- | --- |
| Audience | **Profession categories**, each with its own native format. 10 categories in v1 (§6). |
| Pages | One master record per member; job-specific variants generated from it. |
| AI tailoring | Paste a job ad, get a draft variant. Included in paid plans; bring-your-own key as an option. |
| Job digest | Weekly email from job-board feeds plus hand curation. No scraper yet. |
| Measurement | Our own tracked links on every job and every shared page. |
| Pricing | 14-day reverse trial, then Starter, Pro or Recruiter. No fully free plan. |
| Engagement | Site diary and "who checked me". |
| Name | Keep Sheetfolio. |
| Trial members | **Receive the digest.** |
| After trial | Page stays online read-only with a "Made with Sheetfolio" prompt to subscribe. |
| Variants vs master | The **member decides** what happens to a variant when the master changes (per section). |
| Matching | Members choose their job-matching tags during profile and account setup. |
| Payments | **Paystack only for v1**; global sales-tax handling reviewed before marketing abroad. |
| Team | Solo build, no fixed date yet. |
| Format launch | All 10 native formats are MVP scope. **The first digest ships once the first 3 formats are ready** (Engineering, Technology, Business); the rest finish in parallel and members in unfinished categories use a clean generic layout. Formats are built as configuration of shared sections (architecture document). Supersedes the earlier "all 10 before the first digest". |
| MVP | **Phases 1 to 3** (measurement, pages, hand-curated digest), ending at the digest gate. AI tailoring, billing, trial and engagement features follow. Members are invited early members, free during validation. Bring-your-own AI key is excluded. See `docs/mvp-scope.md`. |
| Codebases | **Two repositories:** the existing Next.js frontend (trimmed) and a new TypeScript backend (ADR-11). The backend owns data, redirects, click recording, jobs and email. |
| Datastore and sign-in | Proposed in `docs/architecture.md`: SQL primary database with Redis for limits and cache (ADR-1); magic link plus Google sign-in, one account per verified email, backend-owned sessions (ADR-2). Approved as ADRs 1 to 10; ADR-11 and ADR-12 await final confirmation. |
| Repeat visits | MVP counts per-link visits only; **no repeat concept, no visitor cookie or identifier** (O-19 answered). |
| Data retention | Detailed clicks 12 months then summarised; delete on request within 30 days; soft delete 30 days then purge; backups up to 24 hours of loss accepted. |
| Operations | Essentials monitoring with email, phone push and messaging-app alerts; production deploys only from the main branch. |
| Build order | Five phases, §10. |
| Parked | Verification; global marketing focus; job scraper. |

---

## 4. Scope

### 4.1 Essential for v1 (follows the build order in §10)
1. Tracked links and measurement, including bot filtering and the admin Digest tab.
2. Accounts with profession category and tags; master record; 10 native formats; variants; application links; member views dashboard.
3. Weekly digest: hand-curation tooling, matching, send, tracked job links, "Tailor my page" button.
4. AI tailoring; Paystack billing; 14-day reverse trial; read-only lapse.
5. Engagement: repeat-visit alert first, then "who checked me" detail and site diary.

### 4.2 Later releases
- Recruiter plan and member search (needs verification first).
- Verification: work email, referee stamps, credential checks, ID checks.
- Job scraper, only for sources whose terms allow it and only after the digest gate.
- Per-country pricing; global sales-tax provider.
- Custom domain (listed under Pro in the plan; see open question O-9).

### 4.3 Needs investigation
- Cross-category matching quality from member-chosen tags.
- Job-board sources and redistribution terms.
- Paystack support for recurring USD plans and international cards.
- AI model, cost per tailoring, monthly cap.

### 4.4 Excluded from v1
- Automated scraping, verification, Recruiter plan launch, marketing campaigns, multi-editor sites.

---

## 5. Functional requirements

IDs are stable. "Phase" refers to §10.

### 5.1 Tracked links and measurement (phase 1)
- **FR-1.1** Job link `/j/{job}?d={digest}&u={member}` records a click, then redirects to the employer's job ad.
- **FR-1.2** Application link `/s/{code}` records a visit, then shows the linked variant. A member can create many per variant, each with a label the member chooses.
- **FR-1.3** Each click records: time, link and type, member, digest, country, device, first or repeat visit. **The IP address is not stored.**
- **FR-1.4** Robots are excluded before counting: known preview and scanner agents, and clicks within 2 seconds of sending.
- **FR-1.5** Email open counts are treated as a rough signal only; decisions use clicks.
- **FR-1.6** Admin Digest tab: one row per week with sent, clicked, click rate, variants created, tailor rate; plus the 10 most-clicked jobs.
- **FR-1.7** Members see views per variant and per application link on their dashboard.
- **FR-1.8** If recording a click fails, the redirect or page still proceeds. Recording is best effort and failures are logged for the admin. (NEW, confirmed in discovery.)
- **FR-1.9** Per-click records are kept 12 months, then summarized to weekly and per-link totals. (NEW, confirmed in discovery.)

### 5.2 Accounts, master record, formats, variants (phase 2)
- **FR-2.1** Sign-up collects a profession and assigns one of the 10 categories (OPEN: how professions map to categories, O-3).
- **FR-2.2** Members choose matching tags during profile setup (OPEN: controlled list or free text, O-4).
- **FR-2.3** One master record per member holds all content.
- **FR-2.4** Each category has a native format. A member's page uses the format of their category.
- **FR-2.5** A member creates job-specific variants from the master.
- **FR-2.6** When the master changes, the **member chooses** per section whether a variant follows or stays frozen. OPEN: default for a new variant (O-5).
- **FR-2.7** Draft and publish behaviour for the master and for each variant: ASSUMED to follow today's draft and publish flow.

### 5.3 Weekly digest (phase 3)
- **FR-3.1** Admin tooling to collect jobs, tag them (role, seniority, skills, location, remote or on-site, closing date) and match them to members by tag overlap.
- **FR-3.2** Each member gets 5 to 8 jobs, best match first. Collection target is about 20 fresh jobs per category per week, none older than 14 days.
- **FR-3.3** Send Tuesday at 07:00 in the member's time zone.
- **FR-3.4** Each job card shows title, company, location, closing date, why it matched, a **View job** button (tracked) and a **Tailor my page for this** button that opens the variant editor with the job pre-filled.
- **FR-3.5** Trial members receive the digest. Members whose trial lapsed do not. (CONFIRMED in discovery, 11 Oct 2026.)
- **FR-3.6** First digest covers only categories that have members, at most 3 at a time for the first 6 weeks (ASSUMED, approved in discovery).
- **FR-3.7** Sources are checked against their terms before use.

### 5.4 AI tailoring and billing (phase 4)
- **FR-4.1** Member pastes a job ad and gets a draft variant. Member reviews and edits before publishing.
- **FR-4.2** Plans: Starter $5, Pro $12, Recruiter $99 and up (per month, USD). Per-country prices later.
- **FR-4.3** Starter: 1 page, 2 job variants, CV PDF, weekly digest. Pro adds unlimited variants, AI tailoring, all templates, detailed "who checked me", site diary insights, custom domain.
- **FR-4.4** Every new member gets 14 days of full Pro, then chooses a plan.
- **FR-4.5** Trial AI usage has a small fixed cap per trial (ASSUMED; number OPEN, O-6).
- **FR-4.6** When the trial ends with no plan, the main page stays online read-only with the "Made with Sheetfolio" prompt. Editing, variants, digest and "who checked me" stop until payment.
- **FR-4.7** Payments through Paystack. Recurring USD billing and international cards are to be verified (O-7).

### 5.5 Engagement (phase 5)
- **FR-5.1** Repeat-visit alert, built first: "Your application to {label} was opened again."
- **FR-5.2** Who checked me. All plans: total views this week and countries. Pro: views per variant and per application link, with first and repeat visits. **Never shown:** visitor name, email or IP.
- **FR-5.3** Site diary: weekly short entry (one photo and one line), shown under the latest project, newest first. Reminder email on the member's chosen day, skipped if they posted that week. Entries feed the matcher.

### 5.6 Non-functional decisions
The full list is in `docs/requirements.md` (NFR-1 to NFR-14). The decisions made in discovery:
- **Performance (CONFIRMED):** public pages under 1.5 s on a 4G phone; Lighthouse performance and accessibility 90 or higher; applies to all 10 formats.
- **Availability (CONFIRMED):** best effort on a small budget, fail safe: if recording fails, the redirect still works. No formal uptime target.
- **Retention (CONFIRMED):** per-click detail 12 months, then summarized. Other retention is open (O-13).
- **Scale (ASSUMED):** no member estimate exists yet; requirements assume up to the low hundreds of members at first and are re-checked with real numbers.

---

## 6. Profession categories and native formats

**CONFIRMED** list of 10 categories. Format names are **PROPOSED** and will be specified in the UI/UX document.

| # | Category | Example professions | Proposed native format |
| --- | --- | --- | --- |
| 1 | Engineering & Built Environment | Civil, mechanical, electrical, architecture, surveying | Drawing sheet (exists today) |
| 2 | Technology & Data | Software, data, IT, cybersecurity | Project showcase |
| 3 | Business, Finance & Operations | Accounting, banking, HR, operations, sales | Achievements summary |
| 4 | Creative & Design | Graphic, UX, photography, fashion, film | Case-study gallery |
| 5 | Legal, Policy & Compliance | Lawyers, compliance officers, policy analysts | Brief |
| 6 | Hospitality & Culinary | Chefs, hotel staff, event planners, tourism | Menu |
| 7 | Health & Life Sciences | Nurses, pharmacists, lab scientists, public health | Practice profile |
| 8 | Education & Training | Teachers, lecturers, trainers | Teaching portfolio |
| 9 | Media, Marketing & Communications | Journalists, marketers, PR, content creators | Campaign and clippings board |
| 10 | Skilled Trades & Technical Services | Electricians, welders, mechanics, artisans | Job-card work log |

Rules:
- **CONFIRMED** build order: Engineering, Technology, Business, Creative, Legal, then the rest, with each format available to members of that category when they sign up.
- Professions outside the list use the closest category until more are added.
- Health & Life Sciences pages must never contain patient-identifying information (see §9).

---

## 7. Success metrics

Starting targets are guesses to start from, not benchmarks. Revise after 4 weeks of data.

| Metric | Definition | Starting target |
| --- | --- | --- |
| Digest click rate | Members who clicked any job ÷ members sent the digest | 15% |
| Jobs per clicker | Job clicks ÷ members who clicked | 2 |
| **Tailor rate (north star)** | Clickers who create a variant within 7 days ÷ clickers | 10% |
| Application open rate | Application links visited at least once ÷ links created | 30% |
| Repeat visits | Application links visited 2+ times ÷ links visited | Watch only |

Gates: a missed gate means fixing that phase (matching, job sources) before moving on.

---

## 8. Business model

- **CONFIRMED** pricing and trial as in §5.4. Prices are in USD per month.
- **OPEN** operating costs: hosting, email, image storage, AI usage, payment fees. To be estimated in the architecture and operations documents.
- **OPEN** commercial risk: AI cost per paid member at $12 (O-6); Paystack fees and currency handling (O-7).

---

## 9. Privacy and compliance

**CONFIRMED:** shared pages carry a short privacy notice, and tracking gets specialist review before launch.

Requirements to carry forward:
- Visitors (employers) never sign up. Only the member's link label and the visitor's country identify a visit.
- The IP address is not stored. Country is derived from it at request time; whether that transient use needs disclosure is a question for the specialist review.
- Sensitive personal fields on pages stay hidden by default, as today.
- Health & Life Sciences members must not publish patient information.
- Applicable law depends on member and visitor regions (Nigerian data protection law and the rules of regions the product serves). **Specialist review required.** Nothing here is legal advice.

**Known risk, to fix before launch:** the public repository contains a real person's contact and personal details in its documentation and seed data. This is a risk to remediate, not an accepted state.

---

## 10. Build order and gates

| Phase | Scope | Gate |
| --- | --- | --- |
| 1 Measurement | Redirect service, click recording, bot filter, admin Digest tab | Test clicks recorded correctly; robots excluded |
| 2 Pages | Account and tag setup, master record, 10 native formats, variants, application links, member views | A member can publish a page and share a tracked link |
| 3 Digest | Tagging, matching, weekly send, tracked job links, "Tailor my page" | 6 weeks hand-curated; click rate at or above 15% |
| 4 Tailoring and billing | AI tailoring, Paystack plans, 14-day trial, read-only lapse | Tailor rate at or above 10% |
| 5 Engagement | Repeat-visit alert, then "who checked me" detail and site diary | Weekly return rate |

Note: with a 14-day trial, a first member can reach a paywall before phase 4 ships. ASSUMED: the trial clock starts only once billing exists, or early members get a free window. Confirm (O-8).

---

## 11. Differences from the existing PRD (v1.0)

| Topic | v1.0 | This document |
| --- | --- | --- |
| Audience | Civil engineers only | 10 profession categories |
| Payments and plans | Out of scope | In scope (phase 4) |
| Custom domains | Out of scope | Listed under Pro (O-9) |
| AI | CV import deferred | AI tailoring from a pasted job ad |
| Datastore | Redis only; SQL banned | **Proposed change:** SQL primary, Redis for limits and cache (ADR-1). Supersedes the v1.0 ban once approved |
| Sign-in, CMS approach | Magic link; schema-driven CMS | **Proposed:** magic link plus Google; backend-owned sessions; shared section library with format definitions (ADR-2, ADR-3) |
| Codebases | One Next.js app | Two repositories: frontend and backend (ADR-11) |
| Measurement | Daily and per-project counters | Per-click records with attribution |

Kept: the engineering page and design system as native format 1.

---

## 12. Assumptions and validation

| Assumption | Impact if wrong | How to validate |
| --- | --- | --- |
| People in 10 categories want a native-format page and a weekly digest | Whole loop | Short interviews and the 6-week digest |
| Solo build can deliver 10 formats before the first digest | Timeline and scope | Time-box format 1 end to end; extrapolate |
| Tag overlap matches jobs well across categories | Digest value | Manual match test on the first cohort |
| Job sources allow redistribution | Digest content | Read terms of 2 to 3 candidate sources first |
| Paystack supports the billing the plans need | Revenue | Check Paystack docs, then a test transaction |
| Members will tailor, not just click | North star | Tailor rate after 4 weeks |
| Employers tolerate tracked links | Application open rate | Watch bounce and complaints |

---

## 13. Risks and conflicts

| Risk | Impact | Mitigation |
| --- | --- | --- |
| **Scope against solo capacity** (10 formats, digest, tracking, billing, engagement; no date) | Delay to the first digest, which tests the loop | Define formats as configuration where possible (architecture); fixed build order; time-box format 1 |
| **10 formats against a solo builder** | Delay to the first digest | **Mitigated (confirmed):** digest ships once the first 3 formats are ready; formats built as shared-section configuration. Working order is fixed (§6) |
| Weekly curation grows with categories | Operator overload | Cap at 3 categories for 6 weeks (FR-3.6) |
| Public repository exposure of personal data | Privacy harm | Remediate before launch |
| Pre-release versions of key libraries in existing code | Upgrade effort | Assess in architecture |
| Live page of the first real user | Regression | Keep it working through migrations; add a migration plan |
| AI cost | Margin | Cap and model choice (O-6) |
| Bot clicks inflating metrics | Wrong decisions | FR-1.4; test in phase 1 |
| Sales tax outside Nigeria | Compliance | Review before marketing abroad |

---

## 14. Open questions

| ID | Question |
| --- | --- |
| O-1 | ~~"All 10 before first digest" vs "build by signups"~~ **Resolved** by the mitigations in §3: first digest after 3 formats; fixed build order. Whether later formats are also gated on signups is still open. |
| O-2 | Target date for the first digest. |
| O-3 | How does a member's profession map to one of the 10 categories (list, search, free text)? |
| O-4 | Matching tags: controlled vocabulary or free text? |
| O-5 | Default behaviour of a variant when the master changes, and for newly added sections. |
| O-6 | AI model, trial cap and monthly cap that keep $12 profitable. |
| O-7 | Does Paystack support recurring USD plans and international cards for this business? |
| O-8 | When does the 14-day trial clock start for members who join before billing exists? |
| O-9 | Is custom domain in v1 or later? |
| O-10 | Which job boards feed the first digest, and do their terms allow redistribution? |
| O-11 | Datastore, sign-in and CMS approach for the extended app (architecture document). |
| O-12 | Limits for diary photos and other uploads (size, type, count). |
| O-13 | Retention for accounts, master records, diary photos and deleted accounts. |
| O-14 | Time zone handling for members who haven't set one. |
| O-15 | Backup and recovery targets. |
| O-16 | How many invited MVP members are needed to read the digest gate? (Who they are and that they are free during validation: confirmed.) |

**Status of questions after documents 3 to 15.** O-11 is proposed in the architecture document (ADRs 1 to 3); O-13 is answered in the data model; O-15 is answered in the operations document; O-19 is answered in the security document (per-link counts only in the MVP); O-37 is answered (TypeScript); O-38 is answered (machine-readable contract, generated frontend types); O-21 is proposed at 15 minutes. New questions O-17 to O-80 are listed in the document that raised them and consolidated, with their status, in `docs/open-questions.md`. Numbering note: O-17 appears in the MVP scope document as an answered question.

---

## 15. Planned document set

Each document will name this PRD as the authority for product decisions, and the architecture decision records as the authority for technical ones. Approval is requested for each document before the next begins.

Status: all 15 drafted. Documents 1 to 15 are committed on this branch; each awaits your final review in the pull request.

1. Product brief and problem statement (§1, §2)
2. PRD (this document) — `docs/prd-v2.md`
3. Target user profiles and user stories — `docs/user-profiles-and-stories.md`
4. Functional and non-functional requirements — `docs/requirements.md`
5. MVP scope, priorities and exclusions — `docs/mvp-scope.md`
6. User journeys, workflows and acceptance criteria — `docs/user-journeys.md`
7. UI/UX specification and screen inventory — `docs/ui-ux-spec.md`
8. Architecture and architecture decision records — `docs/architecture.md`
9. Database design and data model — `docs/data-model.md`
10. API and third-party integration specification — `docs/api-spec.md`
11. Security, privacy and risk assessment — `docs/security-privacy-risk.md`
12. Testing and quality assurance strategy — `docs/testing-qa-strategy.md`
13. Implementation roadmap, task breakdown and dependencies — `docs/roadmap.md`
14. AI coding instructions and repository conventions — `docs/engineering-conventions.md`
15. Deployment, monitoring and operational requirements — `docs/deployment-operations.md`

---

## 16. Approval

- [ ] Product decisions in §3 are correct
- [ ] Assumptions in §12 are accepted or corrected
- [ ] Open questions in §14 are acknowledged
- [x] Documents 3 to 15 drafted and committed
- [ ] Final review of the full set in pull request #1 (see `docs/open-questions.md` for the decisions needed before M0)
