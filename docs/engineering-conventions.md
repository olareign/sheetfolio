# Sheetfolio: AI Coding Instructions and Repository Conventions

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: all earlier documents. This document turns them into working rules for people **and AI coding agents** once implementation starts (after the discovery set is approved).
> It contains rules and templates in words. It does **not** create any file in the application repositories; the per-repository agent files in §12 are drafts to be added during task T-0.2.1 and T-0.1.5.

Labels: **CONFIRMED**, **ASSUMED**, **OPEN**, **PROPOSED**, **NEW**.

---

## 1. Decisions taken for this document

| Decision | Choice | Status |
| --- | --- | --- |
| Where instructions live | **This conventions document is the shared source of truth; each repository has a short `AGENTS.md` / `CLAUDE.md` that points to it** | CONFIRMED |
| Agent strictness | **Strict:** small steps, tests with every change, ask before architecture or contract changes | CONFIRMED |
| Code conventions | Strict TypeScript with linter and formatter enforced in the pipeline; conventional commits and small pull requests; feature-based folders with pure rule modules; every deviation recorded as an ADR | CONFIRMED (all four) |
| Contract sharing (O-38) | **Contract written once as a machine-readable spec in the backend; frontend types generated from it, never copied by hand** | CONFIRMED |
| Backend language | TypeScript (O-37) | CONFIRMED |
| Repositories | Two: frontend (existing, trimmed) and backend (new) (ADR-11) | CONFIRMED |

---

## 2. The documents are the specification

Agents and people must treat these as the source of truth, in this order when they conflict:

1. `docs/prd-v2.md` (product decisions)
2. `docs/security-privacy-risk.md` (privacy and security rules, **never weakened by a task**)
3. `docs/api-spec.md` and the machine-readable contract (interfaces)
4. `docs/data-model.md` (data)
5. `docs/architecture.md` (ADR decisions)
6. `docs/requirements.md`, `docs/user-journeys.md`, `docs/ui-ux-spec.md` (behaviour)
7. `docs/roadmap.md` (order of work)
8. `docs/testing-qa-strategy.md` (how to prove it)
9. This document (how to work)

**Rule:** code never silently overrides a document. If a document is wrong or silent, the agent stops, states the gap, and asks (§4). Once decided, the document is updated **in the same pull request** as the code, or first.

