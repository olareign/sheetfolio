# Siteproof — Product Requirements Document

> Working name: **Siteproof** (formerly "realhole"). First profile: **Rasaq Idris Olawale**, Site Engineer.
> Owner: Olareign · Version 1.0 · 28 Sep 2026
> Companion file: `DESIGN_SYSTEM.md` (all visual rules, tokens and component CSS).

---

## 0. How to use this document (for Claude / builders)

- This PRD is the source of truth for **what** to build. `DESIGN_SYSTEM.md` is the source of truth for **how it looks**.
- Build in the phase order in §10. Finish each phase's acceptance criteria before starting the next.
- Do not add features listed under "Out of scope" (§3.6).
- Stack is fixed (§4). Do not introduce Postgres, Prisma, Supabase or any ORM. **Upstash Redis is the only datastore.**
- When a detail is missing, pick the simplest option consistent with this document and leave a `// TODO(product):` comment.

---

## 1. Overview

Siteproof gives every civil engineer a public portfolio page, managed from a CMS, that shows a client or employer their whole record at a glance.

### 1.1 Problem

- Site engineers' careers live in a two-page CV with one line per project and no photos.
- Clients and employers can't see the work, verify certifications, or reach the engineer quickly.
- Generic portfolio builders are made for designers and developers, not for people who supervise buildings and roads.

### 1.2 Goals

1. An engineer goes from signup to a published page in **under 30 minutes**.
2. A visitor sees who the engineer is, what they built and how to reach them **within 10 seconds** of landing.
3. The engineer edits every piece of content from a CMS **without touching code**.
4. The product ships as a **Next.js app on Upstash Redis in about five build days**.

---

## 2. Users and use cases

| User | Goal | Key actions |
| --- | --- | --- |
| Engineer (page owner) | Show their record and win work | Sign up, claim a slug, fill profile, add projects and photos, publish, read leads |
| Visitor: client or employer | Judge fit fast and make contact | Scan hero and figures, open projects, view certificates, download CV, WhatsApp or email |
| Platform admin (Olareign) | Keep the platform healthy | See all sites, suspend a site, view signups |

### 2.1 Core user stories

- As an engineer, I add a project with title, client, location, years, role, scope, category and photos, and see it on my page after I publish.
- As an engineer, I add a project before I have photos, and it still looks finished with a category placeholder.
- As an engineer, I control which private details (date of birth, marital status, state of origin, referee phones) are visible; **all are hidden by default**.
- As an engineer, I reorder projects and experience by drag and drop; the order in the CMS is the order on my page.
- As an engineer, I save drafts without affecting my live page, then publish when ready.
- As a visitor on a phone, I tap WhatsApp and get a chat with a pre-filled message naming the page I came from.
- As a visitor, I download a CV PDF that matches the page exactly.
- As an engineer, I see how many people viewed my page and each project this week.
- As an engineer, I read enquiries in a leads inbox even if the email notification was missed.

---

## 3. MVP scope

### 3.1 Public profile — `/[slug]`

Sections, top to bottom:

1. **Header bar** — monogram, name, sheet number `SP-000`, nav (Projects, Experience, Credentials), WhatsApp button (small CTA).
2. **Hero** (on drafting-grid background)
   - Label: discipline · base location · availability
   - Display name
   - Summary paragraph (lead style)
   - Buttons: **WhatsApp {FirstName}** (CTA), **Send an email** (primary), **Download CV** (secondary)
   - Dimension-line figures (max 3): years on site, project count, states worked — computed from data, never invented
   - Right column: **Title block** of key facts + up to 2 **stamps** (certifications)
3. **Projects** — heading, label "Drawing schedule · N sheets", category filter tags, 3-column grid of **project cards** (6 shown, "View all N sheets" button).
4. **Experience** — vertical "chainage" timeline; each role shows company, years, role and the projects delivered there. Current role marked with a safety-orange node.
5. **Credentials** — certification cards with stamp + "View certificate" link (if scan uploaded), education card, research card, then a 6-cell row of core competencies.
6. **Testimonials** — shown only if at least one exists.
7. **Contact** — always in the Blueprint (dark) theme; headline, WhatsApp + Download CV buttons, "References available on request", and the enquiry form (name, email, company/project, message).
8. **Footer** — "Rev. YYYY.MM · Last published DD Mon YYYY" and "Drawn on Siteproof".

