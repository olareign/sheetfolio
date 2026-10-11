# Sheetfolio: UI/UX Specification and Screen Inventory

> Status: **DRAFT for approval**, 11 Oct 2026
> Authority: `docs/prd-v2.md`; journeys and acceptance criteria in `docs/user-journeys.md` (J1 to J9, AC-J*); requirements in `docs/requirements.md`.
> Scope of this document: what each screen is for, what it contains, what it does, and how it behaves when things go wrong. **No wireframes, mockups, visual styling or code.** Visual style is inherited from the existing design system (CONFIRMED to keep) and is not redesigned here.

Labels: **CONFIRMED**, **ASSUMED**, **OPEN**, **PROPOSED**, **NEW**.

---

## 1. Design principles

| # | Principle | Status |
| --- | --- | --- |
| P1 | **Phone first.** Every screen works at 360 px width; members and visitors mostly use phones, often on mobile networks. | CONFIRMED (NFR-9) |
| P2 | **Visitors meet no wall.** No sign-up, no cookie banner that blocks the page, no pop-ups. A page opens straight to the member's work. | CONFIRMED (BR-5, stories A5) |
| P3 | **One clear next step per screen.** The member's main path is: digest, Tailor my page, edit, publish, share. Each screen makes the next step obvious. | PROPOSED |
| P4 | **Say what is recorded.** Anywhere a number about visitors is shown, the screen states that visitors are never named and no IP is stored. | CONFIRMED (A6) |
| P5 | **Fast by default.** Public pages meet NFR-1 (under 1.5 s on 4G, Lighthouse 90 or higher), in all 10 formats. Image-heavy formats get explicit size rules (§6). | CONFIRMED |
| P6 | **Accessible.** Text contrast at least 4.5:1, full keyboard use, visible focus, in both themes and all formats. | CONFIRMED (NFR-8) |
| P7 | **Plain, kind errors.** Every error says what happened, what is safe, and what to do. Nothing is lost silently. | PROPOSED |
| P8 | **Never publish by accident.** Draft and published are always visibly distinct; publishing is an explicit action. | CONFIRMED (B7) |
| P9 | **English only in v1.** | ASSUMED |

---

## 2. Screen inventory at a glance

Organised by audience (CONFIRMED choice). Phase refers to the PRD build order; **MVP** = phases 1 to 3.

