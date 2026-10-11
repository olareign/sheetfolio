# Sheetfolio: Target User Profiles and User Stories

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: `docs/prd-v2.md` (product decisions). Story IDs map to PRD requirement IDs (FR-x.x).

## 0. Evidence status

No research has been shared with me for any user group beyond the first real user of the existing app. **Every profile below is a HYPOTHESIS** built from the founder plan, the existing PRD and general reasoning. Nothing here is a finding. Each profile lists what to check in interviews (§6).

Labels: **CONFIRMED** (your decision), **HYPOTHESIS** (needs validation), **OPEN** (needs your decision).

---

## 1. Member profiles in depth

### 1.1 Member: Engineering & Built Environment (HYPOTHESIS)
- **Who:** site engineers, civil, electrical and mechanical engineers, surveyors, architects.
- **Goal:** show completed projects with photos and certificates, and apply to the right jobs with evidence of the work.
- **Motivations:** their work is physical and hard to explain in a CV line; a client or employer wants proof.
- **Pain points:** one-line project entries; no photos; no way to tell if an application was opened.
- **Context:** mostly on phones; project photos taken on site; sharing links through WhatsApp and email.
- **Needs from the page:** project sheets, certification stamps, site diary entries, a CV PDF that matches the page. The existing format already serves this.
- **Assumptions to validate:** that they will tailor a page per job; that they will post weekly diary entries.

### 1.2 Member: Technology & Data (HYPOTHESIS)
- **Who:** software and data professionals, IT staff, security practitioners.
- **Goal:** show projects with outcomes and links, and apply to roles with a page matched to each job's skills.
- **Motivations:** they already compare against GitHub and personal sites; the digest and tracking are the difference.
- **Pain points:** generic portfolio sites take effort; no signal on which applications get opened.
- **Needs from the page:** project showcase with stack and results, links out, short case notes.
- **Assumptions to validate:** that a hosted page is preferred over their own site; that the digest beats existing job alerts for them.

### 1.3 Visitor: employer or recruiter (HYPOTHESIS)
- **Who:** hiring manager, HR officer, recruiter, client. Never signs up.
- **Goal:** judge fit in seconds from a link someone sent.
- **Context:** opens links in WhatsApp, email or LinkedIn previews, often on a phone, sometimes through a security scanner.
- **Needs:** a fast page, clear evidence of work, an easy way to get in touch.
- **Constraint (CONFIRMED):** is never named, tracked by identity or shown an account wall. Only the member's link label and the visitor's country identify a visit.
- **Assumptions to validate:** that employers tolerate a tracked link; that they return to a page when the candidate is under consideration.

### 1.4 Platform admin: Olareign curating the digest (CONFIRMED role, HYPOTHESIS workload)
- **Goal:** run the weekly routine in about 2 hours and read the numbers on Friday.
- **Tasks:** collect about 20 fresh jobs per category, tag them, match, send Tuesday, review Friday, drop sources that earned no clicks for 3 weeks.
- **Pain points:** workload grows with each category (capped at 3 for the first 6 weeks); source terms must be checked.
- **Assumption to validate:** that 2 hours holds for 3 categories.

### 1.5 Recruiter (paying) (CONFIRMED as a tier, launch parked)
- **Goal:** search member profiles and contact them.
- **Status:** not designed in v1. Needs verification to ship first. Included only so v1 decisions don't block it.

---

## 2. Member profiles by category (summary)

All 10 categories share the member goals above. The rows below record only what differs and is still unvalidated.

| # | Category | What the page must show (HYPOTHESIS) | Special concern |
| --- | --- | --- | --- |
| 1 | Engineering & Built Environment | Projects, site photos, certification stamps | Employer names on projects |
| 2 | Technology & Data | Projects, stack, outcomes, links | Confidential client work |
| 3 | Business, Finance & Operations | Achievements with figures, roles, certifications | Confidential figures |
| 4 | Creative & Design | Visual case studies, process, client credits | Image rights and file size |
| 5 | Legal, Policy & Compliance | Matters and areas of practice, publications | **Client confidentiality** |
| 6 | Hospitality & Culinary | Menus, venues, events, photos | Photo-heavy pages on phones |
| 7 | Health & Life Sciences | Practice areas, credentials, research | **No patient information.** Registration checks come with verification |
| 8 | Education & Training | Courses taught, outcomes, materials | Student information |
| 9 | Media, Marketing & Communications | Clippings, campaigns, results | Links that may rot |
| 10 | Skilled Trades & Technical Services | Work log, job cards, photos, licences | Often low-bandwidth phones |

Validate in interviews (§6): what each group counts as proof of their work, and what they refuse to publish.

---

## 3. Epics and user stories

Format: *As a ⟨who⟩, I want ⟨what⟩, so that ⟨why⟩.* Priority: **M** = essential for v1, **L** = later, **I** = needs investigation. Phase refers to the PRD build order.

### Epic A: Measurement and links (phase 1)
| ID | Story | Req | Pri |
| --- | --- | --- | --- |
| A1 | As a member, I want each employer to get their own link to my page with a label I choose, so that I know which application was opened. | FR-1.2 | M |
| A2 | As an admin, I want clicks from link previews and email scanners ignored, so that numbers reflect real people. | FR-1.4 | M |
| A3 | As an admin, I want a Digest tab with weekly sent, clicked, click rate, variants created and tailor rate, so that I know if the loop works. | FR-1.6 | M |
| A4 | As a member, I want to see views per variant and per application link, so that I know what earns attention. | FR-1.7 | M |
| A5 | As a visitor, I want a tracked link to open the page quickly and without sign-up, so that I can judge the candidate. | FR-1.1, 1.2 | M |
| A6 | As a member, I want to know my visitors are never identified by name or IP, so that I can share links with confidence and so employers are respected. | FR-5.2 | M |

