# Sheetfolio: Security, Privacy and Risk Assessment

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: `docs/architecture.md` (ADR-1 to ADR-11), `docs/data-model.md`, `docs/api-spec.md`, `docs/requirements.md`.
> **This is not legal advice.** It sets design rules and lists questions a qualified privacy specialist must review **before any member is invited** (PRD §9, CONFIRMED). Legal statements below are marked "to verify" where they depend on current law.

Labels: **CONFIRMED**, **ASSUMED**, **OPEN**, **PROPOSED**, **NEW**.

---

## 1. Decisions taken for this document

| Decision | Choice | Status |
| --- | --- | --- |
| Repeat visits (O-19) | **MVP: per-link counts only, no repeat concept.** Revisit in phase 5 with a fresh privacy review | CONFIRMED |
| Legal baseline | Nigeria's data protection law (NDPA) **and** design to the strictest common standard (GDPR-level) | CONFIRMED |
| Repository personal data | Remediation plan: replace with fictional data and clean history **before invitations** | CONFIRMED |
| Risk register | Scored: likelihood, impact, owner, mitigation, trigger | CONFIRMED |

Consequence of the O-19 decision: the click record's "first or repeat" field is **not populated in the MVP** (data model §3.7). Visitors receive **no cookie or identifier**. This also keeps public pages free of a cookie banner (P2).

---

## 2. What data exists and why (inventory)

| Data | Whose | Purpose | Sensitivity | Lawful basis (to verify) |
| --- | --- | --- | --- | --- |
| Email, name, slug, category, tags, time zone | Member | Account, matching, digest | Personal | Contract / consent |
| Master and variant content (work history, photos, credentials) | Member | The product | Personal; may include sensitive details the member chooses | Contract / consent |
| Files and images | Member | Pages | May show third parties' faces or premises | Member responsibility, with guidance |
| Digest records | Member | Delivery, reporting | Personal (behavioural: which jobs were sent) | Contract / legitimate interest |
| Job clicks from digest | Member | North-star measurement | Behavioural, linked to a member | Consent for email tracking links (to verify), legitimate interest |
| Page visits via application links | **Visitor** | Show the member who looked | Country, device class, time, link label. No IP stored, no identifier | Legitimate interest (to verify) |
| Contact-form messages (leads) | **Visitor** | Reach the member | Name, email, message: third-party personal data | Consent given by submitting |
| Invitations | Member | Access control | Email only | Legitimate interest |
| Admin action log | Admin | Accountability | Admin identity | Legitimate interest |
| Email service events | Member | Bounce/unsubscribe handling | Email, event type | Legitimate interest / legal duty |

**Not collected, by design (BR-5):** visitor names, visitor emails (except voluntary contact form), visitor IP addresses, visitor cookies or identifiers, precise location, raw browser strings.

---

## 3. Privacy analysis

### 3.1 The tracked-link promise
The product tells members "you will see which application was opened". The promise to visitors is "you are never named or identified". These hold together only if the following are true. Each is a **requirement** of this document:

| # | Requirement | Verified how |
| --- | --- | --- |
| PR-1 | The IP address is used at the edge only to derive the country and bot status, then discarded. It is never written to the database, queue, error log or analytics | Code review, test that records contain no address, review of platform log settings |
| PR-2 | The raw user-agent string is reduced to a device class and discarded | Same |
| PR-3 | No cookie or other identifier is set on visitors on shared or public pages | Test: a visit sets no cookies and stores nothing in the browser |
| PR-4 | Contact-form data is stored separately and never joined to click data | Data model review |
| PR-5 | Member views suppress breakdowns for very small counts (country shown only from 5 visits, O-35) so a single visitor cannot be singled out | Test |
| PR-6 | A privacy notice is on every shared page and the main page, describing exactly the above | Content review by specialist |

### 3.2 The platform-log problem (important)
The hosting platform and any proxy between the frontend and backend (ADR-11) **may keep request logs that contain visitor IP addresses**, even when the application does not. That would contradict PR-1 in practice. Therefore:
- Before launch, list every layer that sees a request (edge, frontend host, backend host, email service links) and check what each logs and for how long.
- Configure the shortest retention available and restrict who can read logs.
- If a layer cannot be configured, the privacy notice must say so truthfully, or the layer must change. **The notice must never claim more than the system does.** (OPEN, O-44)

