# Sheetfolio: Open Questions Register and Decisions Needed

> Status: **DRAFT**, 11 Oct 2026. Companion to `docs/prd-v2.md` §14.
> Each document keeps its own question table (the detail and the proposal). This register shows **where each question lives, whether it is answered, and which ones block which milestone**. It adds no new decisions.

Labels: **ANSWERED** (you decided), **PROPOSED** (a recommendation awaits your confirmation), **OPEN** (no recommendation or needs facts).

---

## 1. Decisions needed before M0 starts (blockers)

M0 (groundwork) cannot start safely until these are settled. Ordered by when the work needs them.

| # | Decision | Questions | Why it blocks |
| --- | --- | --- | --- |
| 1 | **Confirm the architecture amendments:** two repositories (ADR-11) and the backend hosting recommendation (ADR-12) | ADR-11, ADR-12, O-74 | Repositories and environments are created in T-0.2.x |
| 2 | **Backend framework** (PROPOSED a structured TypeScript framework such as NestJS with PostgreSQL and Redis) | O-37 answered, O-72 | Backend skeleton, T-0.2.1 |
| 3 | **Sign-in under the split** (backend-owned sessions; keep or replace the library) | O-39 | Identity epic, T-0.4.x |
| 4 | **Managed SQL product and region** | O-32, O-73 | T-0.3.1; also affects the privacy processor register |
| 5 | **Repository clean-up go-ahead:** consult the real user, decide on making the repository private while cleaning, approve any history rewrite | O-57, O-65, R-1 | Nothing may be invited until this is done; rewriting history is destructive |
| 6 | **Monthly budget cap** | O-56 | Choosing production tiers |
| 7 | **Backup contact** for emergencies | O-55 | Runbooks before launch |
| 8 | **Book the specialist privacy review early** | O-49 | Longest waiting item before invitations |
| 9 | **Start Google sign-in verification** (lead time) | O-28, O-66 | Not a gate; start early |

---

## 2. Decisions needed before M2 (pages)

| Decision | Questions |
| --- | --- |
| Profession-to-category helper | O-3 |
| Tag vocabulary and limits | O-4 |
| Default behaviour when the master changes; new sections | O-5 |
| Upload limits (size, type, count) | O-12 |
| Publish snapshots, variant addresses | O-33, O-34 |
| Retention details for backups and files | O-15 answered, O-79 |
| Contract paths and field names fixed at phase 2 start | O-42 |
| Which documents' master location | O-68 |

## 3. Decisions needed before M3 (digest)

| Decision | Questions |
| --- | --- |
| Job sources and their terms | O-10 |
| Hosting limits for 15-minute jobs and email quotas | O-30, O-31 |
| Import limits and tag separators | O-41 |
| "07:00 member time" tolerance | O-21 (PROPOSED 15 minutes) |
| Time zone fallback for members without one | O-14 |
| No-matches week behaviour | O-26 |
| Email open pixels | O-45 (PROPOSED none) |

## 4. Decisions needed before M4 and the gate

| Decision | Questions |
| --- | --- |
| Minimum member count to read the gate | O-16 |
| Whether pilot numbers count | O-60 |
| Privacy notice wording, registration duties, transfers | O-44, O-48, O-49 |
| Admin extra verification, session lifetimes | O-50, O-51 |
| Recording-loss threshold, complaint threshold | O-29, O-54 |
| Redirect delay budget | O-61 |
| Dry-run provider and phone set | O-62 |
| First digest date | O-2 |

## 5. Phase 4 and later (not blocking the MVP)

O-6 (AI model, trial cap, monthly cap), O-7 (Paystack recurring USD and international cards), O-8 (trial clock start), O-9 (custom domain), O-27 (CV PDF per format), O-25 (category change), O-47 (data export), O-58 and O-63 (external reviews).

---

## 6. Register by document

| Document | Questions raised | Status in brief |
| --- | --- | --- |
| PRD (`prd-v2.md`) | O-1 to O-16 | O-1 resolved by mitigations; O-11 proposed (architecture); O-13 answered; O-15 answered; O-16 member count open |
| MVP scope (`mvp-scope.md`) | O-16, O-17 | O-17 answered (both mitigations) |
| Requirements (`requirements.md`) | O-12 to O-15 | O-13, O-15 answered later; O-12, O-14 open |
| User journeys (`user-journeys.md`) | O-18 to O-21 | O-18 PROPOSED (block deletion, move links); O-19 **answered** in security doc; O-20 PROPOSED (count on creation); O-21 PROPOSED (15 minutes) |
| UI/UX spec (`ui-ux-spec.md`) | O-22 to O-27 | All PROPOSED |
| Architecture (`architecture.md`) | O-28 to O-32, O-37 to O-40 | O-37 **answered** (TypeScript); O-38 **answered** in conventions; others PROPOSED or open |
| Data model (`data-model.md`) | O-33 to O-36 | O-13 **answered**; others PROPOSED |
| API spec (`api-spec.md`) | O-41 to O-43 | PROPOSED |
| Security and privacy (`security-privacy-risk.md`) | O-44 to O-58 | O-19 **answered**; O-55, O-56-type decisions are yours; most others PROPOSED |
| Testing (`testing-qa-strategy.md`) | O-59 to O-63 | PROPOSED |
| Roadmap (`roadmap.md`) | O-64 to O-67 | O-65 yours; others PROPOSED |
| Conventions (`engineering-conventions.md`) | O-68 to O-72 | O-38 **answered**; O-72 PROPOSED |
| Operations (`deployment-operations.md`) | O-73 to O-80 | O-15 **answered**; ADR-12 PROPOSED; others PROPOSED or to verify |

Numbering note: IDs are unique across documents. O-62 (dry-run set) is in the testing strategy; the roadmap's time-conversion question is O-67.

---

## 7. Consistency notes found during the final review

These are places where documents differ in wording and how they are reconciled. None changes a decision.

| Topic | Reconciliation |
| --- | --- |
| Early documents say "web application" for server behaviour | After ADR-11, read as "backend". Architecture §3 states this |
| Early documents mention Redis-only (PRD v1.0) | Superseded by ADR-1 once approved; PRD §11 records it |
| MVP scope says first digest after 3 formats while PRD O-1 once said "all 10" | O-1 resolved; PRD §3 "Format launch" is authoritative |
| "First or repeat" click field | Reserved but not populated in the MVP (O-19 answered) |
| Digest sent Tuesday 07:00 member time | Implemented as a 15-minute dispatcher, so "within 15 minutes" (O-21 PROPOSED) |
| Hosting | The frontend stays on the current host; the backend host is ADR-12 (PROPOSED) |

---

## 8. Suggested order for your final review of PR #1

1. PRD `prd-v2.md` (decisions table and §11).
2. `architecture.md` ADR-1, ADR-2, ADR-11, and `deployment-operations.md` ADR-12.
3. `security-privacy-risk.md` §8 (risk scores) and §9 (repository clean-up).
4. `roadmap.md` §2 to §4 (milestones, gates, M0).
5. The rest as reference.