Mobile (≤ 640px): single column, sections stacked, sticky bottom bar with **WhatsApp** (2/3 width) and **Call** (1/3).

### 3.2 Project detail — `/[slug]/projects/[id]`

- Breadcrumb `/ PROJECTS / SP-004`, "← All projects" link
- Category + status tags, display title, optional dimension figure (e.g. storeys)
- Full-width **title block**: Drawing no., Client, Contractor, Location, Role, Year
- Left (7/12): main image in crop marks (`FIG. 1`), thumbnail row (`FIG. 2…`), caption line
- Right (5/12): Scope of work, **spec table**, "Building something similar?" contact card
- Footer: previous / next project

### 3.3 CMS dashboard — `/dashboard`

- **Sidebar:** Siteproof logo, site slug, nav (Overview, Profile, Experience, Projects, Certifications, Education, Testimonials, Leads with unread badge, Settings) with item counts, 7-day views mini chart, "View site ↗".
- **Top bar:** breadcrumb, "Unpublished changes" status tag, "Draft saved HH:MM", **Preview**, **Publish** (primary).
- **Overview:** publish status, last published date, views this week, unread leads.
- **Profile editor:** all profile fields + a visibility toggle per private field.
- **Collection screens** (one generic list + form, driven by schemas): experiences, projects, certifications, education, testimonials, competencies, referees.
  - List: search, "+ New" (CTA), drag handle, drawing no./title/status per row, selected row outlined.
  - Form: generated from the Zod schema; project form includes photo dropzone (first photo = cover, max 12), featured toggle, delete.
- **Leads inbox:** list of enquiries, mark as read.
- **Settings:** slug, default theme, WhatsApp number, prefilled WhatsApp message, public email.

### 3.4 Contact

- **WhatsApp:** `https://wa.me/<number>?text=<encoded message>`; default message: `Hi {FirstName}, I saw your profile on Siteproof and would like to discuss a project.` No WhatsApp API.
- **Email:** contact form → server action → Resend email to the engineer **and** saved as a lead. Rate-limited to 5 per IP per hour.

### 3.5 Extras included in MVP

- **CV PDF** at `/api/cv/[slug]`, generated from the **published** site document, respecting visibility rules.
- **Views:** daily page counter + per-project counter.
- **Testimonials:** entered by the engineer.
- **Optional (if time):** project location map (Leaflet + OpenStreetMap) using `lat`/`lng`.

### 3.6 Out of scope for MVP

- Custom domains and subdomains
- CV upload with AI import (next phase)
- Payments or paid plans
- Testimonial request links for third parties
- Multiple editors per site
- Any SQL database

---

## 4. Architecture

Single Next.js app on Vercel; Upstash Redis is the content store.

```
Visitor ──▶ Public pages (/[slug], cached per slug tag) ──read──▶ site:{slug}:published
Visitor ──enquiry──▶ API routes (contact · upload · CV) ──write──▶ leads · views
Engineer ──▶ CMS dashboard (Zod forms, Server Actions) ──save──▶ site:{slug}:draft
CMS dashboard ──uploads──▶ Vercel Blob or Cloudinary
Publish = copy draft → published + revalidateTag(slug)
```

### 4.1 Stack (fixed)

| Concern | Choice |
| --- | --- |
| Framework | Next.js (App Router), TypeScript, Server Actions |
| Content store | Upstash Redis — `@upstash/redis` (JSON values) |
| Auth | Auth.js (NextAuth v5) magic link via Resend + `@auth/upstash-redis-adapter` |
| Validation | Zod |
| Forms | react-hook-form + `@hookform/resolvers/zod` |
| Reorder | dnd-kit |
| Files | Vercel Blob (default) or Cloudinary |
| Email | Resend |
| Rate limit | `@upstash/ratelimit` |
| PDF | `@react-pdf/renderer` |
| Styling | Siteproof design system: CSS variables + `sp-` classes (see `DESIGN_SYSTEM.md`). Tailwind optional for layout only; never override tokens. |
| Icons | lucide-react, 1.5px stroke |

### 4.2 Schema-driven CMS (the core idea)