The documents live in one place only (PROPOSED: the frontend repository's `docs/` folder today; the final home of the master set is O-68). The backend repository's agent file links to them.

---

## 3. Working rules for AI coding agents (strict, CONFIRMED)

### 3.1 Before writing code
1. Read the task in `docs/roadmap.md` (its ID, links and "done when").
2. Read the linked requirements, acceptance criteria and tests.
3. **Frontend:** read the relevant guide in `node_modules/next/dist/docs/` before writing any code. This Next.js version has breaking changes; training knowledge is unreliable (existing repository rule, CONFIRMED). Heed deprecation notices.
4. **Backend:** read the installed versions of its framework and libraries' documentation the same way; do not rely on memory of older versions.
5. Look at neighbouring code and follow its patterns before inventing new ones.
6. State a short plan: files to change, tests to add, anything uncertain.

### 3.2 While writing code
1. **One task ID per pull request;** keep steps small and each step runnable.
2. **Tests with every change** (test-first for rules, §8). A change without tests is incomplete unless the task states why not.
3. Prefer the simplest design that satisfies the task (YAGNI). No speculative features, options or abstractions.
4. Put business rules in **pure modules** with no network, database or framework imports (§6).
5. Never log, store or send personal data except as the data model allows. Never add analytics, cookies, fingerprints or third-party scripts to public pages (PR-1 to PR-6).
6. Never put a secret, token, real name, real email, real photo or real client data in code, tests, fixtures, comments, logs or screenshots.
7. Add a dependency only if the task needs it; justify it in the pull request; pin an exact version (ADR-10).
8. Do not reformat or restructure unrelated code in the same pull request.

### 3.3 Stop and ask (hard stops)
The agent **must stop and ask you** before doing any of these, even if it seems obviously right:

| Area | Examples |
| --- | --- |
| Contract | Adding, removing or renaming an endpoint, field, error code or behaviour |
| Data model | New table or column, changing a rule in `data-model.md`, any retention change |
| Architecture | New service, queue, datastore, framework, or changing an ADR |
| Privacy and security | Anything touching stored visitor data, cookies, logging of requests, sign-in, sessions, uploads, admin power |
| Dependencies | Adding or upgrading a major version or a pre-release library |
| Destructive actions | Rewriting git history, deleting data, dropping tables, running migrations against staging or production, force pushes |
| Scope | Work not listed in the roadmap task |
| Real data | Anything that would involve real people's information |

When blocked, the agent writes a short note: the question, options with trade-offs, and its recommendation. **It does not proceed on a guess.**

### 3.4 After writing code
1. Run lint, type check and the relevant tests; paste the results into the pull request description.
2. Check the task's "done when" and the linked acceptance criteria one by one.
3. List what was **not** done and any follow-ups.
4. Update the documents affected (contract, data model, ADR, roadmap status).

### 3.5 Honesty rules for agents
- Say what was run and what was not. Never claim tests pass without running them.
- Report failures and uncertainty plainly; do not hide them in a summary.
- If a requirement cannot be met as written, say so and propose options.
- Do not fabricate library behaviour; check the installed version.

---

## 4. Change control

| Change | Process |
| --- | --- |
| Small code change inside a task | Pull request with tests |
| Contract change | 1. Edit the API spec and the machine-readable contract. 2. Backend implements and passes contract tests. 3. Frontend regenerates types and adapts. 4. Backward compatibility rule applies (§7.3) |
| Data model change | Edit `data-model.md`, write a reviewed migration (§9), update tests |
| Architecture or ADR change | Add a **new ADR** that supersedes the old one; never edit history silently (§11) |
| Privacy or security rule change | Requires your explicit approval; update `security-privacy-risk.md` first |
| Requirement or scope change | Update the PRD and requirements, record in the changelog, then the roadmap |

Every deviation from a document is recorded; there are no silent deviations (CONFIRMED).

---

## 5. Repository layout

### 5.1 Two repositories (ADR-11)
| Repository | Role | Owns |
| --- | --- | --- |
| **Frontend** (existing, trimmed) | Rendering, forms, navigation, accessibility | Pages, components, section renderers and editors, format definitions (ADR-3, PROPOSED in the codebase), generated API client |
| **Backend** (new) | Rules, data, redirects, jobs, email | API, database access, matching, follow/freeze resolution, click recording, scheduled work, the contract |

Format definitions live in the frontend because they drive rendering and editing; the backend validates section content against the same **section rules**, which come from the contract (O-69: whether validation rules are generated into both sides from one source; PROPOSED yes).

### 5.2 Folder structure (feature-based, CONFIRMED)
Organise by **feature**, not by technical type. PROPOSED top-level features, matching the documents:

| Feature folder | Contents |
| --- | --- |
| `members` | Account, setup, settings, invitations |
| `master` | Master record and sections |
| `variants` | Variants, follow/freeze, publish snapshots |
| `links` | Application links, shared-page lookup |
| `clicks` | Redirect, recording, bot rules, summaries |
| `jobs` | Jobs, sources, import, tagging |
| `digest` | Matching, build, dispatcher, email content |
| `formats` (frontend) | Section library and the 10 format definitions |
| `admin` | Admin screens and endpoints |
| `platform` | Health, failures, action log, rate limits |
| `phase4` (later) | Billing, AI behind interfaces |

Inside each feature: `rules/` (pure logic), `service/` (orchestration), `api/` (transport), `data/` (storage access), `tests/`. Shared code is extracted only when a third use appears.

### 5.3 Pure rule modules (CONFIRMED)
These must be pure functions of their inputs, with no clock, randomness, network or database access unless passed in:

- tag matching and ranking, and the "why it matched" text
- follow/freeze resolution
- bot detection rules
- job age and eligibility rules (BR-8)
- plan limits (BR-11)
- slug and label validation
- time-zone send scheduling (clock injected)
- small-count suppression (O-35)
- section validation

They are the most heavily tested code (testing doc §4).

---

## 6. Code standards

### 6.1 TypeScript and style (CONFIRMED)
- Strict compiler settings on both repositories; no implicit `any`, no unchecked indexing, no unused code. Shared base settings (O-70: shared config package or copied template; PROPOSED copied template to keep the repositories independent).
- Linter and formatter enforced in the pipeline; formatting is never debated in reviews.
- Exact dependency versions (ADR-10); lockfiles committed.
- Naming uses the product's words: **master, variant, application link, digest, label, category, format, section** (UI spec §7.7). No synonyms in code.
- Comments explain **why**, not what. Public functions in rule modules have a one-line description and reference the requirement ID.

### 6.2 Validation and errors
- Validate at every boundary: incoming requests in the backend, form input in the frontend, and generated-contract types between them.
- Use the single error shape and stable codes (api-spec §2.4). Never return raw internal errors.
- Fail safe where the documents say so: redirects and page loads must survive a recording failure (FR-1.8).

### 6.3 Security habits (checked in review)
- Ownership check on every member endpoint through the shared mechanism (T-0.3.4); no hand-written checks scattered around.
- Member content is rendered through section renderers only; never inject raw markup.
- Redirect destinations only from stored data.
- No request details (addresses, user-agent strings, tokens) in logs.
- Uploads validated after storage; images re-encoded.

### 6.4 Accessibility and performance habits
- Semantic structure, labels, focus order, contrast per NFR-8 in every new component.
- Image sizes and loading rules per format; no blocking scripts on public pages.
- Check the page against the NFR-1 budget when adding to a format.

---

## 7. The contract between the repositories (CONFIRMED approach)

1. The backend holds **one machine-readable contract**, derived from `docs/api-spec.md` and kept in step with it.
2. The frontend's API client and types are **generated** from it. Hand-written duplicates are forbidden.
3. **Compatibility rule** (api-spec §2.6): additive changes are free; removing or renaming requires the frontend to stop using it first. Pipelines check the previous frontend release against the new backend.
4. Contract tests run in both pipelines (testing doc §5).
5. A contract change pull request in the backend names the matching frontend task, and the merge order is: contract and backend → regenerate → frontend.
6. Final endpoint paths and field names are fixed at the start of phase 2 (O-42, PROPOSED).

---

## 8. Testing rules for contributors (CONFIRMED approach)

- Follow `docs/testing-qa-strategy.md`: risk-based, Vitest for unit and component tests, Playwright for end-to-end flows at phone width.
- **Pure rules are written test-first** (failing test, then code).
- Every acceptance criterion maps to a test; every fixed bug adds a test.
- **Fictional data only** in tests and fixtures (R-1). A scanner checks for patterns that look like real emails, phone numbers and secrets.
- Time-based logic uses an injected clock; tests never wait for real time.
- Flaky tests are fixed or removed, never skipped silently.
- Format 1's visual snapshot must stay green; changes to the shared section library must run all 10 format tests.
- Privacy tests (PR-1 to PR-6) are mandatory in each pipeline; they cannot be disabled without your approval.

---

## 9. Database and migration rules

- Schema changes only through **reviewed, versioned migrations**; never edit a database by hand outside an incident.
- Each migration is small, reversible where possible, and described in its pull request (what, why, data impact).
- Migrations run in this order: local → preview → staging (with a backup) → production (with a backup, at a chosen time).
- Destructive migrations (drops, data rewrites) need your approval and a restore point (hard stop, §3.3).
- Seed and sample data is **entirely fictional**.
- The Redis-to-SQL data migration (T-0.5.x) is a separate, rehearsed, reversible procedure, not an ordinary migration.

---

## 10. Git, branches and pull requests (CONFIRMED)

### 10.1 Branches
- `main` is always releasable; **production deploys only from `main`** (CONFIRMED practice).
- Work branches are named by task: `feature/T-2.4.2-follow-freeze`, `fix/…`, `docs/…`.
- Documentation-only changes use `docs/…` branches, so a deployment is not triggered (as with PR #1).

### 10.2 Commits
Conventional commit messages with the task ID, for example: type, optional area, short description, task ID in the body. Types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `perf`, `security`. One logical change per commit. Commits made by an AI agent carry the attribution trailers configured for the session.

### 10.3 Pull requests (small, one task)
Every pull request description contains:
1. Task ID and links (requirements, AC, ADR).
2. What changed and why, in plain words.
3. Tests added and the results of lint, types and tests.
4. Documents updated, or "none needed".
5. Risks and anything not done.
6. A checklist: contract unchanged or updated; no personal data; no new dependency or justified; accessibility considered.

Target size: reviewable in one sitting. Large tasks (XL) are split before starting. Merge when the pipeline is green and the checklist is complete. You are the final reviewer; an AI reviewer pass is recommended before merge (O-71).

### 10.4 History and secrets
- No force pushes to `main`. History rewrites happen only for T-0.1.4 and only on your explicit go-ahead.
- Secrets scanning runs on every push; a detected secret is treated as exposed and rotated.

---

## 11. Decision log (ADRs) (CONFIRMED)

- Architecture decisions stay in `docs/architecture.md` until the repositories are created, then new decisions are separate short files in a `docs/decisions/` folder in the master documentation location (PROPOSED).
- Format: context, options, decision, consequences, status (Proposed, Accepted, Superseded by ADR-n).
- **Every deviation is an ADR.** A task that needs to deviate from a document produces the ADR first and waits for your approval.
- Accepted ADRs are never edited except to mark them superseded.
- A short **changelog** records scope and requirement changes with dates.

---

## 12. Per-repository agent files (drafts, not yet created)

Short files that point to this document, as you chose. They are written as text here so you can approve them; creating them is task T-0.2.1 (backend) and T-0.1.5 (frontend).

### 12.1 Frontend `AGENTS.md` / `CLAUDE.md`
- **Keep the existing Next.js block exactly as it is** (it is written and re-added by the framework tool; removing it only recreates the change).
- Add, outside that block: "Read `docs/engineering-conventions.md` and follow it. Strict mode: small steps, tests with every change, ask before changing the contract, data model, architecture, privacy or security. Read the relevant guide in `node_modules/next/dist/docs/` before writing code. Use fictional data only. The API client is generated; do not edit it by hand. One task ID per pull request."

### 12.2 Backend `AGENTS.md` / `CLAUDE.md`
- "Read `docs/engineering-conventions.md` (link to the master location) and follow it. Strict mode as above. The contract is the single source of truth; change it first. Never store or log visitor addresses, raw user agents or identifiers. Business rules go in pure modules. Read installed library documentation before using an API. Ask before any migration against staging or production."

### 12.3 What each file must **not** contain
Secrets, real names or contact details, long copies of the documents (they drift), or rules that contradict this document.

---

## 13. Environment and secrets rules

- Variables are documented by name and purpose, never value, in each repository's setup notes and validated at startup with a clear list of what is missing (as the existing `lib/env.ts` does).
- Separate values per environment; preview environments never use production secrets or production data.
- The frontend and backend use **different** service credentials for each direction (api-spec §2.1).
- Sending to real recipients is disabled outside production and the dry-run set.

---

## 14. Definition of done (per task)

A task is done only when:
1. The "done when" in the roadmap is met and the linked acceptance criteria are demonstrated.
2. Tests exist, pass, and cover the failure cases, not only the happy path.
3. Lint, types and the pipeline are green.
4. Contract, data model, ADR and roadmap documents are updated if affected.
5. No new personal data handling, or it was approved and documented.
6. Accessibility and performance checks were considered for public screens.
7. The pull request checklist is complete and any follow-ups are recorded.

---

## 15. Onboarding for a new contributor or agent (short path)

1. Read the PRD summary, the architecture overview (§3) and this document.
2. Set up the repository from its setup notes using fictional seed data.
3. Run the tests; confirm the pipeline is green.
4. Pick a task from the current milestone in the roadmap.
5. Follow §3, open a small pull request.

---

## 16. Risks and open points

| Risk | Mitigation |
| --- | --- |
| Rules drift between two repositories | Generated types; contract tests; one master documentation location |
| Agents guess when documents are silent | Hard stops (§3.3) and the "ask first" rule |
| Strictness slows a solo builder | Keep pull requests small; recalibrate after M1 (roadmap §14) |
| Documentation becomes stale | Updating documents is part of the definition of done |
| Pre-release framework versions change behaviour | Read installed docs; exact pins; monthly check |

### Open questions added by this document
| ID | Question | Proposal |
| --- | --- | --- |
| O-68 | Where does the master set of documents live once there are two repositories? | PROPOSED: the frontend repository's `docs/` folder, linked from the backend |
| O-69 | Are section validation rules generated into both sides from one source? | PROPOSED: yes, from the contract |
| O-70 | Share TypeScript and lint settings as a package or as a copied template? | PROPOSED: copied template |
| O-71 | Add an automated AI review step before you merge? | PROPOSED: yes, advisory only |
| O-72 | Backend framework within TypeScript | PROPOSED: a structured framework you already know well (for example NestJS) with PostgreSQL and Redis, since it matches your core stack and the queue and scheduling needs (ADR-5); confirm or choose another |
| O-42 | Fix endpoint paths and field names at the start of phase 2 | PROPOSED, unchanged |
| O-38 | Contract sharing | **Answered:** machine-readable spec in the backend, generated frontend types |

---

## 17. Approval

- [ ] Document order of authority (§2)
- [ ] Agent working rules and hard stops (§3)
- [ ] Change control (§4)
- [ ] Repository layout, feature folders and pure rule modules (§5)
- [ ] Code, contract and testing rules (§6 to §8)
- [ ] Git, pull request and decision-log rules (§10, §11)
- [ ] Draft agent files (§12) approved to be created at T-0.1.5 and T-0.2.1
- [ ] Open questions O-68 to O-72 acknowledged
- [ ] Approved to start document 15 (deployment, monitoring and operations)
