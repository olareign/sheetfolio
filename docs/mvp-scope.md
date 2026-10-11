# Sheetfolio: MVP Scope, Priorities and Exclusions

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: `docs/prd-v2.md`. Requirement IDs refer to the PRD and `docs/requirements.md`.

Labels: **CONFIRMED**, **ASSUMED**, **OPEN**, **PROPOSED**.

---

## 1. What the MVP is

**CONFIRMED.** The MVP is **phases 1 to 3** of the build order: measurement, pages, and the hand-curated weekly digest. It ends at the digest gate: 6 weeks of sends with a click rate at or above 15% (starting target).

**Purpose:** find out, with real members, whether they click jobs in the digest and then create a tailored variant. Nothing else in the plan matters until that is true.

**Consequences of this boundary (PROPOSED reading, please confirm):**
- AI tailoring is not in the MVP. The north-star metric counts a **variant created**, not an AI draft, so a member who taps **Tailor my page for this** and builds the variant by hand still counts. AI makes that step faster later; it is not needed to test whether members do it.
- Billing, trial logic and the read-only lapse are not in the MVP. See §6, O-16.
- Engagement features (repeat-visit alert, "who checked me" detail, site diary) are not in the MVP, except the basic per-link view counts the dashboard already needs (FR-1.7).

---

## 2. MVP scope

### 2.1 Essential (must ship)

| Area | Included | Requirements |
| --- | --- | --- |
| Measurement | Tracked job and application links; click records without IP; bot filtering; best-effort recording; 12-month retention; admin Digest tab; member view counts per variant and link | FR-1.1 to 1.9 |
| Accounts | Sign-up, profession category, matching tags, time zone | FR-2.1, 2.2 |
| Master record | One master per member | FR-2.3 |
| Formats | **All 10 native formats** (see §3 for the cost) | FR-2.4 |
| Variants | Create variants from the master; per-section follow or freeze | FR-2.5, 2.6 |
| Publishing | Draft and publish for master and variants; slugs | FR-2.7, 2.8 |
| Application links | Many links per variant, each with a member-chosen label | FR-1.2 |
| Digest | Admin tagging and matching tool; 5 to 8 jobs per member; Tuesday 07:00 member time; job cards with View job and Tailor my page; trial members receive it; at most 3 categories for 6 weeks; source terms recorded | FR-3.1 to 3.7 |
| Safety and privacy | Privacy notice on shared pages; suspend a page; patient-information guidance for Health members | PRD §9, F1 to F3 |

### 2.2 Kept from the existing app (ASSUMED)
Magic-link sign-in, the CMS and publish flow, contact form with leads inbox, CV PDF, and the engineering format. These exist today. Whether any is replaced is decided in the architecture document (O-11); until then they stay as they are.

### 2.3 Should have if time allows
- Unsubscribe and email preferences polish beyond the legal minimum.
- A digest preview for the admin before sending.
- Basic admin view of failed sends and failed click recordings (NFR-11).

---

## 3. The cost of "all 10 formats" (CONFIRMED decision, risk shown)

You chose to keep all 10 native formats as MVP scope. This is the largest single item. The ranking below is **relative effort, a hypothesis, not an estimate in days.** Calibrate it by building format 2 after format 1 and timing both.

| # | Format | Relative effort (HYPOTHESIS) | Why |
| --- | --- | --- | --- |
| 1 | Engineering: drawing sheet | None (exists) | Already built and in use |
| 2 | Technology: project showcase | Low | Text and links; close to existing sections |
| 3 | Business: achievements summary | Low | Text and figures |
| 5 | Legal: brief | Low | Text-led, confidentiality rules |
| 8 | Education: teaching portfolio | Low to medium | Text plus materials |
| 4 | Creative: case-study gallery | Medium to high | Image-heavy, performance target (NFR-1) |
| 6 | Hospitality: menu | Medium to high | Image-heavy, distinctive layout |
| 7 | Health: practice profile | Medium | Credentials and compliance copy |
| 9 | Media: clippings board | Medium | Link and embed handling |
| 10 | Trades: job-card work log | Medium | Photo-led, low-bandwidth phones |

Why it matters:
- Every format must meet NFR-1 (under 1.5 s on 4G, Lighthouse 90 or higher). Image-heavy formats put that target under the most pressure.
- Each format needs content rules, sample data and tests; the variant editor must work for all of them.
- The PRD's O-1 (all 10 before the first digest vs. build by signups) stays **OPEN**. This scope document keeps your decision. Two ways to reduce risk without changing it are listed in §7.

---

## 4. Deferred to later releases