Each content type is defined **once** as a Zod schema in `content/schemas.ts`. That one definition drives:

- the generated admin form (field type from Zod type, label from `.describe()`),
- server-side validation on save,
- the TypeScript types used by the public page.

```ts
// content/schemas.ts (shape, not final code)
export const collections = {
  experiences:    { label: "Experience",     schema: Experience,    sortable: true },
  projects:       { label: "Projects",       schema: Project,       sortable: true },
  certifications: { label: "Certifications", schema: Certification, sortable: true },
  education:      { label: "Education",      schema: Education,     sortable: true },
  testimonials:   { label: "Testimonials",   schema: Testimonial,   sortable: true },
  referees:       { label: "Referees",       schema: Referee,       sortable: true },
} as const;
```

The admin has **one** `<CollectionList>` and **one** `<ItemForm>` that render any collection. Adding a section later = adding one schema.

Field mapping for the form generator:

| Zod | Input |
| --- | --- |
| `z.string()` | text input |
| `z.string().describe("…textarea")` or `.max(>200)` | textarea |
| `z.number()` | number input (mono font) |
| `z.enum([...])` | select |
| `z.boolean()` | checkbox / toggle |
| `z.string().url()` for images | upload field |
| `z.array(Image)` | image list with dropzone + reorder + cover |
| `.optional()` | no required mark |

### 4.3 Publish flow

1. Every save writes `site:{slug}:draft` and sets `updatedAt`.
2. Top bar shows "Unpublished changes" when `draft.updatedAt > published.publishedAt`.
3. **Publish**: validate draft with the full `Site` schema → write to `site:{slug}:published` with `publishedAt = now` → `revalidateTag(slug)`.
4. Public pages use `unstable_cache`/fetch tags so they cost zero Redis reads until the next publish.

---

## 5. Data model

Each engineer's page is **one JSON site document**, stored twice: draft and published.

```ts
type Category =
  | "building" | "road" | "external-works" | "renovation"
  | "community" | "healthcare" | "institutional";

type Site = {
  profile: {
    name: string;              // "Rasaq Idris Olawale"
    firstName: string;         // "Idris" — used in CTAs
    headline: string;          // "Site Engineer"
    summary: string;
    location: string;          // "Akure, Ondo State"
    availability?: string;     // "Available for projects"
    yearsExperience: number;   // 7
    avatar?: string;
    whatsapp: string;          // E.164 digits, e.g. "2347033435818"
    whatsappMessage: string;
    phone?: string;
    publicEmail: string;
    private: {
      dateOfBirth?: string;
      placeOfBirth?: string;
      stateOfOrigin?: string;
      maritalStatus?: string;
      nationality?: string;
    };
    visibility: {
      dateOfBirth: boolean; placeOfBirth: boolean; stateOfOrigin: boolean;
      maritalStatus: boolean; nationality: boolean; referees: boolean;
    }; // ALL false by default
  };
  competencies: string[];      // max 6 shown
  experiences: {
    id: string; company: string; role: string;
    startYear: number; endYear?: number;   // no endYear = current
    notes?: string;
  }[];
  projects: {
    id: string;
    drawingNo: string;         // "SP-004", auto-assigned, editable
    title: string;
    client?: string;
    experienceId?: string;     // links project to employer
    location: string;
    lat?: number; lng?: number;
    category: Category;
    role: string;
    scope: string;
    startYear: number; endYear?: number;
    status: "completed" | "ongoing";
    images: { url: string; caption?: string; isCover: boolean }[]; // max 12
    featured: boolean;
  }[];
  certifications: { id: string; title: string; shortTitle: string; issuer: string; year: number; fileUrl?: string }[];
  education: { id: string; institution: string; qualification: string; startYear: number; endYear: number }[];
  research?: { title: string; year: number; summary: string };
  referees: { id: string; name: string; role: string; organisation?: string; phone?: string }[];
  testimonials: { id: string; author: string; role: string; company?: string; body: string }[];
  settings: { theme: "sheet" | "blueprint"; status: "draft" | "published" | "suspended" };
  updatedAt: string;
  publishedAt?: string;
};
```

Rules:

- **Array order is display order.**
- `drawingNo` auto-increments `SP-001`, `SP-002`… on create.
- Derived figures: years on site = `yearsExperience`; project count = `projects.length`; states worked = distinct state names parsed from `projects[].location` (engineer can override later — `TODO(product)`).

