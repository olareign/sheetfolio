# Sheetfolio: API and Integration Specification

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: `docs/architecture.md` (ADR-1 to ADR-11), `docs/data-model.md`, `docs/requirements.md`, `docs/user-journeys.md`.
> This is the **contract between the frontend repository and the backend repository** (ADR-11) and between the backend and outside services. It is written in plain language: purposes, who may call, inputs, outputs, rules and error cases. It contains **no code, no machine-readable schema and no final paths or field names**. Names below are working names to make discussion possible; final names are set when the contract is implemented (document 14).

Labels: **CONFIRMED**, **ASSUMED**, **OPEN**, **PROPOSED**, **NEW**.

---

## 1. Decisions taken for this document

| Decision | Choice | Status |
| --- | --- | --- |
| Codebases | Two repositories: Next.js frontend and a separate backend API service | CONFIRMED (your instruction) |
| Reason | Cleaner structure and independent deploys | CONFIRMED |
| Redirect and click recording | Live in the backend, behind the frontend host's edge | CONFIRMED |
| Public API | None in v1. The API is **internal**: used only by the Sheetfolio frontend, the scheduled jobs and named outside services | CONFIRMED |
| Errors and versioning | One error shape with stable codes; no versioning while internal | CONFIRMED |
| Integrations covered in detail | Email service; job sources and CSV/paste import; phase 4 services (Paystack, AI) as boundary only | CONFIRMED |
| Google sign-in | Not selected for detailed integration coverage this round; its rules stay in ADR-2 and §6.4 below as a short boundary note | ASSUMED, please confirm |

---

## 2. Conventions

### 2.1 Callers and trust
| Caller | How it proves who it is | Trusted for |
| --- | --- | --- |
| Visitor's browser | Nothing (anonymous) | Public read endpoints and the redirects only |
| Member (through the frontend) | Session owned by the backend (ADR-11, PROPOSED option b; O-39) | Own records only |
| Admin (through the frontend) | Same session with the admin role | Admin functions |
| Frontend server | A service credential, for cache refresh and server-side reads | Reads of published content |
| Scheduled job runner | A service credential | Triggering digest sends, purge, summarising |
| Outside services (email, payments) | Signed events checked by the backend | Their own event types only |

Every endpoint states which callers may use it. **The backend checks the caller and the owner of every record on every request**; the frontend hiding a button is never the control (NFR-7).

### 2.2 Shape of requests and responses (PROPOSED)
- Data is exchanged as structured text over HTTPS. Time values are always in UTC with an explicit zone; member time zones are applied only when the digest is scheduled and displayed.
- Lists are returned a page at a time with a way to continue; maximum page size is set per endpoint.
- Create and change calls return the resulting record, so the frontend never guesses.
- Every change call from a member includes the record's last-seen version, so two tabs cannot silently overwrite each other (conflict error, §2.4).

### 2.3 Idempotency
Calls that send email, create digests, apply payment events or purge data are **idempotent**: repeating the same call with the same key has no extra effect (digest key: member + week, ADR-5). Member create calls accept an optional client key so a retry after a dropped connection does not create a duplicate.

### 2.4 One error shape (CONFIRMED)
Every failed call returns the same structure with four parts: a **stable code** (for the app), a **plain-language message** (for the person, English only, P9), the **field** concerned if any, and a **request reference** for support. Codes never change meaning once released. Working set:

| Code | Meaning | Typical status class |
| --- | --- | --- |
| `not_signed_in` | No valid session | 401-type |
| `not_allowed` | Signed in but not permitted (including "not your record") | 403-type |
| `not_found` | No such record, or it is not visible to this caller (the two look the same) | 404-type |
| `invalid_input` | One or more fields failed validation; each is listed | 422-type |
| `conflict` | Record changed since last seen; or a unique value (slug) is taken | 409-type |
| `limit_reached` | A plan or system limit (variants, uploads, categories in first digest) | 402/403-type |
| `rate_limited` | Too many requests; includes when to retry | 429-type |
| `unavailable` | A dependency is down; the request was not applied | 503-type |
| `blocked_by_rule` | A business rule refuses the action (for example deleting a variant that has links) with the rule's reason | 409/422-type |

