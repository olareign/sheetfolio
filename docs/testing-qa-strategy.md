# Sheetfolio: Testing and QA Strategy

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: `docs/requirements.md`, `docs/user-journeys.md` (AC-J*), `docs/architecture.md`, `docs/api-spec.md`, `docs/security-privacy-risk.md`.
> This is a strategy: what to test, at which level, with which data, and what must pass before release. It contains **no test code**. Tool names are assumptions to confirm in document 14.

Labels: **CONFIRMED**, **ASSUMED**, **OPEN**, **PROPOSED**, **NEW**.

---

## 1. Decisions taken for this document

| Decision | Choice | Status |
| --- | --- | --- |
| Depth | **Risk-based:** heavy on business rules, redirects, matching and privacy; light on visuals | CONFIRMED |
| Browser end-to-end tool | **Playwright** | CONFIRMED |
| Format testing | **Shared section tests plus one render-and-accessibility test per format**; format 1 also gets a visual snapshot proving it is unchanged | CONFIRMED |
| Real-user acceptance | **Dry-run digest to test inboxes, then 2 to 3 invited members as a pilot** before the six-week gate starts | CONFIRMED |
| Existing unit test tool | Vitest (already in the repository) | CONFIRMED (existing) |

Because ADR-11 splits the system into **two repositories**, each has its own tests, and a **contract** ties them together (§5).

---

## 2. Test principles

1. **Test what would hurt most first.** Order by the risk register (security-privacy-risk §8): privacy promises, redirects, digest sends, follow/freeze, access control.
2. **Acceptance criteria are the spec.** Every AC-J* in the journeys document maps to at least one test (§9).
3. **Tests are fast and repeatable.** Rules are tested as pure logic; slow tests are few and meaningful.
4. **Fictional data only.** No real person's details in tests, seeds or screenshots (R-1).
5. **A bug becomes a test.** Every fixed defect adds a test that would have caught it.
6. **Privacy checks are tests, not promises.** PR-1 to PR-6 are verified automatically where possible.
7. **No coverage number as a goal.** A coverage report is read as a map of untested areas, not a target (CONFIRMED by the risk-based choice).

---

## 3. Test levels

| Level | What it covers | Where | Tool (ASSUMED) |
| --- | --- | --- | --- |
| **Unit** | Pure rules: tag matching and ranking, follow/freeze resolution, plan limits, job age rule, slug rules, bot rules, time-zone scheduling, validation | Both repositories | Vitest (existing) |
| **Integration (backend)** | Endpoints against a real test database and a fake email service: ownership checks, idempotency, soft delete and purge, error shape | Backend | Backend test runner with a throwaway database |
| **Contract** | The API contract between frontend and backend (§5) | Both | Contract checks generated from the spec (O-38) |
| **Component (frontend)** | Section renderers and editors, form validation messages, accessibility rules | Frontend | Vitest plus component testing library |
| **End-to-end** | Journeys J1 to J6 in a browser at phone width against a preview environment | A third location: either repository, or a small test project (O-59) | Playwright (CONFIRMED) |
| **Accessibility** | Automated checks on every format and key screen; manual keyboard pass | Frontend, E2E | Automated rule engine in Playwright plus manual checklist |
| **Performance** | Public pages and redirect (NFR-1, NFR-2) | E2E / CI | Lighthouse runs; redirect timing script |
| **Security** | Authorisation, injection, upload, rate limit, secret scanning, dependency alerts | Both | Tests plus scanners (§8) |
| **Privacy** | No IP or identifier stored; no cookies on visitors (PR-1 to PR-6) | Both, E2E | Targeted tests (§8) |
| **Migration** | Redis to SQL data move, reversible | Backend | Rehearsal against a copy |
| **Operational** | Backup restore, digest dry-run, scheduled jobs | Staging | Manual runbooks (§11) |

---

## 4. Priority areas and what must be tested

Ranked by risk. "Must" means the release is blocked without it (§10).