### 5.1 Upstash key design

| Key | Type | Holds | Written by |
| --- | --- | --- | --- |
| `user:{email}` | JSON | `{ id, slug, role: "engineer" \| "admin", name, createdAt }` | Signup |
| `slug:{slug}` | string | userId — set with `SET NX` so slugs are unique | Signup, slug change |
| `site:{slug}:draft` | JSON | Site document being edited | CMS saves |
| `site:{slug}:published` | JSON | Site document the public sees | Publish |
| `views:{slug}:{YYYY-MM-DD}` | counter | daily page views, 90-day TTL | Public page beacon |
| `views:{slug}:p:{projectId}` | counter | per-project views | Project page beacon |
| `leads:{slug}` | list | enquiries, newest first (`LPUSH` + `LTRIM 0 499`) | Contact form |
| `leads:{slug}:unread` | counter | unread count | Contact form / inbox |
| `sites` | set | every slug | Signup |
| Auth.js keys | adapter | sessions, verification tokens | Auth.js adapter |

Images and certificate scans live in Vercel Blob / Cloudinary; the document stores URLs only.

### 5.2 `lib/site.ts` (required functions)

```ts
getDraft(slug): Promise<Site | null>
saveDraft(slug, site: Site): Promise<void>          // validates, sets updatedAt
updateCollection(slug, name, items): Promise<void>  // replace one array
getPublished(slug): Promise<Site | null>            // cached, tagged by slug
publish(slug): Promise<void>                        // validate → copy → revalidateTag
claimSlug(slug, userId): Promise<boolean>           // SET NX
recordView(slug, projectId?): Promise<void>
addLead(slug, lead): Promise<void>
listLeads(slug, page): Promise<Lead[]>
```

---

## 6. Routes

| Route | Purpose | Rendering |
| --- | --- | --- |
| `/` | Product landing and signup | Static |
| `/login` | Magic-link sign-in | Dynamic |
| `/onboarding` | Claim slug, basic profile | Dynamic, auth |
| `/[slug]` | Public profile | Cached, tag `slug`, revalidated on publish |
| `/[slug]/projects/[id]` | Project detail | Cached, same tag |
| `/dashboard` | Overview | Dynamic, auth |
| `/dashboard/profile` | Profile + visibility | Dynamic, auth |
| `/dashboard/[collection]` | Generic list | Dynamic, auth |
| `/dashboard/[collection]/[id]` | Generic form (`new` for create) | Dynamic, auth |
| `/dashboard/leads` | Leads inbox | Dynamic, auth |
| `/dashboard/settings` | Site settings | Dynamic, auth |
| `/admin` | Platform admin: all sites, suspend | Dynamic, admin role |
| `/api/cv/[slug]` | CV PDF | Cached per publish |
| `/api/upload` | Signed image upload | Auth |
| `/api/view` | View beacon (POST) | Edge |

---

## 7. Folder structure

```
app/
  (public)/page.tsx                      # landing
  (public)/[slug]/page.tsx
  (public)/[slug]/projects/[id]/page.tsx
  (auth)/login/page.tsx
  (auth)/onboarding/page.tsx
  (admin)/dashboard/layout.tsx           # sidebar + top bar
  (admin)/dashboard/page.tsx
  (admin)/dashboard/profile/page.tsx
  (admin)/dashboard/[collection]/page.tsx
  (admin)/dashboard/[collection]/[id]/page.tsx
  (admin)/dashboard/leads/page.tsx
  (admin)/dashboard/settings/page.tsx
  (platform)/admin/page.tsx
  api/cv/[slug]/route.ts
  api/upload/route.ts
  api/view/route.ts
components/
  sp/                                    # design-system components (see DESIGN_SYSTEM.md)
    Button.tsx Tag.tsx Stamp.tsx TitleBlock.tsx DimensionLine.tsx
    ProjectCard.tsx SpecTable.tsx Field.tsx CropFrame.tsx Placeholder.tsx
  public/                                # page sections: Hero, Projects, Experience, Credentials, Contact
  cms/                                   # CollectionList, ItemForm, FieldRenderer, ImageList, PublishBar
content/schemas.ts                       # Zod schemas + collections registry
lib/redis.ts lib/site.ts lib/auth.ts lib/ratelimit.ts lib/whatsapp.ts lib/cv-pdf.tsx
styles/tokens.css styles/sp.css          # from DESIGN_SYSTEM.md
seed/idris.json                          # §9
scripts/seed.ts                          # writes seed into draft + published
```