Rules: messages never reveal whether an email is registered, why a page was suspended, or internal details. Unknown errors return a generic message and a request reference.

### 2.5 Rate limits (ASSUMED; numbers set in document 11)
Per caller and per endpoint group, stricter for sign-in requests, the contact form, the redirects (per address range, without storing the address long-term, ADR-4) and imports. Limits return `rate_limited`.

### 2.6 Versioning (CONFIRMED)
None while the API is internal. Because two repositories deploy independently, the backend must stay **compatible with the previous frontend release** for any change (add fields and endpoints freely; remove or rename only after the frontend no longer uses them). This compatibility rule replaces versioning (document 14). If an API ever becomes public, versioning is introduced then.

---

## 3. Public endpoints (anonymous)

| Working name | Purpose | Inputs | Output | Rules and errors |
| --- | --- | --- | --- | --- |
| Open shared page | Return the published variant for an application link | Link code | Page content in the member's format, format version, privacy-notice flag, whether the member is lapsed | `not_found` for unknown, retired or unpublished (V5, O-23). Suspended members: same as unavailable. **The visit is recorded after the response** (ADR-4). Bots are not counted (FR-1.4) |
| Open main page | Return the published master by slug | Slug | Same as above | Reserved slugs never resolve to members |
| Job redirect | Record a click and send the visitor to the employer's ad | Job reference and digest entry reference | A redirect to the **stored** employer link | Destination is looked up, never taken from the request (FR-1.1). Unknown job: not-found page. Recording failure never blocks (FR-1.8) |
| Send contact message | Deliver a message to a member | Member slug, sender name, sender email, message, spam-guard answer | Confirmation | `rate_limited`, `invalid_input`, `unavailable`; message is not lost on failure. Never joined to click data (data model §3.8) |
| Unsubscribe (token) | Change digest preference from an email link | Signed token, action | Confirmation | Token expires; repeat is harmless; unsubscribing does not close the account (M15) |
| Privacy notice content | Return the notice text | None | Text and version | Cached |

**Redirect behaviour for the edge (CONFIRMED location, ADR-11):** `/s/{code}` and `/j/{job}` are forwarded unchanged from the frontend host to the backend. The backend answers with the page data (for `/s`, consumed by the frontend renderer) or with a redirect (for `/j`). Measured added delay is a test target (NFR-2, document 12).

---

## 4. Member endpoints (signed in; own records only)

### 4.1 Account and setup (J1)
| Working name | Purpose | Key inputs | Key rules |
| --- | --- | --- | --- |
| Read my account | Profile, category, tags, time zone, slug, plan, digest preference, setup progress | none | Own account only |
| Update setup step | Save category, tags, time zone, display name | Step data | Category required before setup completes (FR-2.1); time zone must be a valid zone; tags follow vocabulary rules (O-4) |
| Check slug | Is this address free and allowed | Slug | Live check; reserved words and route-shadowing refused (FR-2.8); not a reservation |
| Claim slug | Set the address | Slug, last-seen version | `conflict` if taken; one slug per member |
| Update settings | Name, tags, time zone, digest preference, category change | Fields | Category change warns and keeps hidden sections (O-25) |
| Request account deletion | Start the 30-day purge | Confirmation | Hides the account at once; irreversible after purge (data model §7) |

### 4.2 Master and variants (J2, J3, J8)
| Working name | Purpose | Key inputs | Key rules |
| --- | --- | --- | --- |
| Read master | Draft and published content by section | none | |
| Save master section | Save one section's draft | Section id, content, last-seen version | Validated against the format definition; autosave-friendly; `conflict` on stale version |
| Reorder / show / hide sections | Change layout of the master | Order and visibility | |
| Master change preview | For J8: which variants would change if each section followed | Section ids | Returns the follow/freeze choices needed; no change applied |
| Publish master | Take the published snapshot | none | Returns problems per field if invalid (FR-2.7) |
| Unpublish master | Withdraw | none | |
| List variants | Title, job, state, link count, views | Page cursor | |
| Create variant | New variant | Origin (blank, from master, from digest job), optional job reference, optional client key | Limit check (BR-11, FR-2.5); creation time recorded for the north-star (O-20) |
| Read variant | Resolved content, with each section's follow/frozen mode | Variant id | Followed sections resolve live from the master; frozen use own copy |
| Save variant section | Edit a section | Section id, content, last-seen version | Editing a followed section freezes it first (confirmed by the member) |
| Set section mode | follow or frozen | Section id, mode | Frozen to follow requires explicit confirmation |
| Publish / unpublish variant | Snapshot, O-34 | none | |
| Delete variant | Soft delete | Variant id | `blocked_by_rule` if it has active links (O-18) |
| Move links | Reassign a variant's links | From, to | Both must be the caller's |
| Restore deleted item | Undo within 30 days | Item id | After purge: `not_found` |

