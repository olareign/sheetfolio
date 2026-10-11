# Sheetfolio: Functional and Non-Functional Requirements

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: `docs/prd-v2.md` for product decisions; `docs/user-profiles-and-stories.md` for stories.
> This document adds testable detail. Where it adds a decision that the PRD does not contain, it is marked **NEW** and the PRD needs a matching update after approval (§6).

Labels: **CONFIRMED** (decided), **ASSUMED**, **OPEN**, **NEW** (decided in this round of discovery, not yet in the PRD).

---

## 1. Business rules

| ID | Rule | Source |
| --- | --- | --- |
| BR-1 | Each member has exactly one master record and one profession category. | CONFIRMED |
| BR-2 | A variant belongs to one member and derives from that member's master. | CONFIRMED |
| BR-3 | An application link points at one variant and carries one member-chosen label. A variant can have many application links. | CONFIRMED |
| BR-4 | Every job link and every shared page link goes through a Sheetfolio redirect. | CONFIRMED |
| BR-5 | Visitors are never identified by name, email or IP address. Only the link label and the country identify a visit. | CONFIRMED |
| BR-6 | A member's main page stays online read-only after a lapsed trial. Editing, variants, digest and detailed analytics stop until payment. | CONFIRMED |
| BR-7 | The digest goes to trial members and paying members, not to lapsed members. | CONFIRMED |
| BR-8 | Jobs older than 14 days are not placed in a digest. | CONFIRMED |
| BR-9 | The first digest covers only categories that have members, at most 3 at once for the first 6 weeks. | ASSUMED, approved |
| BR-10 | When a master changes, the member chooses per section whether each variant follows it or stays frozen. | CONFIRMED |
| BR-11 | Plan limits: Starter has 1 page and 2 job variants; Pro has unlimited variants. | CONFIRMED |
| BR-12 | Trial AI tailoring has a fixed cap per trial; the number is open. | ASSUMED, OPEN |

---

## 2. Functional requirements

These extend the requirement IDs in the PRD (§5). Each lists validation, error behaviour and an acceptance test in plain terms. Full workflows and detailed acceptance criteria come in document 6.

### 2.1 Tracked links and measurement

| ID | Requirement | Validation and errors | Acceptance (summary) |
| --- | --- | --- | --- |
| FR-1.1 | Job link records a click, then redirects to the employer's ad. | Unknown job, digest or member ids: still redirect if the destination is known; otherwise a friendly not-found page. A redirect must never expose or accept an arbitrary destination from the URL. | A click on a valid job link lands on the employer page and one click is recorded. |
| FR-1.2 | Application link records a visit, then shows the linked variant. | Unknown or removed code: not-found page. A suspended or lapsed member's variant still resolves (read-only). | A visit shows the right variant and one visit is recorded under the member's label. |
| FR-1.3 | Each record holds time, link and type, member, digest, country, device class, first or repeat. IP is not stored. | Country may be unknown; store it as unknown. | A record contains exactly those fields and no IP. |
| FR-1.4 | Robots are excluded before counting. | Known preview and scanner agents, and requests within 2 seconds of the send time, are not counted. | Preview fetches from messaging apps and email scanners do not raise counts. |
| FR-1.5 | Email open counts are a rough signal only. | Not used in the north-star or in gates. | No gate depends on opens. |
| FR-1.6 | Admin Digest tab shows weekly sent, clicked, click rate, variants created, tailor rate, and the 10 most-clicked jobs. | Only admins can open it. | Figures match the underlying records for a test week. |
| FR-1.7 | Members see views per variant and per application link. | A member sees only their own data. | A member cannot read another member's counts. |
| **FR-1.8 (NEW)** | If recording a click fails, the redirect or page still proceeds. | Recording is best effort; failures are logged for the admin. | With the recording store unavailable, links still land on their destinations. |
| **FR-1.9 (NEW)** | Per-click records are kept 12 months, then summarized. | Summaries keep weekly and per-link totals; detailed rows are removed. | A record older than 12 months no longer exists in detail; totals remain. |

### 2.2 Accounts, master record, formats and variants