### 7.1 Environment variables

```
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
AUTH_SECRET=
AUTH_RESEND_KEY=
RESEND_FROM="Siteproof <no-reply@yourdomain>"
BLOB_READ_WRITE_TOKEN=          # or CLOUDINARY_URL
NEXT_PUBLIC_SITE_URL=
ADMIN_EMAILS=                   # comma-separated
```

---

## 8. Non-functional requirements

- Public page loads in **< 1.5 s on a 4G phone**; images resized, lazy-loaded, blur placeholders.
- Public pages cost **zero Redis reads** while cached; views counted via `/api/view` beacon.
- Works at **360 px** width; every action reachable by keyboard; visible `focus-ring`.
- Text contrast ≥ **4.5:1** in both themes (tokens already meet this).
- Contact form rate-limited: **5 per IP per hour**.
- SEO: per-page `<title>` and description, Open Graph image from name + headline, `sitemap.xml` from the `sites` set.
- Lighthouse performance and accessibility ≥ 90 on the public page.

### 8.1 Privacy

- Date of birth, place of birth, state of origin, marital status, nationality and referee phone numbers are stored but **hidden by default**; each has its own visibility toggle.
- Referees default to "References available on request" (names hidden) — `TODO(product)`: confirm with engineer.
- The CV PDF follows the same visibility rules as the page.
- Unpublished and suspended sites return **404** to the public.
- Deleting a site removes every key under its slug and its uploaded files.

---

## 9. Seed data — Rasaq Idris Olawale

Use this to create `seed/idris.json`. Slug: `idris-rasaq`.

**Profile**
- Name: Rasaq Idris Olawale · First name: Idris · Headline: Site Engineer
- Location: Akure, Ondo State · Years: 7+ (use 7)
- Phone/WhatsApp: +234 703 343 5818 · Email: Ridrisolawale@gmail.com
- Summary: "Site Engineer with over seven years of experience delivering building, road, and community infrastructure projects across public and private sectors in Nigeria. Proven record supervising construction works from mobilisation to handover including a 3-storey healthcare facility, institutional buildings, health centres, classrooms, and rural community projects. Certified in Health, Safety and Environment (HSE) management, with strong skills in site supervision, quality control, and coordination between contractors, consultants, and host communities."
- Private (hidden): DOB 29 Aug 1992 · Place of birth Ile-Ife · State of origin Osun (Iwo LGA) · Nationality Nigerian · Married

**Competencies**
1. Site supervision & project execution
2. HSE compliance on site
3. Quality control & works inspection
4. Stakeholder coordination
5. Planning & progress reporting
6. Workforce management

**Experience**

| # | Company | Role | Years |
| --- | --- | --- | --- |
| 1 | IJUNT Construction Limited | Site Engineer | 2026 – now |
| 2 | Samkey Engineering Co. Ltd | Site Engineer | 2026 |
| 3 | BOLAJI Construction Company | Site Engineer | 2024 |
| 4 | Eniot and Co. Ltd | Site Engineer | 2019 – 2022 |
| 5 | Ministry of Works and Infrastructure, Ondo State | Corps Member (Planning Dept.) | 2019 – 2020 |
| 6 | Dortmund and Company Limited | Site Engineer | 2016 – 2017 |

**Projects** (status of 2026 projects assumed "ongoing" — confirm)