### 3.3 Email tracking
The digest links are tracked redirects (BR-4). Members must be told, at sign-up and in each digest footer, that clicks on jobs are recorded to improve the digest. Open pixels are not used for decisions (FR-1.5); PROPOSED: **do not use open pixels at all**, which also removes a consent question. (OPEN, O-45)

### 3.4 Members' content about other people
Members publish content that can involve third parties: client names, project photos, student information, patient information. The product cannot verify this, so it uses **guidance at the point of entry** (ui-ux-spec §6.2) and a publish checklist (M9):
- **Health & Life Sciences:** no patient-identifying information, ever (CONFIRMED). Stronger warning at setup and at publish.
- **Legal:** client confidentiality reminder (CONFIRMED category rule).
- **Education:** student-information reminder.
- **Engineering, Creative, Trades:** employer and client permission reminders; image rights.
- Terms of use make the member responsible for what they publish and give the admin the right to suspend (J9). A report channel for third parties is needed (O-46).

### 3.5 Rights and requests (design for GDPR-level; NDPA to verify)
| Right | Support in the design |
| --- | --- |
| Access | Member can see own data in the app; a full export on request is OPEN (O-47) |
| Correction | Member edits own data |
| Deletion | Delete on request within 30 days; purge job; backups roll off (data model §7, O-15) |
| Objection / withdraw consent | Unsubscribe and pause; account deletion |
| Portability | Export of master and variants in a common format is PROPOSED after the gate |
| Visitor requests | Visitors are not identifiable, so most requests cannot be matched to data; the notice says so and gives a contact. Contact-form senders can ask the member or Sheetfolio to delete their message |
| Complaints | A named contact and process; the regulator named in the notice (to verify) |

### 3.6 Children and age
The product is for working adults. Sign-up asks the person to confirm they are 18 or older. **The age confirmation is not stored as a personal fact beyond the acceptance record** (ASSUMED). Under-18 members are out of scope.

### 3.7 International transfers
Members, visitors, the frontend host, the backend host, the database, the email service and any AI provider may sit in different countries. Under both NDPA and GDPR-level standards cross-border transfers need safeguards (to verify). Action: record every processor, its region and its agreement in a **processor register** (O-48), and choose regions deliberately in documents 9 and 15 (O-32).