### 4.3 Application links and numbers (J3)
| Working name | Purpose | Key inputs | Key rules |
| --- | --- | --- | --- |
| Create application link | Add a tracked link to a variant | Variant, label | Label 1 to 60 chars (ASSUMED); code generated by the backend, unguessable |
| List links | For a variant | Variant | Includes visit counts |
| Rename / retire link | | Link, label or state | Retired links resolve to unavailable |
| My numbers | Views per page, variant, link; country totals | Period | Own data only (FR-1.7); small-count suppression (O-35); labelled "may lag" |

### 4.4 Files
| Working name | Purpose | Key rules |
| --- | --- | --- |
| Request upload | Ask for permission to upload one file | Declares type and size; limits per O-12; returns a time-limited upload permission |
| Confirm upload | Attach the stored file to a section | Backend verifies type and size after storing (NFR-7); alternative text required for images |
| Remove file | | Soft delete with its section |

### 4.5 Digest, tailoring entry (J6)
| Working name | Purpose | Key rules |
| --- | --- | --- |
| Read job for tailoring | Return the job a digest entry refers to | Caller must be the digest's recipient; used to preload the variant editor |
| Tailor from digest | Create a variant from a digest entry | Same as Create variant with origin "from digest"; opening an existing variant for the same job is offered first |
| My digest history | Email-only in MVP (O-24); optional later | |

### 4.6 Existing features
Leads inbox (list, read, mark read, delete) and CV PDF (generate for the master) keep their current behaviour behind the new contract. Their details are not redesigned here.

---

## 5. Admin endpoints (admin role only)

| Area | Working name | Purpose | Key rules |
| --- | --- | --- | --- |
| Members | List and invite | Invite, resend, revoke, list members and states | No private member content (data model §6) |
| Jobs | Create job | Manual form | Required tags; reject >14 days old (BR-8); source required |
| Jobs | Import preview | Paste or CSV, returns accepted and rejected rows with reasons | Nothing saved until confirmed |
| Jobs | Confirm import | Save accepted rows | Idempotent by import key; duplicates flagged |
| Jobs | Update, tag, expire, remove | | |
| Sources | Record terms check | Source, date, outcome | Unchecked source blocks use (FR-3.7) |
| Digest | Build proposal | For a week and included categories: ranked matches per member | At most 3 categories first 6 weeks; override needs confirmation (FR-3.6) |
| Digest | Adjust | Include or exclude a job for a member group | |
| Digest | Preview | Render for a chosen member | No send |
| Digest | Schedule or hold | Confirm the send | Deliberate, confirmed action (A6) |
| Digest | Retry failed | List and retry failed sends | Idempotent |
| Numbers | Digest report | Weekly sent, clicked, click rate, variants created, tailor rate, top 10 jobs; six-week gate view | Admin only (FR-1.6); bots excluded |
| Pages | Suspend / restore | With internal reason and member-facing note | Takes effect on public pages within the refresh window (O-40) |
| Rules | Bot rules | View and change; changes logged | |
| Platform | Failures | Failed sends and recordings | (A9) |
| Platform | Action log | Who did what | Read only |

---

## 6. Integrations

### 6.1 Email service (covered in detail)

**Purpose:** sign-in links, invitations, the digest, unsubscribe confirmations (ADR-6).