| ID | Screen | Audience | Journey | Phase |
| --- | --- | --- | --- | --- |
| V1 | Shared page (application link) | Visitor | J4 | 1 / 2 |
| V2 | Main public page (member's own address) | Visitor | J2 | 2 |
| V3 | Contact form and confirmation | Visitor | J4 | existing |
| V4 | Privacy notice | Visitor | J4 | 1 |
| V5 | Not-found and unavailable pages | Visitor | J4, J9 | 1 |
| V6 | Job link interstitial (none; instant redirect) | Visitor (member in practice) | J6 | 1 |
| M1 | Sign-in | Member | J1, J6 | existing |
| M2 | Check your email | Member | J1 | existing |
| M3 | Welcome and setup (category, tags, time zone, address) | Member | J1 | 2 |
| M4 | Member home | Member | J2 to J6 | 2 |
| M5 | Master editor | Member | J2, J8 | 2 |
| M6 | Variant list | Member | J3 | 2 |
| M7 | Variant editor (including job context and follow/freeze) | Member | J3, J6 | 2 |
| M8 | Application links panel | Member | J3 | 1 / 2 |
| M9 | Publish review | Member | J2, J3 | 2 |
| M10 | Views and numbers (own) | Member | J3 | 1 |
| M11 | Settings (profile, tags, time zone, email preferences) | Member | J1 | 2 / 3 |
| M12 | Leads inbox | Member | existing | existing |
| M13 | CV PDF | Member | existing | existing |
| M14 | Digest email | Member (in the inbox) | J5, J6 | 3 |
| M15 | Unsubscribe and preferences page | Member | J5 | 3 |
| A1 | Admin home | Admin | J5, J7 | 1 / 3 |
| A2 | Digest tab: numbers and gate | Admin | J7 | 1 |
| A3 | Job intake (manual form, paste/CSV import) | Admin | J5 | 3 |
| A4 | Job tagging and source terms | Admin | J5 | 3 |
| A5 | Matching and digest build | Admin | J5 | 3 |
| A6 | Digest preview and send | Admin | J5 | 3 |
| A7 | Members and invitations | Admin | J1 | 2 |
| A8 | Pages and suspension | Admin | J9 | existing |
| A9 | Failures (failed sends, failed recordings) | Admin | NFR-11 | 3 (should have) |

Screens for phases 4 and 5 (paste-a-job-ad, plans and payment, trial banners, repeat-visit alert, who-checked-me detail, site diary) are listed in §9 as outlines only.

---

## 3. Visitor screens

### V1. Shared page (application link `/s/{code}`)
- **Purpose:** show one variant to an employer; the most important screen in the product. Judged in seconds, on a phone.
- **Content:** the variant in the member's native format (see §6), a contact action, a small "Made with Sheetfolio" mark (CONFIRMED only for lapsed members; for others OPEN, O-22), a link to the privacy notice (V4).
- **Actions:** read and scroll; open outward links; contact the member (V3); open the CV PDF if the member enabled it.
- **No actions that need an account.**
- **States:**
  - *Normal:* page renders. A visit is recorded in the background.
  - *Slow or offline recording:* nothing visible changes (FR-1.8).
  - *Bot or scanner:* same page, nothing recorded (FR-1.4).
  - *Member lapsed:* page still shows, read-only (BR-6); no editing exists here anyway.
  - *Member suspended:* unavailable page (V5), not a broken page.
  - *Unknown or removed code:* friendly not-found (V5).
  - *Variant unpublished since the link was sent:* unavailable page (V5). OPEN: whether to show the member's main page instead (O-23).
- **Accessibility and speed:** no blocking scripts; images sized; first content visible without client scripts where possible (ASSUMED).

### V2. Main public page
- **Purpose:** the member's standing page at their own address, showing the master in their native format.
- **Content / actions / states:** same as V1 without the application label. Views are counted per page only (existing counters), not per employer.
- **Difference from V1:** the address is public and guessable; the shared link in V1 is the one members hand to employers.

### V3. Contact form and confirmation
- **Purpose:** let a visitor write to the member without an account (existing feature).
- **Content:** name, email and message fields, a sentence saying the message goes to the member, a spam guard.
- **Rule note:** this is the one place a visitor may choose to give their name and email. It is **optional, voluntary and separate** from link tracking; the page says so. The tracked-visit record is never joined to it (BR-5). **PROPOSED wording to be reviewed by the privacy specialist.**
- **States:** sending; sent (confirmation); invalid input (field-level messages); rate-limited (asks to try later, existing); service down (message kept on screen so it can be copied).

### V4. Privacy notice
- **Purpose:** say plainly what a visit records: link label, time, country, device type, first or repeat; no name, no email, no IP.
- **Content:** short plain-language summary; contact for questions; link from every shared page and the main page.
- **Status:** wording is OPEN until the privacy review (document 11). The screen is required before launch (PRD §9).

### V5. Not-found and unavailable pages
- **Purpose:** handle every dead end kindly.
- **Variants:** not found; page unavailable; page not published yet.
- **Content:** one sentence, no blame, a link to the Sheetfolio home. No details that reveal why a page is unavailable (for example, suspension reasons are never shown to visitors).

### V6. Job link (`/j/{job}`)
- **Purpose:** record a click and redirect to the employer's job ad.
- **UI:** none. It is an instant redirect (NFR-2). If the destination is unknown, a friendly not-found page (V5) is shown (FR-1.1).

---

## 4. Member screens

### M1. Sign-in
- **Purpose:** enter by email magic link (CONFIRMED; whether it stays is O-11).
- **Content:** email field, one button, a sentence on what happens next. When arriving from a digest, a line says "Sign in to tailor your page for **{job title}**" (J6).
- **Actions:** request link.
- **States:** sending; sent (go to M2); invalid email; rate-limited; email service down (clear message, no loop). An invitation that has expired or was already used explains this and offers a new link.
- **Rule:** no password; no account creation without an invitation during validation (O-16). A non-invited email gets a neutral message that does not reveal whether an account exists (ASSUMED, to review in document 11).

### M2. Check your email
- **Content:** where to look, how long the link lasts, resend after a short wait, change address.
- **States:** link used; link expired (offer a new one); opened on a different device (still works if the link is valid, ASSUMED).

### M3. Welcome and setup
A short, resumable sequence rather than one long form. Order is **PROPOSED**:
1. **Profession category:** ten choices with an example list of professions each. Required (FR-2.1). If a profession is not listed, the member picks the closest and can say what they do (O-3).
2. **Matching tags:** role, seniority, skills, location, remote or on-site preference. Vocabulary and limits are OPEN (O-4); the screen is designed so tags can be a chosen list with search, or free text, without changing the flow.
3. **Time zone:** detected from the browser and shown for confirmation; changeable (CONFIRMED approach, O-14).
4. **Your address:** claim a slug; live availability and rule messages (FR-2.8).
5. **Done:** goes to M4 with the next step highlighted.
- **States:** leaving midway saves progress; refreshing resumes at the same step; an unavailable slug suggests alternatives; a slug that looks like an app route is refused with a plain reason.
- **Health members:** step 1 for category 7 shows the patient-information guidance (F2) before they continue.

### M4. Member home
- **Purpose:** the place to start every session.
- **Content (PROPOSED order):**
  1. *Next step card.* Context sensitive: "Finish your page" (no master yet) → "Publish your page" → "Your latest digest has {n} jobs" → "Create a variant".
  2. *Your pages:* the main page and variants, each with draft or published, last edited, and a view count (FR-1.7).
  3. *Latest digest:* when the next one arrives; link to the most recent jobs (if a web view exists, O-24).
  4. *Links:* shortcuts to leads inbox, CV PDF, settings.
- **States:** new member (empty, with the next step only); member with a draft only; suspended (banner explaining editing is paused, how to contact support). Phase 4 adds trial and plan banners (§9).

### M5. Master editor
- **Purpose:** edit the one master record (BR-1).
- **Content:** sections of the member's format (§6), each with fields, drag-to-reorder where the existing editor supports it, an autosaved draft indicator, a preview button that opens the page as a visitor sees it.
- **Actions:** edit, reorder, add or remove items, upload images, preview, open publish review (M9).
- **Validation:** inline, per field, with required fields marked; confidential-content reminders for categories where they matter (5 Legal, 7 Health, 8 Education) shown near the relevant fields.
- **J8 behaviour:** when a master section changes and variants exist, a panel asks per section whether each variant follows or stays frozen (BR-10). Defaults OPEN (O-5); the screen shows the current choice per variant before applying.
- **States:** saving; saved; failed to save (changes stay on screen, retry offered); image too large or wrong type (rules OPEN, O-12); offline (editing allowed, saving pauses, ASSUMED); lapsed (read-only, phase 4).

### M6. Variant list
- **Content:** each variant with job title and company if known, draft or published, last edited, number of application links, views.
- **Actions:** create a variant; open; duplicate (ASSUMED); delete (see O-18).
- **States:** empty (explains what a variant is in one sentence and offers Create); Starter limit reached (phase 4: message with upgrade). During the free validation period, a soft cap per member is OPEN (O-5).
- **Delete rule (PROPOSED, O-18):** a variant with application links cannot be deleted; the screen offers to move its links to another variant, then delete.

### M7. Variant editor
- **Purpose:** the heart of the loop: a page tailored to one job.
- **Entry points:** from M6 (blank or from the master), or from a digest **Tailor my page for this** (job pre-filled, J6).
- **Content:**
  - *Job context bar:* job title, company, closing date, link to the ad (tracked). Collapsed on phones, always reachable.
  - *Sections:* same sections as the master; each shows **Following master** or **Frozen** with a switch (BR-10). Frozen sections are editable here; followed sections show their source and offer "Edit here (freeze)".
  - *Tailoring aids (MVP):* the job's tags and a plain checklist of the member's matching tags that appear on the page. No AI in MVP (§1 of MVP scope).
- **Actions:** edit, reorder which items appear, switch follow or freeze, preview, publish, manage application links (M8).
- **States:** as M5, plus *job removed* (the context bar keeps the saved copy; it never loses the member's variant), *duplicate tailor* (if the member taps Tailor on a job they already have a variant for, they are offered to open the existing one or make another).
- **Measured event:** a variant counts for the north-star when it is created (O-20 PROPOSED).

### M8. Application links panel
- **Purpose:** make and manage the tracked links for one variant (BR-3).
- **Content:** list of links, each with the member's label (for example "Acme HR"), the address, a copy button, visit count, and created date.
- **Actions:** create a link (label required, 1 to 60 characters, ASSUMED); copy; rename; retire a link.
- **States:** none yet (a one-line explanation and a Create button); copy succeeded (brief confirmation); label duplicate within the same variant (allowed with a warning, ASSUMED); retired link (visitors see V5).
- **Privacy line:** "Visitors are never named. You will see counts by link label and country."

### M9. Publish review
- **Purpose:** the safety step before anything is public (P8).
- **Content:** list of problems to fix (each links to the field), a checklist of reminders (confidential information, patient information for Health members), the public address, a Publish button.
- **States:** blocked (problems listed, button disabled with the reason); ready; published (shows address and copy button, and for variants offers to create an application link); unpublish available at any time.

### M10. Views and numbers (own)
- **Content:** views per page, per variant, per application link; country totals; first versus repeat is **not** shown in the MVP (E2 is phase 5).
- **Rule:** only the member's own data (FR-1.7). Numbers say "may exclude automated visits".
- **States:** no data yet; recording delayed (note that counts may lag); data older than 12 months appears as totals only (FR-1.9).

### M11. Settings
- **Content:** name and profile basics, profession category (change allowed? OPEN, O-25), tags, time zone, address, digest preferences (pause, unsubscribe), delete account (retention rules OPEN, O-13).
- **States:** invalid tag; time zone change effect explained ("your next digest will arrive Tuesday 07:00 {zone}"); digest paused (clear notice that no jobs will arrive).

### M12 and M13. Leads inbox and CV PDF (existing)
Carried over as is. Their screens are not redesigned in this document; if the architecture decision (O-11) replaces the underlying code, behaviour stays the same. CV PDF must reflect the master in the member's format (existing for engineering; other formats OPEN, see §6).

### M14. Digest email
- **Purpose:** the main way a member returns.
- **Content (CONFIRMED by FR-3.4):** a greeting, 5 to 8 job cards, best match first. Each card: title, company, location, closing date, **why it matched**, **View job** (tracked), **Tailor my page for this**. A footer with unsubscribe, preferences, the sender, and a postal or contact identifier if required (to review in document 11).
- **Behaviour:** readable on a phone; works with images off; every link is a Sheetfolio redirect (BR-4). Plain-text alternative included (ASSUMED).
- **States:** fewer than 5 matches (shows what exists, no filler, with a line inviting the member to widen tags); no matches (a short note and no send, or a "nothing this week" message, O-26); a closed job (card is removed if known before send).
- **Measurement:** open pixels are not used for decisions (FR-1.5).

### M15. Unsubscribe and preferences
- **Content:** one-click unsubscribe, pause for 4 weeks, change tags (link to M11).
- **States:** already unsubscribed; link expired (offers sign-in).
- **Rule:** unsubscribing from the digest does not close the account.

---

## 5. Admin screens

All admin screens require the admin role (existing platform admin) and show no member private content beyond what the task needs.

### A1. Admin home
- **Content:** this week's status (jobs collected, tagged, matched; send state), last week's headline numbers, shortcuts to the working screens, alerts (failed sends or recordings).

### A2. Digest tab: numbers and gate (FR-1.6)
- **Content:** per week: sent, clicked, click rate, variants created, tailor rate, top 10 jobs by clicks; gate view: six-week trend against the starting targets (click rate 15%, tailor rate 10%).
- **Notes:** a plain definition under each figure; bots excluded; a flag when fewer members than needed to read the gate (O-16).
- **States:** no data yet; partial week; data still arriving.

### A3. Job intake (J5)
- **Two ways, both CONFIRMED:** a manual form (title, company, location, remote flag, closing date, source, link, description summary), and paste or CSV import with a preview and row-by-row errors.
- **Validation:** job older than 14 days rejected with the reason (BR-8); duplicates flagged by link and title; invalid links rejected.
- **States:** import with mixed results (accepted rows kept, rejected rows listed with reasons); large import (progress); import cancelled safely.

### A4. Job tagging and source terms
- **Content:** each job with required tags (role, seniority, skills, location, remote or on-site, closing date); a source list with "terms checked on {date}" (FR-3.7).
- **Rule:** a job from an unchecked source cannot be used in a digest; the screen shows why it is blocked.

### A5. Matching and digest build
- **Content:** for each category and member group: jobs ranked by tag overlap, the "why it matched" text that will show, include or exclude controls, the categories currently included (at most 3 in the first 6 weeks, FR-3.6) with an override that requires confirmation.
- **States:** fewer than 5 matches for a member; a member with no tags; a member with no time zone (flagged, O-14).

### A6. Digest preview and send
- **Content:** preview the email as a chosen member would see it; schedule shows how many members, in which time zones, and the send times; send or hold.
- **States:** scheduled; sending; partly failed (list and retry); cancelled. "Digest preview for the admin" is a should-have (MVP scope §2.3).
- **Rule:** sending is a deliberate, confirmed action that cannot be triggered by accident.

### A7. Members and invitations
- **Content:** invite by email; list of members with category, joined date, last activity, digest status; resend or revoke an invitation.
- **Rule:** member private content is not shown here.

### A8. Pages and suspension (existing, J9)
- **Content:** list of pages, suspend and restore, a reason field kept for the admin, and a note shown to the member (not to visitors).
- **States:** suspension takes effect on public pages promptly (check cache behaviour in architecture).

### A9. Failures (should-have)
- **Content:** failed digest sends, failed click recordings, with counts and recent examples (NFR-11).

---

## 6. Native formats: shared sections plus a per-format table

CONFIRMED approach: formats are configurations of shared sections (O-17), not separate code. Names below are the PROPOSED section vocabulary; the exact set is settled with architecture (document 8) and data model (document 9).

### 6.1 Shared section library
| Section | What it holds |
| --- | --- |
| Header | Name, title, location, contact action, optional photo |
| Summary | A short statement |
| Items (cards) | A repeating entry: title, role, dates, description, figures, links |
| Image set | Photos with captions (size and count limits OPEN, O-12) |
| Credentials | Certificates, licences, registrations |
| Figures | Key numbers (for example "reduced cost by 12%") |
| Links | Outward links to work, articles, repositories |
| Materials | Downloadable files such as syllabi, menus, brochures |
| Experience | Employment history |
| Skills | Tags or short list |
| Contact | The contact form (V3) |

### 6.2 Per-format table (PROPOSED, HYPOTHESIS until members confirm)
| # | Format | Lead section | Other sections | Format-specific rule |
| --- | --- | --- | --- | --- |
| 1 | Engineering: drawing sheet | Items (project sheets) | Image set, Credentials (certification stamps), Experience, Contact | Exists today; **must be unchanged** |
| 2 | Technology: project showcase | Items (projects with stack, outcome) | Links, Skills, Experience, Contact | Outcome field encouraged |
| 3 | Business: achievements summary | Figures | Items (roles), Credentials, Experience, Contact | Confidential-figures reminder |
| 4 | Creative: case-study gallery | Image set + Items | Credentials, Links, Contact | Image size rules strictest (NFR-1); image-rights reminder |
| 5 | Legal: brief | Summary + Items (matters/areas) | Credentials, Links (publications), Contact | **Client confidentiality** reminder before publish |
| 6 | Hospitality: menu | Items (venues/events as a menu) | Image set, Credentials, Experience, Contact | Photo-heavy; mobile-first layout |
| 7 | Health: practice profile | Summary + Credentials | Items (practice areas), Links (research), Experience, Contact | **No patient information** guidance at setup and before publish |
| 8 | Education: teaching portfolio | Items (courses taught) | Materials, Figures (outcomes), Credentials, Contact | Student-information reminder |
| 9 | Media: clippings board | Links + Items (campaigns) | Figures (results), Image set, Contact | Link-rot handling: show saved title and date if the link dies (ASSUMED) |
| 10 | Trades: job-card work log | Items (job cards) | Image set, Credentials (licences), Contact | Low-bandwidth: small images, text-first |

### 6.3 Format rules that apply to all
- Every format uses the same publish review (M9) and the same variant behaviour (M7); they differ only in section set and wording.
- A category whose format is not yet built shows the **generic layout** (story B6, MVP scope §9): header, summary, items, credentials, contact.
- Each format needs sample content for testing and for the empty preview. The seed data in the public repository must not contain a real person's details (known risk, document 11).
- CV PDF per format: OPEN (O-27). Only format 1 has a PDF today.

---

## 7. Cross-cutting behaviour

### 7.1 Empty, loading and error states
Every list screen has an empty state that explains the thing and offers the next step. Loading never blocks reading; slow operations show progress. Errors follow P7 and always say what is safe ("Your changes are still here").

### 7.2 Notifications and messages
Messages inside screens (saved, copied, published) are brief and do not rely on colour alone. Email notifications in the MVP are limited to: sign-in link, invitation, digest, unsubscribe confirmation. The repeat-visit alert is phase 5.

### 7.3 Navigation
- *Member:* Home, Pages (master and variants), Digest, Numbers, Settings. Four to five items at most on a phone (ASSUMED).
- *Admin:* Home, Digest numbers, Jobs, Digest build, Members, Pages.
- *Visitor:* no navigation beyond the page itself; a small footer with privacy and the Sheetfolio mark.
- A digest link opened while signed in goes straight to M7 with the job loaded; while signed out, through M1 and then M7 (CONFIRMED, J6).

### 7.4 Themes
Both light and dark themes (existing), checked for contrast in every format (NFR-8).

### 7.5 Responsive behaviour
Phone first. At wider screens, the editors may show a live preview beside the form (ASSUMED); on phones the preview opens as a separate screen.

### 7.6 Accessibility checklist per screen
Headings in order; every control reachable by keyboard; visible focus; labels on all fields; error text connected to its field; images have alternative text (the editor asks for it); no information by colour alone; tap targets large enough on phones.

### 7.7 Content and tone
Plain English, short sentences, no jargon. Words that must be used consistently: **master** (the main record), **variant** (a page for one job), **application link** (a tracked link for one employer), **digest** (the weekly jobs email), **label** (the member's name for an application link).

---

## 8. Mapping to journeys and requirements

| Journey | Screens |
| --- | --- |
| J1 Join | M1, M2, M3, M4 |
| J2 Build and publish | M4, M5, M9, V2 |
| J3 Variant and link | M6, M7, M8, M9 |
| J4 Visitor opens link | V1, V3, V4, V5 |
| J5 Admin digest | A1, A3 to A6, M14 |
| J6 Member tailors | M14, M1, M7 |
| J7 Admin numbers | A2 |
| J8 Master edit | M5, M7 |
| J9 Suspension | A8, V5 |

All MVP requirements FR-1.1 to 3.7 have at least one screen. FR-1.5 (opens) has no screen, by design.

---

## 9. Outlines for later phases (no detail yet)

| Phase | Screens |
| --- | --- |
| 4 | Paste-a-job-ad and AI draft review; plans and upgrade; Paystack checkout and result; trial banners and countdown; read-only lapse banner; AI usage meter |
| 5 | Repeat-visit alert (email and in-app); who-checked-me detail per link; site diary (add entry, reminder preferences) |
| After gate | Recruiter search and contact; verification flows |

---

## 10. Open questions added by this document

| ID | Question | Proposal |
| --- | --- | --- |
| O-22 | Do non-lapsed members show a "Made with Sheetfolio" mark on shared pages? | PROPOSED: yes, small and removable on paid plans later |
| O-23 | When an application link points at a variant that was unpublished, show the main page, or an unavailable page? | PROPOSED: unavailable page, because the member chose to hide it |
| O-24 | Is there a web view of past digests, or email only? | PROPOSED: email only in the MVP |
| O-25 | Can a member change profession category later? What happens to the master and variants? | PROPOSED: yes, with a warning; sections that do not exist in the new format are kept hidden, not deleted |
| O-26 | When a member has no matches in a week, send a "nothing this week" note or skip? | PROPOSED: skip, and show a notice in M4 |
| O-27 | Which formats get a matching CV PDF, and when? | PROPOSED: after the gate |

---

## 11. Approval

- [ ] Design principles in §1
- [ ] Screen inventory in §2 is complete for the MVP
- [ ] Visitor screens (§3), member screens (§4) and admin screens (§5)
- [ ] Shared section library and per-format table (§6) accepted as a hypothesis
- [ ] Open questions O-22 to O-27 acknowledged
- [ ] Approved to start document 8 (architecture and ADRs)