| Feature | Phase | Why deferred |
| --- | --- | --- |
| AI tailoring from a pasted job ad | 4 | Not needed to test the north-star; adds cost and model decisions |
| Paystack billing, plans, 14-day trial, read-only lapse | 4 | Not needed to test whether members click and tailor |
| Repeat-visit alert | 5 | Engagement; follows the measurement data |
| "Who checked me" detail (first and repeat per link) | 5 | Same |
| Site diary and reminders | 5 | Same |
| Recruiter plan and member search | After gate | Needs verification first |
| Verification (work email, referees, credentials, ID) | After gate | Parked in the founder plan |
| Job scraper | After gate | Only if hand curation shows members click |
| Per-country pricing and global sales-tax provider | After gate | Before marketing abroad |

## 5. Excluded from the initial scope

| Item | Status |
| --- | --- |
| **Bring-your-own AI key** | **CONFIRMED excluded** (your choice this round) |
| Automated scraping | Excluded until the gate |
| Multiple editors per page | Excluded (existing PRD exclusion carries over) |
| Languages other than English | Excluded (ASSUMED) |
| Marketing campaigns and a global marketing push | Parked in the founder plan |

## 6. Needs investigation before or during the MVP

| Item | Question |
| --- | --- |
| Custom domain (Pro) | In v1 or later? (O-9). Not in MVP either way, because Pro is phase 4 |
| Job sources | Which boards, and do their terms allow redistribution? (O-10) |
| Tag design | Controlled list or free text? (O-4) |
| Profession to category mapping | (O-3) |
| Variant defaults | Default for new variants and sections when the master changes (O-5) |
| **MVP members** | O-16: invited early members, free during validation (confirmed). How many are needed to read the gate is still open |

---

## 7. Risks to the MVP and ways to reduce them

| Risk | Impact | Mitigation options |
| --- | --- | --- |
| 10 formats delay the first digest | The loop is tested late | **Both mitigations approved:** (a) ship the digest as soon as the first 3 categories' formats are ready, with the rest finishing in parallel; (b) define each format as configuration of shared sections instead of new code (architecture document). All 10 stay in the MVP while the first digest date is protected |
| Weekly curation workload | Admin overload | Cap of 3 categories for 6 weeks (BR-9) |
| Too few members to read a click rate | Gate cannot be judged | Decide a minimum number of members before the 6 weeks start (O-16) |
| Job sources unusable | Digest has no content | Check terms of 2 to 3 sources before phase 3 |
| Public repository exposes a real person's data | Privacy harm | Remediate before any MVP member is invited |

---

## 8. MVP exit criteria

The MVP is done when:
1. A member can sign up, choose a category and tags, build a master, publish, create a variant and share a tracked application link.
2. The admin can curate, tag, match and send a digest, and read the Digest tab.
3. Bots are excluded and failed recordings do not break links (FR-1.4, 1.8).
4. All 10 formats meet NFR-1 on a test phone profile.
5. The privacy notice is live and the public repository issue is fixed.
6. Six weekly digests have been sent and the numbers read against the gate (15% click rate, starting target).

**Decision after the gate:** if the tailor rate is far below the 10% starting target, fix matching and sources before building phases 4 and 5. If it is met, proceed.

---

## 9. Questions raised by this document, and their status

| ID | Question | Status |
| --- | --- | --- |
| O-16 | Who are the first MVP members, and are they free during validation? | **CONFIRMED:** invited early members, free during validation. Billing and the trial rules apply after the gate. **Still OPEN:** how many members are needed to read the gate. |
| O-17 | Mitigations for the 10-format risk | **CONFIRMED: both.** Ship the digest once the first 3 categories' formats are ready (Engineering, Technology, Business) while the other formats finish in parallel, and build formats as configuration of shared sections (to be specified in the architecture document). This refines, and partly supersedes, "all 10 before the first digest" (O-1). All 10 formats remain MVP scope. |

Note on O-1: the first digest no longer waits for all 10 formats. Members in a category whose format is not ready yet use the clean generic layout (story B6) until it ships. This is a **change from your earlier decision**, made by choosing both mitigations; it is recorded here so the PRD can be updated.

---

## 10. Approval

- [ ] MVP boundary (phases 1 to 3) and its consequences in §1
- [ ] Essential list in §2.1
- [ ] Deferred and excluded lists in §4 and §5 (BYO key excluded)
- [ ] Format effort ranking accepted as a hypothesis (§3)
- [x] O-16 and O-17 answered (see §9); member count for the gate still open
- [ ] Approved to start document 6