| Topic | Rule |
| --- | --- |
| Interface | The backend uses one internal "send message" interface; no other part of the system talks to the email service directly |
| Streams | **Transactional** (sign-in, invitation) and **digest** are separate streams (ADR-6) |
| Sending a digest | One send per member per week; idempotency key member + week; records scheduled time, actual time and outcome |
| Content | Plain-text alternative included; every link is a Sheetfolio redirect (BR-4) |
| Events received | Delivered, bounced (hard/soft), complained, unsubscribed. The backend verifies each event's signature before acting |
| On hard bounce | Mark the member's email undeliverable, stop digests, show a notice in the member app (M4) |
| On complaint | Stop digests to that member at once and log it; watch the complaint rate (document 11) |
| On unsubscribe | Set digest preference; do not close the account |
| Failure | Failed sends retry with a limit, then show in Failures (A9). A sign-in email failure returns `unavailable` to the member with a clear message and no loop |
| Open tracking | Not used for decisions (FR-1.5) |
| Limits | Free-tier and rate limits checked against the first digest (O-31) |
| Test mode | A non-sending mode and test recipients for development and previews |

### 6.2 Job sources and CSV/paste import (covered in detail)

**Purpose:** get fresh jobs into the system for hand curation (J5).

| Topic | Rule |
| --- | --- |
| Manual form | Fields per data model §3.6. Employer link must be a valid web address; stored as data |
| Paste and CSV | Admin pastes rows or uploads a file; the backend returns a **preview** with each row accepted or rejected with a reason; nothing is stored until confirmed |
| Columns | Title, company, location, work mode, seniority, closing date, posted date, employer link, source, tags (separator rules OPEN, O-41). Unknown columns ignored with a warning |
| Limits | Maximum rows and file size per import (numbers OPEN, O-41); larger files rejected with a clear message |
| Validation | Older than 14 days rejected (BR-8); missing required tags flagged but may be saved as "collected" and not yet "ready"; invalid links rejected |
| Duplicates | Same employer link, or same title + company + location within a window, flagged; admin chooses to skip or keep |
| Source terms | Every job carries a source; sources must be marked terms-checked before any job from them enters a digest (FR-3.7). Redistribution limits recorded on the source (O-10) |
| Safety | Pasted text is treated as data, never executed or rendered as markup; spreadsheet formulas in CSV cells are neutralised on any later export (ASSUMED) |
| Idempotency | An import has a key; confirming twice saves once |
| Automated scraping | **Excluded** until the gate (MVP scope §5) |
| Future | A source "connector" would be a separate internal module that produces the same job input; not designed now |

### 6.3 Phase 4 services (boundary only)

| Service | Boundary rule (PROPOSED) |
| --- | --- |
| **Paystack** (ADR-9) | An isolated module. **Outbound:** create a checkout for a plan. **Inbound:** payment events, signature-verified, idempotent by event id, applied in order of the provider's timestamps (FR-4.8). The application's plan state is the source of truth; a failed or unknown event changes nothing. Recurring USD billing and international cards are verified first (O-7). No payment code in the MVP |
| **AI tailoring** (ADR-8) | One internal interface: input is a job ad and the member's master; output is a draft variant for review; never publishes (FR-4.1). Rules: input length limit, clear message for non-ads, per-trial cap (O-6), usage counted per member, member content not used to train anything by agreement (to confirm with the provider, document 11). No AI calls in the MVP |
| **Diary reminders** (phase 5) | Use the email interface; depend on O-12 |

### 6.4 Google sign-in (short boundary note; ASSUMED, please confirm)
Not selected for detailed coverage this round. Boundary only: the backend accepts a Google identity only when Google marks the email verified; it links to the member with the same verified email (no duplicates); an uninvited email cannot create an account during validation; consent and app-verification setup are tracked as O-28. The sign-in session design depends on O-39.

---

## 7. Frontend and backend: how they work together (ADR-11)