### 3.8 Registration and accountability (to verify with a specialist)
Nigerian law may require registration as a data controller/processor above thresholds, a named contact for data protection, records of processing, and breach notification within a short window. The assessment assumes the product **will** need: a privacy contact, a record of processing (this document's §2 as a start), a breach response plan (§7), and an annual-style review habit. (OPEN, O-49)

---

## 4. Security design rules

### 4.1 Identity and sessions
- Backend-owned sessions (ADR-11 PROPOSED; O-39). Sessions expire after inactivity and have an absolute lifetime (values OPEN, O-50; PROPOSED 30 days sliding, 90 days absolute for members; 12 hours for admins).
- Magic-link tokens are single-use, short-lived (PROPOSED 15 minutes), stored only in hashed form, and invalid after use.
- Google sign-in accepted only with a Google-verified email; linked by verified email (ADR-2).
- Sign-in and invitation responses never reveal whether an email is registered.
- **Admin** is a role. Admin sessions are shorter, and admin actions are logged. Two-step verification for admins is PROPOSED before launch (O-51).
- No passwords are stored (no password sign-in).

### 4.2 Authorisation
- Ownership checked on every request in the backend (api-spec §9). A record belonging to another member returns `not_found`.
- Admin cannot read member private content or leads by default (data model §6). Any break-glass access is logged and justified.
- Service credentials are separate per caller and environment.

### 4.3 Input, output and uploads
- Validate all input at the backend; encode output in the frontend; member content is rich data, rendered through known section renderers, **never as raw markup** (prevents script injection through master content).
- Uploads: type allow-list, size limits, verified after storage, images re-encoded to strip hidden data such as GPS location in photo metadata (PROPOSED, important for site photos taken on phones; O-52).
- Links in member content open safely (no access to the opener page); outward links marked as external.
- Pasted job text and CSV treated as data; formula neutralisation on export (api-spec §6.2).

### 4.4 Redirect and link safety
- Redirect destinations come only from stored job records (FR-1.1), preventing open redirects.
- Application codes and tokens are long and unguessable; enumeration attempts are rate limited.
- Job destination links are checked when stored and may be re-checked for malicious targets before a digest is sent (ASSUMED, O-53).
- Unsubscribe and preference tokens are signed and expire.

### 4.5 Web protections
- Browser security headers on frontend responses (content restrictions, frame protection, referrer policy).
- Protection against cross-site request forgery on all state-changing calls (ADR-11 cookie design).
- The refresh endpoint between backend and frontend requires a service credential and is not public.
- Rate limits on sign-in, contact form, redirects, imports (api-spec §2.5).
- A spam guard on the contact form.

### 4.6 Secrets and configuration
Secrets only in platform configuration, never in the repository, never in front-end code. Rotation steps documented (document 15). Separate secrets for preview and production. Pre-commit and pipeline secret scanning (document 12).

### 4.7 Dependencies and supply chain
Exact version pins (ADR-10); automated vulnerability alerts on both repositories; monthly review of pre-release libraries; lockfiles committed; build runs without production secrets.

### 4.8 Data protection at rest and in transit
HTTPS everywhere; encryption at rest as provided by the managed database and storage (to confirm in O-32); backups encrypted; restore test before launch (NFR-12, O-15).

### 4.9 Logging and monitoring
Log events, not content: sign-ins, admin actions, failures, purge counts. No personal data, tokens or addresses in application logs. Alerts for repeated sign-in failures, unusual redirect volume, queue backlog and failed sends (NFR-11).

---

## 5. Threat model for the main flows

Method: for each flow, who could abuse it, what could go wrong, what stops it. Rated at a summary level; scores are in §8.

| Flow | Threat | Control |
| --- | --- | --- |
| **Sign-in (J1, J6)** | Email enumeration; token theft; session theft; invitation bypass | Neutral messages, hashed single-use tokens, short sessions, invitation check, rate limits |
| **Digest links** | Link forwarding gives another person the member's tailor link | Tailor link requires sign-in as that member; job links reveal nothing personal |
| **Job redirect** | Open redirect; click-fraud inflating metrics | Stored destinations only; bot rules; rate limits; admin sees anomalies |
| **Shared page** | Scraping of members' pages; harmful content; impersonation | Public by design: members decide what to publish; suspension and report channel; no private data on pages |
| **Application code guessing** | Enumeration of pages | Unguessable codes; rate limits; unavailable page does not distinguish reasons |
| **Master/variant editing** | Cross-member access; injection through content; lost updates | Ownership checks, no raw markup, last-seen version |
| **Uploads** | Malware, oversized or disguised files, location leaks | Allow-list, size limit, post-storage check, re-encoding, metadata stripping |
| **Contact form** | Spam; abuse as relay; harvesting | Guard, rate limit, content filters, no open recipient field |
| **Admin tools** | Account takeover leading to digest abuse; mistaken sends | Short admin sessions, extra verification, confirmed sends, action log |
| **Job import** | Malicious files; formula injection; copyright | Data-only handling, preview first, terms recorded |
| **Scheduled jobs** | Unauthorised triggering; duplicate sends | Service credentials, idempotency |
| **Frontend-backend link** | Stolen service credential; cache poisoning via refresh endpoint | Per-environment credentials, signed requests, limited scope |
| **Email events** | Forged bounce/unsubscribe events | Signature verification |
| **Migration (Redis to SQL)** | Data loss; downtime for the existing user | Rehearsal, reversible until cut-over, backup first |
| **Phase 4 payments / AI** | Duplicate or forged events; data sent to AI provider | Signature + idempotency (ADR-9); provider terms checked (ADR-8) |

---

## 6. Email and messaging compliance (design rules)

- **Consent and expectation:** members who are invited agree to receive the weekly digest at sign-up; the purpose and click recording are stated (§3.3).
- **Every digest** carries a working one-click unsubscribe, a sender identity and a contact route (M14, M15). Unsubscribe is honoured immediately and does not close the account.
- **Bounces and complaints** stop sending (api-spec §6.1); the complaint rate is monitored; a threshold for pausing sends is set (O-54, PROPOSED 0.1%).
- **Sender authentication:** the sending domain is authenticated before the first digest (document 15).
- **Transactional versus digest** streams are separate (ADR-6).
- **Job content from third parties:** only what source terms allow is shown; jobs link to the source (FR-3.7, O-10).
- **Anti-spam laws** of the recipient's country apply (to verify).

---

## 7. Incident and breach response (outline)

| Step | Rule (PROPOSED) |
| --- | --- |
| Detect | Alerts (§4.9), member or visitor reports, provider notices |
| Contain | Revoke credentials, suspend affected features or pages, rotate secrets |
| Assess | What data, whose, how many, whether encrypted, whether IP or personal data was exposed |
| Notify | Regulator and affected people within the legally required time (to verify, Nigeria and GDPR-level baseline: treat **72 hours** as the planning target) |
| Record | Incident log with timeline and decisions |
| Learn | Fix cause, update this document |

A one-page runbook and a named person (you, initially) are required before launch (document 15). A **single point of failure** exists because the builder is one person; a trusted backup contact with access to the emergency steps is recommended (O-55).

---

## 8. Risk register (scored)

Scale: **Likelihood** 1 (rare) to 5 (expected). **Impact** 1 (minor) to 5 (severe). **Score** = L × I. Owner is **Olareign** unless stated. Scores are judgements for discussion, not measurements.

| ID | Risk | L | I | Score | Mitigation | Trigger to escalate |
| --- | --- | --- | --- | --- | --- | --- |
| R-1 | **Real person's personal details remain in the public repository and its history** | 5 | 4 | **20** | Remediation plan §9 before any invitation | Any invitation sent before cleanup |
| R-2 | Platform logs keep visitor IPs, contradicting the notice (§3.2) | 3 | 5 | **15** | Log audit, shortest retention, truthful notice | Audit shows a layer cannot be configured |
| R-3 | Digest curation workload overwhelms a solo admin | 4 | 3 | **12** | Cap of 3 categories for 6 weeks (BR-9); weekly time-box | Two missed Tuesdays |
| R-4 | Job source terms forbid redistribution; digest has no content | 3 | 4 | **12** | Check terms before use (FR-3.7); 2 to 3 sources | A source objects or blocks |
| R-5 | Ten formats delay the first digest | 4 | 3 | **12** | Digest after first 3 formats (O-17); formats as configuration | First digest date slips twice |
| R-6 | Two repositories and migration add more work than the solo builder can carry (ADR-11) | 4 | 3 | **12** | Contract tests; option to merge into one repository | Phase 2 exceeds plan by half |
| R-7 | Members publish third-party confidential or patient information | 3 | 5 | **15** | Guidance at entry and publish; terms; report channel; fast suspension | Any report received |
| R-8 | Account takeover (member or admin) | 2 | 5 | **10** | Short sessions, single-use tokens, admin extra verification, alerts | Unusual sign-in pattern |
| R-9 | Digest deliverability fails (spam folder, domain reputation) | 3 | 4 | **12** | Authenticated domain, separate stream, complaint monitoring | Click rate far below target with high bounce/complaint |
| R-10 | Pre-release sign-in library breaks or changes behaviour | 3 | 4 | **12** | Exact pin; fallback plan; test both methods | A breaking release or security notice |
| R-11 | Click recording loss distorts the gate numbers | 3 | 3 | **9** | Failure counters; loss threshold (O-29) | Loss above 1% |
| R-12 | Redirect added hop slows links (NFR-2) | 3 | 3 | **9** | Measure; same-region hosting; fall back to monorepo hosting if needed | Redirect time above agreed budget |
| R-13 | Too few members to read the gate | 4 | 3 | **12** | Decide a minimum before the 6 weeks (O-16) | Fewer than the minimum at week 1 |
| R-14 | Loss of data (no tested restore) | 2 | 5 | **10** | Backups and restore test before launch (NFR-12) | Restore test fails |
| R-15 | Breach notification missed because only one person is on call | 3 | 4 | **12** | Runbook; backup contact (O-55) | Absence over 48 hours |
| R-16 | Legal non-compliance (registration, transfers, notice wording) | 3 | 4 | **12** | Specialist review before invitations (O-49) | Review finds gaps |
| R-17 | Visitors reject tracked links, harming members' applications | 2 | 3 | **6** | Clear notice; no wall; test with employers | Reports from members |
| R-18 | Hosting cost exceeds budget (images, two services, queue) | 3 | 3 | **9** | Image limits; cost watch each month | Spend above agreed cap (O-56) |
| R-19 | Single-person dependency (illness, absence) for operations | 3 | 4 | **12** | Documentation (documents 14, 15); backup contact | Any absence |
| R-20 | AI/Paystack later introduce new data flows | 2 | 4 | **8** | Re-run this assessment before phase 4 | Phase 4 planning starts |

**Top five by score:** R-1 (20), R-2 (15), R-7 (15), then R-3, R-4, R-5, R-6, R-9, R-10, R-13, R-15, R-16, R-19 (12).

---

## 9. Remediation plan: personal data in the public repository (R-1)

**CONFIRMED decision:** replace with fictional data and clean history, before invitations. The plan below is for your approval; **nothing has been changed in the repository.**

| Step | Action | Notes |
| --- | --- | --- |
| 1 | **Identify** every place the real person's details appear: seed data, tests, screenshots, documentation, commit history, pull requests, issues, forks | Search files and history; list findings without copying the details into new documents |
| 2 | **Decide with the person** (the real user): confirm whether they consent to the data staying anywhere, and what they want removed | Respect their wishes first |
| 3 | **Contain**: consider making the repository private while cleaning (a choice you did not select; recorded as an option, O-57) | Forks and clones made while public may persist |
| 4 | **Replace** files with entirely fictional data | Names, employers, photos, credentials must all be invented |
| 5 | **Rewrite history** to remove the details from past commits (coordinated; every clone must be re-created afterwards) | History rewriting is destructive and affects open pull requests; only with your explicit go-ahead |
| 6 | **Rotate** anything that was exposed (keys, tokens) | Check whether any secret was ever committed |
| 7 | **Verify** with a second search of files and history | Include the pull request #1 branch |
| 8 | **Prevent** recurrence: a rule in the repository conventions (document 14) that test and seed data are fictional only; secret scanning | |
| 9 | **Record** the action and date in the incident/accountability log | |

Residual risk: copies already made by others cannot be recalled. The person should be told this honestly.

---

## 10. Pre-launch security and privacy checklist (gate for inviting members)

1. Specialist privacy review complete; notice wording approved (PR-6).
2. Platform-log audit complete (R-2).
3. Repository remediation complete and verified (R-1).
4. Processor register and regions recorded.
5. Backups and restore test passed.
6. Admin extra verification enabled.
7. Sending domain authenticated; unsubscribe tested.
8. Breach runbook and backup contact in place.
9. Penetration-style review of sign-in, redirects and uploads (self-run checklist at minimum; external test OPEN, O-58).
10. Terms of use and report channel live.

---

## 11. Open questions added by this document

| ID | Question | Proposal |
| --- | --- | --- |
| O-44 | If a platform layer cannot stop logging addresses, change the layer or soften the notice? | PROPOSED: change the layer |
| O-45 | Use no email open pixels at all? | PROPOSED: none |
| O-46 | How do third parties report a harmful or confidential page? | PROPOSED: a contact address on every page footer |
| O-47 | Full data export on request in v1? | PROPOSED: manual on request |
| O-48 | Where is the processor register kept? | PROPOSED: a private document outside the public repository |
| O-49 | Registration, privacy contact and record-keeping duties under NDPA | Specialist to confirm |
| O-50 | Session lifetimes | PROPOSED values in §4.1 |
| O-51 | Two-step verification for admins before launch? | PROPOSED: yes |
| O-52 | Strip photo metadata on upload? | PROPOSED: yes |
| O-53 | Re-check job destination links before sending a digest? | PROPOSED: yes, at tagging and at send |
| O-54 | Complaint-rate pause threshold | PROPOSED: 0.1% |
| O-55 | Trusted backup contact for emergencies | Your decision |
| O-56 | Monthly hosting budget cap | Your decision |
| O-57 | Make the repository private during cleanup? | You chose plan-first; confirm whether to contain now |
| O-58 | External security test before launch? | PROPOSED: later, after the gate |
| O-19 | Repeat visits | **Answered:** per-link counts only in MVP |

---

## 12. Updates required in other documents after approval
- **PRD:** record O-19 answer, privacy requirements PR-1 to PR-6, and the log-audit requirement.
- **Data model:** "first or repeat" field reserved but empty in the MVP (already noted).
- **UI/UX spec:** privacy notice wording, terms and report links, admin extra verification screen.
- **Architecture:** none beyond ADR-11 consequences.

---

## 13. Approval

- [ ] Privacy requirements PR-1 to PR-6 and the platform-log rule (§3)
- [ ] Security design rules (§4) and threat model (§5)
- [ ] Email compliance rules (§6) and incident outline (§7)
- [ ] Risk register scores and owners (§8)
- [ ] Repository remediation plan (§9), including that no history rewrite happens without your explicit go-ahead
- [ ] Pre-launch checklist (§10)
- [ ] Open questions O-44 to O-58 acknowledged
- [ ] Approved to start document 12 (testing and QA strategy)