### 4.1 Tracked links and measurement (FR-1.x)
| Test | Level | Must |
| --- | --- | --- |
| A valid job link records one click and lands on the stored employer link | Integration, E2E | Yes |
| An unknown job or digest still redirects if the destination is known; otherwise shows not-found | Integration | Yes |
| **A destination in the request is ignored** (no open redirect) | Integration, Security | Yes |
| Application link shows the right variant and records one visit | Integration, E2E | Yes |
| Retired, unknown, suspended, unpublished links show the unavailable page and reveal no reason | Integration | Yes |
| Preview and scanner user agents are not counted; requests within 2 seconds of the send are not counted | Unit, Integration | Yes |
| **Recording fails: the redirect and page still work** (FR-1.8) | Integration with a broken store | Yes |
| A click record contains exactly the allowed fields and **no IP, no raw user agent** | Integration, Privacy | Yes |
| The same link visited twice shows two visits (no repeat logic in MVP, O-19) | Integration | Yes |
| Counts below 5 visits show no country breakdown (O-35) | Unit | Yes |
| Clicks older than 12 months become summaries and detail is removed (FR-1.9) | Integration with a clock | Yes |
| Redirect added delay stays within the budget (NFR-2, R-12) | Performance | Yes |

### 4.2 Accounts and access (FR-2.1 to 2.3, ADR-2)
| Test | Level | Must |
| --- | --- | --- |
| Invited email can sign in with a link; uninvited gets a neutral message | Integration, E2E | Yes |
| Magic link is single-use, expires, and is stored hashed | Integration | Yes |
| Google sign-in accepted only with a verified email and links to the same account (when built) | Integration | Yes (when built) |
| Setup cannot finish without a category (FR-2.1) | Unit, E2E | Yes |
| **A member cannot read or change another member's records** across every endpoint group | Integration (generated across the contract) | Yes |
| Admin endpoints reject members; admin cannot read member private content | Integration | Yes |
| Slug rules: unique, reserved words and route-shadowing refused | Unit, Integration | Yes |
| Sessions expire as designed; admin sessions shorter | Integration | Yes |

### 4.3 Master, variants, follow/freeze (FR-2.3 to 2.7, BR-10)
| Test | Level | Must |
| --- | --- | --- |
| Editing the master changes only the master; followed variant sections show the change; frozen ones do not | Unit, Integration | Yes |
| Switching follow to frozen copies current content; frozen to follow needs confirmation and discards the copy | Unit | Yes |
| Master section removed: followed variant sections become frozen with last content (data model §5.4) | Unit | Yes |
| Publishing validates required fields and lists every problem | Unit, E2E | Yes |
| Published variants do not change until republished (O-34, once confirmed) | Integration | Yes |
| Unpublished drafts are not reachable at public addresses | Integration, E2E | Yes |
| Deleting a variant with active links is refused with the reason; moving links first allows it (O-18) | Integration | Yes |
| Soft delete hides at once; restore works within 30 days; purge after 30 days | Integration with a clock | Yes |
| Plan limits enforced on the server (phase 4) | Unit | Phase 4 |
| Stale-version save returns `conflict` and loses nothing | Integration | Yes |

### 4.4 Digest (FR-3.x, ADR-5)
| Test | Level | Must |
| --- | --- | --- |
| Jobs older than 14 days are rejected (BR-8) | Unit | Yes |
| Matching ranks by tag overlap; the "why it matched" text reflects the actual overlap | Unit | Yes |
| Each digest has 5 to 8 entries unless fewer matches exist; no filler | Unit | Yes |
| A job from a source without a terms check cannot enter a digest | Unit, Integration | Yes |
| At most 3 categories in the first 6 weeks; override needs confirmation (FR-3.6) | Unit | Yes |
| **Dispatcher sends Tuesday 07:00 in each member's zone** across many zones, daylight-saving changes and a member who changes zone | Unit with a clock | Yes |
| **Running the dispatcher twice sends once** (idempotency member + week) | Integration | Yes |
| A failed send retries with a limit and appears in Failures | Integration | Yes |
| Lapsed and paused members, undeliverable emails, unsubscribed members are skipped | Integration | Yes |
| Both buttons in a digest work; Tailor opens the editor with the job loaded; signed-out goes through sign-in and keeps the job (J6) | E2E | Yes |
| Digest email renders on phone width with images off; plain-text alternative present | Email rendering check, manual | Yes |
| Job import: preview shows accepted and rejected rows; nothing saved until confirmed; duplicates flagged; confirming twice saves once | Integration | Yes |