| No. | Title | Employer | Location | Category | Years | Status |
| --- | --- | --- | --- | --- | --- | --- |
| SP-001 | School of Agriculture & Agricultural Technology, FUTA | IJUNT | Akure, Ondo | institutional | 2026 | ongoing |
| SP-002 | Nigeria Customs canteen | Samkey | Enugu | building | 2026 | ongoing |
| SP-003 | School of Information and Communication Technology | Samkey | [LOCATION] | institutional | 2026 | ongoing |
| SP-004 | 3-storey Geriatric Centre, LUTH | Bolaji | Surulere, Lagos | healthcare | 2024 | completed |
| SP-005 | External works, Senate Building, Rufus Giwa Polytechnic | Eniot | Owo, Ondo | external-works | 2020–2021 | completed |
| SP-006 | Basic Health Centres, Ilu-Tuntun & Ifelodun | Eniot | Akure, Ondo | healthcare | 2022 | completed |
| SP-007 | Renovation of 3-classroom block, Ilaje Secondary School | Eniot | Ilaje, Ondo | renovation | 2022 | completed |
| SP-008 | Community development projects (Atosin, Edu/Oka, Oddo, Isaoye, Oluwafemi, Abalaka/Batedo) | Eniot | Idanre, Akure North & South | community | 2020–2021 | completed |
| SP-009 | Departmental road construction | Dortmund | [LOCATION] | road | 2016–2017 | completed |

All projects: `images: []` (photos pending), `role: "Site Engineer"`.

**Certifications**
- Health, Safety and Environment Management (HSEP) · short: "HSE" · International Institute of Project and Safety Management · 2020

**Education**
- B.Tech, Engineering · Ladoke Akintola University of Technology (LAUTECH) · 2012–2018
- SSCE · Federal Science and Technical College · 2004–2010

**Research**
- 2018 · "Treatment of galvanised wastewater using activated cow-bone ash as an adsorbent, modified with silver nanoparticles."

**Referees** (visibility off)
- Engr. Sogo Ogundowole — Head of Works and Services, Federal Polytechnic Ile-Oluji — 0806 006 2556
- Akinpelu-Yusuf Ayomide Yidiat — System Administrator, Afe Babalola University, Ado-Ekiti — 0703 987 7853
- Engr. Adeniyi Owolabi — ENLG Engineering Ltd — 0806 225 3706

---

## 10. Build plan (5 days)

### Day 1 — Foundation
- Next.js app, TypeScript, `styles/tokens.css` + `styles/sp.css` from `DESIGN_SYSTEM.md`, fonts via `next/font/google`.
- `lib/redis.ts`, Auth.js magic link (Resend) with Upstash adapter.
- `/onboarding`: claim slug with `SET NX`, create empty draft.
- `lib/site.ts` with all functions in §5.2.
- **Done when:** a user can sign in, claim a slug, and `getDraft` returns an empty valid Site.

### Day 2 — CMS
- `content/schemas.ts` with every schema + registry.
- Dashboard layout (sidebar, top bar with Publish), generic `CollectionList` + `ItemForm` + `FieldRenderer`.
- Profile editor with visibility toggles; drag reorder (dnd-kit); image upload via `/api/upload`.
- **Done when:** every collection can be created, edited, reordered, deleted, and Publish copies draft → published.

### Day 3 — Public pages
- All sections of §3.1 and the project page §3.2, using `sp-` components.
- Category placeholders when `images` is empty; both themes; mobile layout + sticky bar.
- **Done when:** seeded Idris page matches the UI sample at 1440 px and 390 px.

### Day 4 — Contact and extras
- WhatsApp link builder, contact form server action + rate limit + Resend + lead storage, leads inbox, unread badge.
- View beacon + dashboard counters + 7-day mini chart.
- CV PDF from the published document.
- **Done when:** an enquiry arrives by email and in the inbox; CV PDF downloads and hides private fields.

### Day 5 — Polish
- `scripts/seed.ts` with §9 data, testimonials section, SEO + OG image + sitemap, `/admin` (list + suspend), map if time allows.
- **Done when:** Lighthouse ≥ 90 perf/a11y, and all §11 metrics can be checked.

---

## 11. Success metrics

- Idris's page published with all 9 project entries and his HSE certificate.
- Signup to first publish < 30 minutes for a new engineer.
- Lighthouse performance and accessibility ≥ 90 on the public page.
- At least one real enquiry reaches Idris through WhatsApp or email in the first month.

## 12. Open questions

- [ ] Final product name and domain (Siteproof is a working name).
- [ ] Images on Vercel Blob or Cloudinary?
- [ ] Does Idris hold COREN registration or other certificates beyond HSEP?
- [ ] Referees: names only publicly, or fully private with "available on request"?
- [ ] Locations for SP-003 and SP-009, and confirmed status of the 2026 projects.