### Epic B: Account, master record and variants (phase 2)
| ID | Story | Req | Pri |
| --- | --- | --- | --- |
| B1 | As a new member, I want to choose my profession and have the right page format applied, so that my page looks native to my field. | FR-2.1, 2.4 | M |
| B2 | As a member, I want to choose my matching tags during setup, so that jobs I receive fit me. | FR-2.2 | M |
| B3 | As a member, I want one master record I edit once, so that I don't re-enter my work. | FR-2.3 | M |
| B4 | As a member, I want to create a variant for a specific job, so that my page speaks to that job. | FR-2.5 | M |
| B5 | As a member, I want to decide per section whether a variant follows or stays frozen when I change my master, so that I control what employers see. | FR-2.6 | M |
| B6 | As a member in a category without a finished format, I want a clean generic layout, so that I can still publish. | PRD §6 | OPEN (O-1) |
| B7 | As a member, I want to publish and unpublish, so that drafts never reach employers by accident. | FR-2.7 | M |

### Epic C: Weekly digest (phase 3)
| ID | Story | Req | Pri |
| --- | --- | --- | --- |
| C1 | As an admin, I want to tag and match jobs to members by tag overlap, so that each member gets 5 to 8 relevant jobs. | FR-3.1, 3.2 | M |
| C2 | As a member, I want the digest on Tuesday at 07:00 my time, so that it arrives at a predictable moment. | FR-3.3 | M |
| C3 | As a member, I want to see why each job matched, so that I trust the list. | FR-3.4 | M |
| C4 | As a member, I want a **Tailor my page for this** button on each job, so that I can start a variant with the job pre-filled. | FR-3.4 | M |
| C5 | As a trial member, I want the digest during my trial, so that I can experience the loop before paying. | FR-3.5 | M |
| C6 | As an admin, I want sources checked against their terms before use, so that I don't redistribute content I can't. | FR-3.7 | M |

### Epic D: Tailoring, trial and billing (phase 4)
| ID | Story | Req | Pri |
| --- | --- | --- | --- |
| D1 | As a member, I want to paste a job ad and get a draft variant, so that tailoring takes minutes. | FR-4.1 | M |
| D2 | As a member, I want to edit the draft before publishing, so that nothing false or odd goes out under my name. | FR-4.1 | M |
| D3 | As a new member, I want 14 days of full Pro, so that I can see the whole product. | FR-4.4 | M |
| D4 | As a member whose trial ended, I want my page to stay online read-only, so that links I already sent still work. | FR-4.6 | M |
| D5 | As a member, I want to pay through Paystack, so that I can subscribe with methods that work for me. | FR-4.7 | M |
| D6 | As a member, I want my AI usage in the trial to have a clear limit, so that I'm not surprised. | FR-4.5 | M (number OPEN) |
| D7 | As a member outside Nigeria, I want to be able to pay, so that I'm not excluded. | FR-4.7 | I (O-7) |

### Epic E: Engagement (phase 5)
| ID | Story | Req | Pri |
| --- | --- | --- | --- |
| E1 | As a member, I want an alert when an application link is opened again, so that I can follow up. | FR-5.1 | M |
| E2 | As a Pro member, I want first and repeat visits per application link, so that I see who is interested. | FR-5.2 | M |
| E3 | As a member, I want to add a short diary entry with one photo and one line each week, so that my page stays fresh. | FR-5.3 | M |
| E4 | As a member, I want a reminder on my chosen day that skips if I already posted, so that it isn't nagging. | FR-5.3 | M |

### Epic F: Platform and safety
| ID | Story | Req | Pri |
| --- | --- | --- | --- |
| F1 | As an admin, I want to suspend a page, so that abuse can be stopped. | Exists today | M |
| F2 | As a member in Health & Life Sciences, I want clear guidance that patient information must not be published, so that I don't breach confidentiality. | PRD §9 | M |
| F3 | As a visitor, I want a short privacy notice on shared pages, so that I understand what is recorded. | PRD §9 | M |
| F4 | As a recruiter, I want to search and contact members. | Parked | L |
| F5 | As a member, I want my work email, referees or credentials verified. | Parked | L |

---

## 4. Cross-cutting needs (HYPOTHESIS)

- **Phone first.** Members and visitors in several categories will use phones on mobile networks; pages and the variant editor must work at 360 px.
- **Accessibility.** The existing design system targets 4.5:1 contrast and keyboard access; the same bar applies to all 10 formats.
- **Language.** Only English is assumed. Other languages are not scoped. OPEN.
- **Time zones.** The digest is sent in the member's time zone, so each member's zone must be known.

---

## 5. Assumptions about behaviour to validate

| Assumption | Why it matters |
| --- | --- |
| Members will tailor a page for a job | North-star metric |
| Members will post weekly diary entries | Engagement feature |
| Employers click tracked links | Application open rate |
| Members choose useful tags | Matching quality |
| Members in all 10 categories value a native format | Cost of 10 formats |

---

## 6. Interview plan to turn hypotheses into evidence

Suggested, for your approval. Timing is OPEN.

1. 3 to 5 people from each of the 4 categories you named first, plus 1 from each other category if possible.
2. 3 employers or recruiters who receive applications.
3. Ask about the last job application, what proof of work they sent, what they hide, how they find jobs, whether they track applications.
4. Show the existing engineering page and note first reactions.
5. Update this document from the findings, replacing hypotheses with evidence.

---

## 7. Approval

- [ ] Personas are acceptable as hypotheses
- [ ] Stories and priorities are correct
- [ ] Open items acknowledged (B6, D6, D7)
- [ ] Approved to start document 4