### 4.5 Admin and operations (J5, J7, J9)
| Test | Level | Must |
| --- | --- | --- |
| Digest numbers match the underlying records for a test week (FR-1.6) | Integration with fixtures | Yes |
| Suspension takes effect on public pages within the refresh window (O-40) | E2E, Integration | Yes |
| Admin sends require explicit confirmation | E2E | Yes |
| Action log records admin changes | Integration | Yes |
| Purge removes everything for a deleted account within the window, and logs counts only | Integration | Yes |

### 4.6 Formats (ADR-3)
| Test | Level | Must |
| --- | --- | --- |
| **Shared section tests:** each section type validates, renders, orders and hides correctly | Unit, Component | Yes |
| **One render-and-accessibility test per format (10):** sample content renders; automated accessibility rules pass; keyboard path works; contrast holds in both themes | E2E / Component | Yes |
| **Format 1 visual snapshot** proves the engineering page is unchanged after the move to format definitions | E2E visual | Yes |
| Each format meets NFR-1 on a phone profile (Lighthouse 90+ and under 1.5 s on throttled 4G) with its sample content | Performance | Yes |
| A category without a finished format uses the generic layout | Unit | Yes |
| Confidentiality reminders appear for categories 5, 7 and 8 and at publish | Component | Yes |
| Changing category keeps hidden sections (O-25) | Unit | Yes |

---

## 5. Contract testing between the two repositories (ADR-11)

| Rule | How |
| --- | --- |
| The API specification is the single source of truth | Contract tests are derived from it (O-38) |
| The backend proves it satisfies the contract | Backend pipeline runs contract checks against a real instance |
| The frontend proves it uses only what the contract allows | Frontend pipeline runs against a contract-faithful mock |
| **Backward compatibility** (api-spec §2.6) | The backend pipeline also runs the **previous frontend release's** expectations; failure blocks the backend release |
| Error shape and codes are stable | Tests assert every documented code appears with the documented shape |
| Cross-repository changes | A change that alters the contract updates the spec first, then both sides, in an agreed order (document 14) |

---

## 6. Test data