| ID | Requirement | Validation and errors | Acceptance (summary) |
| --- | --- | --- | --- |
| FR-2.1 | Sign-up assigns one of the 10 categories. | Required. How a profession maps to a category is OPEN (O-3). | A new member cannot finish setup without a category. |
| FR-2.2 | Members choose matching tags at setup and can edit them. | Limits and vocabulary OPEN (O-4). | Chosen tags appear in matching. |
| FR-2.3 | One master record per member. | Required fields depend on the category format (specified in document 7). | Editing the master updates the master only. |
| FR-2.4 | A member's page uses the native format of their category. | A category without a finished format falls back to a generic layout (O-1). | A member sees a page in their format. |
| FR-2.5 | A member creates variants from the master. | Starter plan limit of 2 enforced with a clear message. | The third variant on Starter is refused with an upgrade message. |
| FR-2.6 | The member chooses per section whether a variant follows or stays frozen. | Default for new variants and new sections OPEN (O-5). | Changing a followed section updates variants; changing a frozen one does not. |
| FR-2.7 | Draft and publish for master and variants. | Publishing validates required fields and reports each problem. | An unpublished draft is not visible at its public URL. |
| FR-2.8 (ASSUMED) | Slugs are unique, validated and cannot shadow app routes. | Existing rules apply. | Carries over from the existing app. |

### 2.3 Weekly digest

| ID | Requirement | Validation and errors | Acceptance (summary) |
| --- | --- | --- | --- |
| FR-3.1 | Admin tooling to collect, tag and match jobs. | Required tags: role, seniority, skills, location, remote or on-site, closing date. Jobs older than 14 days rejected. | A tagged job appears in matching for members with overlapping tags. |
| FR-3.2 | Each member gets 5 to 8 jobs, best match first. | A member with fewer matches gets fewer and no filler. | No digest has more than 8 or fewer than 5 unless matches are short. |
| FR-3.3 | Send Tuesday 07:00 in the member's time zone. | Missing time zone: default and flag (OPEN). | Digests arrive at the expected local time in a test. |
| FR-3.4 | Each job card shows title, company, location, closing date, why it matched, View job (tracked) and Tailor my page (pre-filled variant editor). | All job links are tracked links. | Both buttons work and the tailor button opens a variant with the job loaded. |
| FR-3.5 | Trial members receive the digest. | Lapsed members do not (BR-7). | A lapsed member is excluded from the send. |
| FR-3.6 | The first digest covers categories with members, at most 3 at a time. | Admin sees which categories are included. | A fourth category cannot be added in the first 6 weeks without an explicit override. |
| FR-3.7 | Sources are checked against their terms. | An unchecked source cannot be used in a digest. | The tool records that each source was checked and when. |

### 2.4 AI tailoring, trial and billing

| ID | Requirement | Validation and errors | Acceptance (summary) |
| --- | --- | --- | --- |
| FR-4.1 | A pasted job ad produces a draft variant for review. | Empty, very long or non-ad text gets a clear message. AI output never publishes by itself. | A draft is created; nothing is published until the member does so. |
| FR-4.2 | Plans: Starter $5, Pro $12, Recruiter $99 and up, per month in USD. | Per-country prices later. | Plan limits are enforced as in BR-11. |
| FR-4.4 | New members get 14 days of full Pro. | Clock start OPEN (O-8). | A new member has Pro features during the trial. |
| FR-4.5 | Trial AI tailoring has a fixed cap. | Cap number OPEN (O-6); clear message when reached. | The cap is enforced and shown to the member. |
| FR-4.6 | Lapse keeps the main page read-only. | Existing links keep working. | After lapse, links resolve and editing is blocked. |
| FR-4.7 | Payments through Paystack. | Failed or declined payments show a clear message and keep the member's current state. Recurring USD billing OPEN (O-7). | A test payment succeeds and updates the plan. |
| FR-4.8 (ASSUMED) | Payment webhooks are idempotent. | Duplicate events cannot double-charge or double-credit. | Replaying an event changes nothing. |

### 2.5 Engagement