| Topic | Rule (PROPOSED) |
| --- | --- |
| Who renders pages | The frontend. It requests published content from the backend, caches it, and renders in the member's format |
| Publish refresh | On publish, suspend or restore, the backend calls a protected refresh endpoint on the frontend so cached pages update within the target window (O-40) |
| Addresses | One public domain. The frontend host forwards the redirect and shared-page paths to the backend so addresses never change when either side moves |
| Cookies and sessions | Backend-owned session (O-39). Cookie scope, same-origin forwarding and protection against cross-site request forgery are designed in document 11 |
| Cross-origin calls | Preferably none: the frontend host forwards API calls on its own origin. If direct cross-origin calls are used, an explicit allow-list is required |
| Environments | Each repository has local, preview and production environments; previews point at a matching backend preview or a stable test backend |
| Compatibility | The backend stays compatible with the previous frontend release (§2.6). Contract tests in both repositories run in their pipelines (document 12) |
| Failure of the backend | Public pages already cached keep serving; the frontend shows a friendly unavailable state for uncached pages; redirects fail safe where possible (FR-1.8) |
| Failure of the frontend | Redirects and recording keep working because they are served by the backend |

---

## 8. Scheduled and internal operations (not callable by members)

| Operation | Trigger | Rules |
| --- | --- | --- |
| Digest dispatcher | Every 15 minutes (ADR-5) | Finds members whose local Tuesday 07:00 has passed with no digest this week; queues one send each; idempotent |
| Digest sender | From the queue | Sends, records result, retries with a limit |
| Click summariser | Weekly | Summarises clicks older than 12 months and removes detail (FR-1.9) |
| Purge | Daily | Removes soft-deleted items older than 30 days and accounts past their 30-day window (data model §7); logs counts only |
| Bot-click cleanup | Daily | Removes excluded-click records older than the tuning window |
| Failure cleanup | Daily | Removes failure events older than 90 days |
| Health check | Frequent | A minimal check for monitoring (document 15) |

---

## 9. Security rules for the contract (summary; detail in document 11)

1. Every endpoint states its callers; anonymous endpoints are listed in §3 and nothing else is anonymous.
2. Ownership is checked server-side on every member call; a record that exists but belongs to someone else returns `not_found`.
3. Input is validated at the backend regardless of frontend checks.
4. No endpoint accepts a destination address for redirects.
5. Uploads are validated after storage, not only before.
6. Signed events from outside services are verified before any change.
7. Service credentials differ per caller and per environment, and are never in a repository.
8. Request logs must not contain visitor addresses beyond what the platform cannot avoid; retention and access reviewed in document 11 (ADR-4 requirement).
9. Admin actions are logged.

---

## 10. Traceability

| Requirement | Where covered |
| --- | --- |
| FR-1.1, 1.2, 1.3, 1.4, 1.8 | §3 job redirect, open shared page; §2.3 |
| FR-1.6 | §5 digest report |
| FR-1.7 | §4.3 my numbers |
| FR-1.9 | §8 click summariser |
| FR-2.1 to 2.8 | §4.1, 4.2 |
| FR-3.1 to 3.7 | §5, §6.2 |
| FR-3.4 | §4.5 and §3 redirect |
| FR-4.x (phase 4) | §6.3 boundaries |
| NFR-2, NFR-3 | §3 redirect, §7 failure rules |
| NFR-7 | §2.1, §9 |
| NFR-11 | §5 failures, §6.1 events |

---

## 11. Open questions added by this document

| ID | Question | Proposal |
| --- | --- | --- |
| O-41 | CSV/paste import limits (rows, file size) and tag separator rules | PROPOSED: 200 rows, 1 MB, tags separated by semicolons |
| O-42 | Are exact endpoint paths and field names fixed in the contract before building, or emerge with contract tests? | PROPOSED: fix them at the start of phase 2 in document 14 |
| O-43 | Is Google sign-in detailed in this document, or left as the short note? | PROPOSED: short note until the verification lead time is known (O-28) |
| O-39 | Backend-owned sessions (option b)? | Needs your decision in the architecture amendment |
| O-40 | Publish-to-visible delay | PROPOSED: under 1 minute |

---

## 12. Approval

- [ ] Conventions in §2 (callers, one error shape, idempotency, no versioning but compatibility rule)
- [ ] Public, member and admin endpoint areas (§3 to §5)
- [ ] Email and job-import integrations (§6.1, §6.2); phase 4 boundaries (§6.3); Google note (§6.4)
- [ ] Frontend and backend working agreement (§7), which depends on **ADR-11** in the architecture document
- [ ] Open questions O-41 to O-43 acknowledged
- [ ] Approved to start document 11 (security, privacy and risk assessment)