| Need | Approach |
| --- | --- |
| People | Entirely fictional members across the 10 categories, with fictional work history and generated placeholder images |
| Jobs | Fictional jobs with realistic tags, ages (including 13, 14, 15 days), closing dates and sources (checked and unchecked) |
| Time zones | A set covering Lagos (the owner's zone), UTC, a half-hour zone, a zone in the opposite hemisphere, and a zone that changes clocks near the test date |
| Clicks | Generated records for 14 months to test summarising |
| Bots | Recorded sample request headers from known preview and scanner behaviours |
| Email | A fake email service in automated tests; a real mailbox set for the dry run |
| Images | Small, large, wrong-type, oversized, and photos with embedded location data (to verify stripping, O-52) |
| Migration | An anonymised copy of today's data structure with fictional content |
| Rule | **No real person's data** in any test file, fixture, screenshot or log (R-1) |

---

## 7. Environments and pipelines

| Environment | Use |
| --- | --- |
| Local | Unit and component tests; fake services |
| Preview (per pull request, per repository) | Integration and E2E against matching preview pairs, or a stable test backend (api-spec §7) |
| Staging | Dry runs, migration rehearsal, restore tests, performance runs; sends only to test mailboxes |
| Production | Smoke checks only; no destructive tests |

Pipeline gates (ASSUMED, to specify in document 15):
1. Lint, type check, unit and component tests on every push.
2. Contract and integration tests before merge.
3. E2E on phone width and accessibility checks on preview before merge to the main branch.
4. Security scans and secret scanning on every push.
5. Production deploys only from the main branch (CONFIRMED practice).

Flaky tests are fixed or removed, never ignored.

---

## 8. Security and privacy verification

| Item | Verification |
| --- | --- |
| PR-1 no IP stored | Automated: send requests with known addresses, then search database, queue and logs for them |
| PR-2 no raw user agent stored | Same method |
| PR-3 no cookie or storage on visitor pages | E2E: visit shared pages, assert no cookies and no browser storage written |
| PR-4 contact data not joined to clicks | Data-model test and review |
| PR-5 small-count suppression | Unit |
| PR-6 notice present on every public page | E2E |
| Ownership everywhere | Generated test that calls every member endpoint as another member |
| Injection | Member content with markup and script strings never renders as markup |
| Uploads | Wrong type, oversize, disguised files, location metadata |
| Rate limits | Sign-in, contact form, redirects, imports |
| Token handling | Magic link single use, expiry, hashed storage; unsubscribe token expiry |
| Webhook / event signatures | Forged events rejected (email now; payments in phase 4) |
| Dependencies and secrets | Automated vulnerability alerts and secret scanning in both repositories |
| Headers and CSRF | Automated check of response headers; state-changing calls rejected without protection |
| Log audit (R-2) | Manual checklist before launch, repeated after infrastructure changes |
| Self-run security checklist | Before inviting members (security-privacy-risk §10) |

---

## 9. Traceability: journeys to tests

Each acceptance criterion in `docs/user-journeys.md` must map to at least one test. The mapping is kept as a table in the repository's test documentation (document 14) and checked at each release.

| Journey | Main tests | Level |
| --- | --- | --- |
| J1 Join | Invitation, sign-in, category required, time zone detect-and-confirm, slug claim, resume setup | Integration, E2E |
| J2 Build and publish | Master edit, validation, publish review, unpublished not public | Integration, E2E |
| J3 Variant and link | Create variant, follow/freeze, create and label link | Integration, E2E |
| J4 Visitor opens link | Right variant, recording, bots, failure-safe, unavailable pages, no cookies | Integration, E2E, Privacy |
| J5 Admin digest | Import preview, tagging, source terms, matching, preview, confirmed send, idempotency | Integration, E2E |
| J6 Member tailors | Tailor from digest, signed-out path preserves the job, existing-variant prompt | E2E |
| J7 Numbers and gate | Figures match fixtures | Integration |
| J8 Master change | Per-section follow choices, frozen unaffected | Unit, Integration |
| J9 Suspension | Public effect, member banner, restore | Integration, E2E |

---

## 10. Release criteria (quality gates)

**To invite the first members (pilot), all of the following:**
1. All "Must" tests in §4 pass for the features being released.
2. Privacy tests PR-1 to PR-6 pass and the platform-log audit is done (R-2).
3. Format 1 snapshot unchanged; formats 1 to 3 pass their render-and-accessibility tests and NFR-1.
4. Contract tests pass in both repositories.
5. A backup has been restored successfully in staging (NFR-12).
6. The dry-run digest (§11) completed.
7. No open defect rated critical or high.
8. Repository remediation verified (R-1).

**To start the six-week gate:** the above plus the pilot (§11) completed without critical findings, and all 10 formats either released or on the generic layout with the digest limited to the first 3 categories (O-17).

**Defect severity (PROPOSED):**
| Level | Meaning | Example | Rule |
| --- | --- | --- | --- |
| Critical | Privacy promise broken, data exposed, links down, wrong digest sent | An IP appears in storage | Blocks release; fix at once |
| High | Core journey fails for many | Tailor button loses the job | Blocks release |
| Medium | Workaround exists | A label wraps badly in one format | Fix within the phase |
| Low | Cosmetic | Spacing | Backlog |

---

## 11. Real-user acceptance: dry run and pilot (CONFIRMED)

### 11.1 Digest dry run (before any member is invited)
1. Use a set of test mailboxes at several mail providers and on phones.
2. Send a digest for fictional members in at least three time zones; confirm arrival at 07:00 local (within the O-21 tolerance).
3. Check: spam folder placement, plain-text alternative, images off, buttons, unsubscribe, bounce handling.
4. Run the dispatcher twice and confirm one send per member.
5. Record findings and fix critical and high items.

### 11.2 Pilot (2 to 3 invited members)
- Members from different categories if possible, including one on a basic phone and a slow connection.
- Observe (with their permission) the path: digest, Tailor, edit, publish, share.
- Questions: Was anything unclear? Did you trust the "why it matched" text? Did the privacy statement make sense? Would you send this link to an employer?
- Duration: at least one digest cycle (one week), ideally two.
- Output: a short findings list feeding fixes before the gate begins. Pilot members' data is real, so it is protected under the privacy rules in document 11 and is **not** copied into tests.
- The pilot is separate from the six-week gate; its numbers do not count toward the gate (ASSUMED, O-60).

---

## 12. Manual testing and exploratory checklists

Short, repeatable checklists kept with the test documentation:
- **Phone pass:** each format at 360 px, on a real mid-range phone and on a throttled connection; images load, text readable, nothing cut off.
- **Keyboard and screen reader pass:** main journeys without a mouse; labels and focus order sensible.
- **Email pass:** several mail apps, dark mode, images off.
- **Wording pass:** error and privacy messages read clearly, kind and honest.
- **Exploratory sessions:** 30-minute time-boxed sessions per major release, trying to break sign-in, uploads and the editor.

---

## 13. Non-functional test targets

| Area | Target | Source |
| --- | --- | --- |
| Public page load | Under 1.5 s on throttled 4G; Lighthouse performance and accessibility 90+ | NFR-1 |
| Redirect | Added delay within a budget set from measurement (O-61) | NFR-2 |
| Accessibility | Contrast 4.5:1, keyboard access, visible focus, both themes | NFR-8 |
| Mobile | Works at 360 px | NFR-9 |
| Availability | No formal target; fail-safe behaviour tested | NFR-3 |
| Scale | Low hundreds of members: a load test with 10x the expected digest size and redirect traffic once, to find limits | NFR-4 |
| Backup | Restore tested | NFR-12 |
| Recording loss | Measured in staging under failure injection (O-29) | ADR-4 |

---

## 14. Roles and responsibilities (solo builder)

You are developer, tester and admin. To reduce blind spots (ASSUMED):
- Run the dry run and pilot with at least one **independent person** reviewing the privacy notice and the phone experience.
- Keep a short written test log per release.
- Use fresh eyes: leave a day between building a feature and its final acceptance pass where possible.

---

## 15. Risks to testing itself

| Risk | Mitigation |
| --- | --- |
| Two repositories make end-to-end tests awkward | Contract tests carry most of the load; keep E2E to the six core journeys |
| Time-based digest logic is hard to test | Inject a controllable clock; test zones and daylight-saving changes explicitly |
| Image-heavy formats fail NFR-1 late | Test performance with the first sample content of each format as soon as it exists |
| Real data leaks into tests | Fictional-only rule plus repository scanning |
| Too many tests slow the solo build | Risk-based scope, remove low-value tests |
| Email behaviour differs across providers | Dry run on several providers |

---

## 16. Open questions added by this document

| ID | Question | Proposal |
| --- | --- | --- |
| O-59 | Where do end-to-end tests live with two repositories? | PROPOSED: in the frontend repository, pointing at a backend preview |
| O-60 | Do pilot numbers count toward the gate? | PROPOSED: no |
| O-61 | What is the redirect delay budget? | Set after the first measurement; starting guess is that it should not be noticeable on a phone |
| O-62 | Which mail providers and phones are in the dry-run set? | PROPOSED: at least three providers, one low-end phone |
| O-63 | Is an external accessibility or security review wanted before the gate? | PROPOSED: not before the gate |

---

## 17. Approval

- [ ] Risk-based approach and test levels (§2, §3)
- [ ] Priority test lists (§4) including the "Must" items
- [ ] Contract testing between the two repositories (§5)
- [ ] Test data rules, fictional only (§6)
- [ ] Security and privacy verification (§8)
- [ ] Release criteria and severity levels (§10)
- [ ] Dry run and pilot plan (§11)
- [ ] Open questions O-59 to O-63 acknowledged
- [ ] Approved to start document 13 (implementation roadmap and task breakdown)