| ID | Requirement | Validation and errors | Acceptance (summary) |
| --- | --- | --- | --- |
| FR-5.1 | Alert when an application link is opened again. | Only repeat visits count; robots excluded. | A second real visit triggers one alert. |
| FR-5.2 | Who checked me: all plans see totals and countries; Pro sees per variant and per application link with first and repeat visits. | Never shows name, email or IP. | A Starter member cannot see the Pro detail. |
| FR-5.3 | Site diary: one photo and one line a week; reminder on the chosen day, skipped if posted. | Photo type and size limits to be set (O-12). | An entry appears under the latest project, newest first. |

---

## 3. Non-functional requirements

| ID | Requirement | Status |
| --- | --- | --- |
| NFR-1 Performance | Public pages load in under 1.5 seconds on a 4G phone; Lighthouse performance and accessibility 90 or higher; this applies to **all 10 formats** and the redirect. | CONFIRMED |
| NFR-2 Redirect speed | A tracked link adds no more delay than needed to redirect; recording must not block the redirect. | NEW |
| NFR-3 Availability | Best effort on a small budget. Fail safe: if recording or a service dependency fails, the redirect still works (FR-1.8). No formal uptime target. | NEW |
| NFR-4 Scale | Expected member counts are unknown. Requirements assume up to the low hundreds of members at first and are re-checked when real numbers exist. | ASSUMED |
| NFR-5 Data retention | Per-click detail 12 months, then summarized. Other retention (accounts, master records, diary photos, deleted accounts) OPEN. | NEW / OPEN |
| NFR-6 Privacy | No IP stored; no visitor identity; privacy notice on shared pages; specialist review before launch. | CONFIRMED |
| NFR-7 Security | Members access only their own data; admin functions restricted; rate limits on public forms and redirects; uploads validated; secrets kept out of the repository; webhook signatures verified. Detail in document 11. | ASSUMED |
| NFR-8 Accessibility | Text contrast at least 4.5:1, keyboard access and visible focus in every format and both themes. | CONFIRMED (existing) |
| NFR-9 Mobile | Works at 360 px width; the variant editor and digest emails work on phones. | CONFIRMED (existing) / ASSUMED for the new screens |
| NFR-10 Email | Digest and reminders respect unsubscribe and consent rules; open counts are not used for decisions. Detail in document 11. | ASSUMED |
| NFR-11 Observability | The admin can see failed sends, failed recordings and payment errors. | ASSUMED |
| NFR-12 Backup and recovery | Backups and a restore test before launch. Targets OPEN. | OPEN |
| NFR-13 Maintainability | Adding a format or a category should be a contained change; new work keeps the existing tests passing. | ASSUMED |
| NFR-14 Localisation | English only in v1; currency in USD with Paystack. | ASSUMED |

---

## 4. Constraints and dependencies

- **Existing code:** Sheetfolio extends the current app. The engineering page and design system carry over. Everything else is open for evaluation (O-11).
- **Solo builder, no fixed date.**
- **Paystack:** recurring USD billing and international cards to be verified (O-7).
- **Resend** for email; **job sources** with their terms (O-10); an **AI model** and its cost (O-6).
- **Library versions:** the existing code uses pre-release versions of key libraries; assess in architecture.

---

## 5. Open questions added by this document

| ID | Question |
| --- | --- |
| O-12 | Limits for diary photos and other uploads (size, type, count). |
| O-13 | Retention for accounts, master records, diary photos and deleted accounts. |
| O-14 | Time zone handling for members who haven't set one. |
| O-15 | Backup and recovery targets. |

---

## 6. Updates applied to the PRD

Applied on approval, 11 Oct 2026:

1. Added FR-1.8 and FR-1.9 (best-effort recording; 12-month retention).
2. Added the non-functional decisions as PRD §5.6.
3. Added O-12 to O-15 to the open questions list.
4. Marked FR-3.5 / BR-7 (lapsed members do not receive the digest) as confirmed.

---

## 7. Approval

- [ ] Business rules are correct
- [ ] New requirements FR-1.8, FR-1.9 and NFR-2, 3, 5 are acceptable
- [ ] Assumptions in NFR-4, NFR-7 to NFR-14 are accepted or corrected
- [ ] Open questions O-12 to O-15 acknowledged
- [ ] Approved to start document 5
