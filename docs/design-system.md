# Sheetfolio — Design System

> Companion to `PRD.md`. This file is the source of truth for every visual decision.
> Copy §3 into `styles/tokens.css` and §6 into `styles/sp.css` verbatim.

---

## 0. Rules for builders (read first)

1. **Use tokens, never raw hex.** Every colour, space and radius comes from a CSS variable in §3.
2. **Square corners.** `radius-0` everywhere except inputs/tags (`radius-sm`) and stamps/markers (`radius-round`).
3. **Borders, not shadows.** The only shadow is `--shadow-lift` on hovered project cards. No blur, no gradients.
4. **One safety-orange CTA per view.** `--hivis` is for the contact action, the focus ring and "Ongoing" status only.
5. **Status always has a word.** Colour is never the only signal.
6. **Mono uppercase is for labels only** (drawing labels, tags, stamps, field labels). Body and headings are sentence case.
7. **No emoji, no exclamation marks, no invented numbers.**
8. Fonts: Archivo (display), IBM Plex Sans (text), IBM Plex Mono (annotations). Never Inter/Roboto/Arial as the design face.

---

## 1. Concept

Sheetfolio presents a civil engineer's career the way the profession presents a building: **as a set of drawings.** Every page reads like a sheet from a construction drawing set: drafting paper, a title block, dimension lines, drawing numbers and approval stamps. A client or employer recognises the language of the work before they read a word.

### Principles

- **The page is a drawing sheet.** Square corners, hairline rules, a faint drafting grid.
- **Annotate, don't decorate.** Metadata (client, location, year, drawing number) is set in mono, the way notes are lettered on a drawing.
- **Evidence first.** Projects and certificates are the content; everything else frames them. A project with no photo still looks deliberate.
- **One safety-orange call to action per view.**

### Signature elements

| Element | Meaning | Used for |
| --- | --- | --- |
| Title block | The info panel on every drawing sheet | Profile key facts, project header |
| Dimension line | A length marked between two ticks | Key figures (years, project count) |
| Crop marks | Corner marks on a printed drawing | Frame every project image |
| Stamp | An approval stamp | Certifications, qualifications |
| Drawing number `SP-000` | Sheet reference | Profile = `SP-000`; projects = `SP-001…` |
| Drafting grid | Graph paper | Hero and contact backgrounds |
| Chainage | Distance markers along a road | Experience timeline |

---

## 2. Content voice

- Voice: factual, third person on public pages ("Supervised construction of…"); second person in the CMS ("Add your first project").
- Sentence case for headings and body. UPPERCASE only in `label` style.
- Numbers are figures: "7+ years", "3-storey", "9 sheets".
- CTAs name the engineer: "WhatsApp Idris", not "Contact".
- Section labels use drawing language:

| Section | Label above heading |
| --- | --- |
| Projects | `DRAWING SCHEDULE · 9 SHEETS` |
| Experience | `CHAINAGE · 2016 → 2026` |
| Credentials | `APPROVALS & QUALIFICATIONS` |
| Contact | `ISSUED FOR ENQUIRY` |
| Footer | `REV. 2026.09 · LAST PUBLISHED 28 SEP 2026` |

- Private details never render unless the engineer turns on that field's visibility. Referees default to "References available on request."

---

## 3. Tokens — `styles/tokens.css`

Two themes. **Drawing sheet** (default, light) and **Blueprint** (dark). Apply with `data-theme` on `<html>` or any section (the Contact section is always `data-theme="blueprint"`).

```css
/* styles/tokens.css */
:root,
[data-theme="sheet"] {
  --paper:        #f3f0e8; /* page ground: drafting paper */
  --paper-raised: #fbfaf6; /* cards, title blocks, panels */
  --paper-sunken: #e9e5da; /* image wells, placeholders, table headers */
  --ink:          #18212c; /* body + headings (≥11:1) */
  --ink-muted:    #4f5966; /* metadata, captions (≥6.2:1) */
  --rule:         #8f887a; /* meaningful borders (≥3:1) */
  --hairline:     #d8d2c4; /* decorative dividers only */
  --grid:         #e4dfd3; /* drafting grid lines */
  --blueprint:    #1d4f7c; /* brand: primary buttons, links, dimension lines */
  --on-blueprint: #ffffff;
  --hivis:        #e8610f; /* safety orange: CTA fill, focus ring, ongoing */
  --on-hivis:     #0f141a; /* text on hivis — never white */
  --hivis-ink:    #a8400a; /* orange as text: stamps, required marks */
  --cured:        #2b6242; /* completed status */
  --concrete:     #9aa0a4; /* placeholder line drawings */
  --focus-ring:   var(--hivis);
  --shadow-lift:  4px 4px 0 #18212c;
}

[data-theme="blueprint"] {
  --paper:        #0e2740;
  --paper-raised: #14344f;
  --paper-sunken: #0a1f34;
  --ink:          #e9eff6;
  --ink-muted:    #a8bbd1;
  --rule:         #5d7ea3;
  --hairline:     #224667;
  --grid:         #16395a;
  --blueprint:    #8cc3ff;
  --on-blueprint: #0b1e33;
  --hivis:        #ff8c42;
  --on-hivis:     #1a0e05;
  --hivis-ink:    #ffa368;
  --cured:        #7fd1a3;
  --concrete:     #6d8299;
  --focus-ring:   var(--hivis);
  --shadow-lift:  4px 4px 0 #8cc3ff;
}

:root {
  /* spacing — 4px base */
  --space-1: 4px;   --space-2: 8px;   --space-3: 12px;  --space-4: 16px;
  --space-6: 24px;  --space-8: 32px;  --space-12: 48px; --space-16: 64px;

  /* radius */
  --radius-0: 0px;      /* default: cards, buttons, images */
  --radius-sm: 2px;     /* inputs, tags */
  --radius-round: 50%;  /* stamps, markers */

  /* fonts (set by next/font variables, with fallbacks) */
  --font-display: var(--font-archivo, "Archivo"), "Arial Narrow", sans-serif;
  --font-sans:    var(--font-plex-sans, "IBM Plex Sans"), system-ui, sans-serif;
  --font-mono:    var(--font-plex-mono, "IBM Plex Mono"), ui-monospace, monospace;
}
```

### 3.1 Colour usage

| Pairing | Use |
| --- | --- |
| `--ink` on `--paper` / `--paper-raised` | All body text and headings |
| `--ink-muted` on `--paper` / `--paper-raised` | Metadata, captions, hints |
| `--on-blueprint` on `--blueprint` | Primary buttons |
| `--on-hivis` on `--hivis` | CTA (WhatsApp / contact) — one per view |
| `--hivis-ink` | Stamp text, required `*`, "Ongoing" word, destructive text |
| `--cured` | "Completed" word, education stamp |
| `--rule` | Input borders, button borders, table rules, title-block cells |
| `--hairline` | Decorative dividers only |

### 3.2 Contrast (verified)

| Pair | Sheet | Blueprint |
| --- | --- | --- |
| ink / paper | 14.3 | 13.1 |
| ink-muted / paper | 6.2 | 7.7 |
| blueprint / paper | 7.5 | 8.2 |
| hivis-ink / paper | 5.4 | 7.7 |
| cured / paper | 6.3 | 8.4 |
| on-blueprint / blueprint | 8.5 | 9.1 |
| on-hivis / hivis | 5.4 | 8.2 |
| rule / paper | 3.1 | 3.6 |

---

## 4. Typography

Load with `next/font/google`:

```ts
// app/fonts.ts
import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
export const archivo  = Archivo({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-archivo" });
export const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex-sans" });
export const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });
```

| Style | Family | Size / line-height | Weight | Extra | Use |
| --- | --- | --- | --- | --- | --- |
| `display-xl` | display | 96 / 0.92 (mobile 52) | 800 | tracking −0.015em | Profile name in hero (one per page) |
| `display-lg` | display | 64 / 0.95 (mobile 36) | 800 | tracking −0.01em | Project detail title |
| `heading` | display | 44 / 1.0 (mobile 34) | 800 | — | Section headings |
| `card-title` | display | 18 / 1.25 | 700 | — | Project card titles |
| `lead` | sans | 19 / 1.55 (mobile 16) | 400 | — | Hero summary |
| `body` | sans | 16 / 1.6 | 400 | — | Running text |
| `body-strong` | sans | 16–18 / 1.3 | 600 | — | Company names, card headings |
| `label` | mono | 11 / 1.3 | 500 | uppercase, tracking 0.12em | Drawing labels, tags, field labels |
| `annotation` | mono | 13 / 1.4 | 400 | sentence case | Location · year · client |
| `figure` | mono | 32 / 1.0 (mobile 28) | 600 | — | Dimension-line numbers |

---

## 5. Layout

- **Desktop:** content width 1280 (1440 frame, 80 px side padding), 12-column grid, 24 px gutters.
- **Mobile:** 16 px gutters, single column, sticky bottom action bar (height 68).
- **Section spacing:** 80 px vertical padding desktop, 40 px mobile; sections separated by a 1 px `--rule` line.
- **Drafting grid:** 32 px pitch (`--space-8`), lines in `--grid`. Hero and Contact only.
- **Breakpoints:** `sm 640`, `md 900`, `lg 1200`.

### 5.1 Page layouts

**Public profile (desktop 1440)**
```
┌ Header 64: monogram · NAME · / SHEET SP-000 ........ PROJECTS EXPERIENCE CREDENTIALS [WhatsApp] ┐
├ Hero 660 (grid bg): 7fr left | 5fr right ─────────────────────────────────────────────────────┤
│  ■ SITE ENGINEER · AKURE, ONDO STATE · AVAILABLE      │  ┌ Title block (3 cols) ───────────┐   │
│  Rasaq Idris                                          │  │ Engineer │ Discipline │ Sheet   │   │
│  Olawale                   (display-xl)               │  │ Base     │ Qualific.  │ Rev.    │   │
│  Summary paragraph (lead, max 620)                    │  │ Scope of work (wide)            │   │
│  [WhatsApp Idris] [Send an email] [Download CV]       │  │ Current (wide)                  │   │
│  |—7+—|  |—9—|  |—3—|  dimension figures              │  └──────────────────── (HSE stamp) ┘   │
├ Projects: label + heading | filter tags → 3-col card grid (6) → [View all 9 sheets] ─────────────┤
├ Experience: 4fr intro | 8fr chainage timeline (6 stations) ──────────────────────────────────────┤
├ Credentials: 3 cards (HSE stamp · B.Tech stamp · Research) → 6-cell competencies row ────────────┤
├ Contact (blueprint theme, grid bg): 5fr headline + CTAs | 7fr enquiry form ──────────────────────┤
└ Footer 64: REV. · LAST PUBLISHED ............................................ DRAWN ON SHEETFOLIO ┘
```

**Project detail:** header → grid-bg header (← All projects, tags, display-lg title, storey dimension, 6-col title block) → body 7fr gallery (FIG. 1 16:10 + 4 thumbs) | 5fr scope + spec table + contact card → prev/next footer (2 cols, 88 px).

**CMS dashboard:** 248 px sidebar | main. Main = 64 px top bar + two panes: 460 px list (search, + New, rows) | editor form (3-col field grid, photos dropzone, actions).

---

## 6. Component CSS — `styles/sp.css`

```css
/* styles/sp.css — Sheetfolio components. Requires tokens.css. */
.sp-root, .sp-root * { box-sizing: border-box; }
.sp-root { font-family: var(--font-sans); color: var(--ink); background: var(--paper); }

.sp-grid-bg {
  background-color: var(--paper);
  background-image:
    linear-gradient(var(--grid) 1px, transparent 1px),
    linear-gradient(90deg, var(--grid) 1px, transparent 1px);
  background-size: var(--space-8) var(--space-8);
}
.sp-label { font-family: var(--font-mono); font-size: 11px; line-height: 1.3; font-weight: 500; letter-spacing: .12em; text-transform: uppercase; color: var(--ink-muted); }
.sp-annot { font-family: var(--font-mono); font-size: 13px; line-height: 1.4; color: var(--ink-muted); }

/* Button */
.sp-btn { display: inline-flex; align-items: center; gap: var(--space-2); height: 44px; padding: 0 var(--space-4);
  font: 600 14px/1 var(--font-sans); letter-spacing: .01em; border: 1px solid var(--rule); border-radius: var(--radius-0);
  background: var(--paper-raised); color: var(--ink); cursor: pointer; text-decoration: none; transition: transform .12s, box-shadow .12s; }
.sp-btn:hover { transform: translate(-2px,-2px); box-shadow: 2px 2px 0 var(--ink); }
.sp-btn:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.sp-btn--primary { background: var(--blueprint); color: var(--on-blueprint); border-color: var(--blueprint); }
.sp-btn--cta { background: var(--hivis); color: var(--on-hivis); border-color: var(--hivis); }
.sp-btn--ghost { background: transparent; border-color: transparent; }
.sp-btn--sm { height: 32px; padding: 0 var(--space-3); font-size: 13px; }
.sp-btn:disabled { opacity: .5; cursor: not-allowed; transform: none; box-shadow: none; }

/* Tag */
.sp-tag { display: inline-flex; align-items: center; gap: 6px; padding: 4px var(--space-2); border: 1px solid var(--rule);
  border-radius: var(--radius-sm); font: 500 11px/1.2 var(--font-mono); letter-spacing: .1em; text-transform: uppercase; color: var(--ink); background: var(--paper-raised); text-decoration: none; }
.sp-tag::before { content: ""; width: 6px; height: 6px; background: var(--concrete); }
.sp-tag--active { background: var(--ink); color: var(--paper); border-color: var(--ink); }
.sp-tag--done { color: var(--cured); } .sp-tag--done::before { background: var(--cured); border-radius: 50%; }
.sp-tag--ongoing { color: var(--hivis-ink); } .sp-tag--ongoing::before { background: var(--hivis); border-radius: 50%; }

/* Stamp */
.sp-stamp { width: 112px; height: 112px; border-radius: var(--radius-round); border: 2px solid var(--hivis-ink); color: var(--hivis-ink);
  display: grid; place-items: center; text-align: center; position: relative; transform: rotate(-8deg); background: transparent; }
.sp-stamp::after { content: ""; position: absolute; inset: 6px; border-radius: 50%; border: 1px solid var(--hivis-ink); }
.sp-stamp b { display: block; font: 700 15px/1 var(--font-display); letter-spacing: .06em; text-transform: uppercase; }
.sp-stamp small { display: block; margin-top: 4px; font: 500 9px/1.2 var(--font-mono); letter-spacing: .14em; text-transform: uppercase; }
.sp-stamp--cured { border-color: var(--cured); color: var(--cured); } .sp-stamp--cured::after { border-color: var(--cured); }

/* Title block */
.sp-titleblock { display: grid; grid-template-columns: 2fr 1fr 1fr; border: 1px solid var(--rule); background: var(--paper-raised); }
.sp-titleblock > div { padding: var(--space-3); border-right: 1px solid var(--rule); border-bottom: 1px solid var(--rule); min-width: 0; }
.sp-titleblock > div:nth-child(3n) { border-right: 0; }
.sp-titleblock > .sp-tb-wide { grid-column: 1 / -1; border-right: 0; }
.sp-titleblock .sp-label { display: block; margin-bottom: 4px; }
.sp-tb-val { font: 600 15px/1.3 var(--font-sans); color: var(--ink); }
.sp-tb-mono { font: 500 15px/1.3 var(--font-mono); color: var(--blueprint); }
@media (max-width: 640px) { .sp-titleblock { grid-template-columns: 1fr 1fr; } .sp-titleblock > div:nth-child(3n) { border-right: 1px solid var(--rule); } .sp-titleblock > div:nth-child(2n) { border-right: 0; } }

/* Dimension line */
.sp-dim { display: inline-flex; flex-direction: column; align-items: stretch; min-width: 140px; color: var(--blueprint); }
.sp-dim-fig { font: 600 32px/1 var(--font-mono); text-align: center; color: var(--ink); }
.sp-dim-line { position: relative; height: 12px; margin: 6px 0 4px; }
.sp-dim-line::before { content: ""; position: absolute; left: 0; right: 0; top: 50%; border-top: 1px solid currentColor; }
.sp-dim-line i { position: absolute; top: 0; bottom: 0; width: 0; border-left: 1px solid currentColor; }
.sp-dim-line i:first-child { left: 0; } .sp-dim-line i:last-child { right: 0; }
.sp-dim-line i::after { content: ""; position: absolute; top: 2px; left: -4px; width: 8px; height: 8px; border-top: 1px solid currentColor; transform: rotate(-45deg); }
.sp-dim-cap { text-align: center; }

/* Project card */
.sp-card { display: block; background: var(--paper-raised); border: 1px solid var(--rule); color: var(--ink); text-decoration: none; transition: transform .12s, box-shadow .12s; }
.sp-card:hover { transform: translate(-4px,-4px); box-shadow: var(--shadow-lift); }
.sp-card:focus-visible { outline: 2px solid var(--focus-ring); outline-offset: 2px; }
.sp-card-body { padding: 0 var(--space-4) var(--space-4); }
.sp-card-title { font: 700 18px/1.25 var(--font-display); margin: 0 0 6px; }
.sp-card-meta { display: flex; justify-content: space-between; gap: var(--space-2); align-items: center; margin-top: var(--space-3); padding-top: var(--space-3); border-top: 1px solid var(--hairline); }

/* Crop frame (images + placeholders) */
.sp-crop { position: relative; margin: var(--space-3); aspect-ratio: 4 / 3; background: var(--paper-sunken); overflow: hidden; }
.sp-crop img, .sp-crop svg { display: block; width: 100%; height: 100%; object-fit: cover; }
.sp-crop::before, .sp-crop::after, .sp-crop > .sp-crop-b::before, .sp-crop > .sp-crop-b::after { content: ""; position: absolute; width: 14px; height: 14px; border: 0 solid var(--ink); z-index: 1; }
.sp-crop::before { top: 6px; left: 6px; border-top-width: 1.5px; border-left-width: 1.5px; }
.sp-crop::after { top: 6px; right: 6px; border-top-width: 1.5px; border-right-width: 1.5px; }
.sp-crop > .sp-crop-b::before { bottom: 6px; left: 6px; border-bottom-width: 1.5px; border-left-width: 1.5px; }
.sp-crop > .sp-crop-b::after { bottom: 6px; right: 6px; border-bottom-width: 1.5px; border-right-width: 1.5px; }
.sp-crop-no { position: absolute; right: 8px; bottom: 8px; z-index: 1; background: var(--paper-raised); padding: 2px 6px; font: 500 10px/1.3 var(--font-mono); letter-spacing: .1em; color: var(--ink); border: 1px solid var(--rule); }
.sp-crop-pending { position: absolute; left: 50%; bottom: 34px; transform: translateX(-50%); z-index: 1; white-space: nowrap; font: 500 10px/1 var(--font-mono); letter-spacing: .16em; color: var(--ink-muted); }

/* Spec table */
.sp-spec { width: 100%; border-collapse: collapse; border: 1px solid var(--rule); background: var(--paper-raised); }
.sp-spec th, .sp-spec td { text-align: left; padding: 10px var(--space-3); border-bottom: 1px solid var(--hairline); vertical-align: top; }
.sp-spec th { width: 36%; font: 500 11px/1.4 var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-muted); background: var(--paper-sunken); border-right: 1px solid var(--rule); }
.sp-spec td { font: 400 15px/1.45 var(--font-sans); }

/* Field (CMS + contact form) */
.sp-field { display: grid; gap: 6px; }
.sp-field label { font: 500 11px/1.3 var(--font-mono); letter-spacing: .12em; text-transform: uppercase; color: var(--ink-muted); }
.sp-field label em { color: var(--hivis-ink); font-style: normal; }
.sp-input { height: 42px; padding: 0 var(--space-3); border: 1px solid var(--rule); border-radius: var(--radius-sm); background: var(--paper-raised); color: var(--ink); font: 400 15px/1 var(--font-sans); width: 100%; }
textarea.sp-input { height: auto; min-height: 96px; padding: 10px var(--space-3); line-height: 1.5; resize: vertical; }
.sp-input:focus { outline: 2px solid var(--focus-ring); outline-offset: 1px; }
.sp-input[aria-invalid="true"] { border-color: var(--hivis-ink); }
.sp-field-hint { font: 400 12px/1.4 var(--font-mono); color: var(--ink-muted); }
.sp-field-error { font: 400 12px/1.4 var(--font-mono); color: var(--hivis-ink); }

/* Timeline (chainage) */
.sp-chainage { display: flex; flex-direction: column; border-left: 1px solid var(--rule); margin-left: 8px; }
.sp-station { position: relative; padding: 0 0 28px 40px; }
.sp-station:last-child { padding-bottom: 0; }
.sp-station::before { content: ""; position: absolute; left: -9px; top: 4px; width: 16px; height: 16px; border: 1.5px solid var(--blueprint); background: var(--paper); border-radius: 50%; }
.sp-station--current::before { border-color: var(--hivis); }
.sp-station--service::before { border-color: var(--rule); }

@media (prefers-reduced-motion: reduce) { .sp-btn, .sp-card { transition: none; } }
```

---

## 7. Components — API and markup

Build each as a React component in `components/sp/`. Props below are the contract.

### 7.1 Button
```tsx
<Button variant="cta" | "primary" | "default" | "ghost" size="md" | "sm" href? icon?>WhatsApp Idris</Button>
```
- `cta`: the single contact action per view. `primary`: main navigation/Publish. `default`: secondary (Download CV, Save draft). `ghost`: tertiary (Cancel, Delete in `--hivis-ink`).
- Renders `<a>` when `href`, else `<button type="button">`. Icon-only needs `aria-label`.

### 7.2 Tag
```tsx
<Tag tone="default" | "done" | "ongoing" | "active">Healthcare</Tag>
```
Categories: Building, Road, External works, Renovation, Community, Healthcare, Institutional. Status words: Completed, Ongoing.

### 7.3 Stamp
```tsx
<Stamp title="HSE" sub="Certified · 2020" tone="hivis" | "cured" size={112} href?={certificateUrl} />
```
Title ≤ 7 characters. `hivis` for certifications, `cured` for education. Max 2 in the hero.

### 7.4 TitleBlock
```tsx
<TitleBlock cells={[
  { label: "Engineer", value: "Rasaq, Idris Olawale" },
  { label: "Discipline", value: "Site Engineer" },
  { label: "Sheet", value: "SP-000", mono: true },
  { label: "Scope of work", value: "Buildings · Roads · …", wide: true },
]} columns={3} />
```
```html
<div class="sp-titleblock">
  <div><span class="sp-label">Engineer</span><div class="sp-tb-val">Rasaq, Idris Olawale</div></div>
  <div><span class="sp-label">Sheet</span><div class="sp-tb-mono">SP-000</div></div>
  <div class="sp-tb-wide"><span class="sp-label">Scope of work</span><div class="sp-tb-val">…</div></div>
</div>
```
"Rev." cell = last publish date as `YYYY.MM`.

### 7.5 DimensionLine
```tsx
<DimensionLine figure="7+" caption="Years on site" />
```
```html
<div class="sp-dim"><div class="sp-dim-fig">7+</div><div class="sp-dim-line"><i></i><i></i></div><div class="sp-label sp-dim-cap">Years on site</div></div>
```
Max 3–4 in a row; figures must come from data.

### 7.6 ProjectCard
```tsx
<ProjectCard project={p} href={`/${slug}/projects/${p.id}`} />
```
```html
<a class="sp-card" href="…">
  <div class="sp-crop"><span class="sp-crop-b"></span>
    <img src="cover.jpg" alt="…">            <!-- or <Placeholder category="healthcare" /> -->
    <span class="sp-crop-pending">PHOTOS PENDING</span>  <!-- only when no images -->
    <span class="sp-crop-no">SP-004</span>
  </div>
  <div class="sp-card-body">
    <h3 class="sp-card-title">3-storey Geriatric Centre, LUTH</h3>
    <div class="sp-annot">Bolaji Construction · Surulere, Lagos</div>
    <div class="sp-card-meta"><span class="sp-tag">Healthcare</span><span class="sp-tag sp-tag--done">Completed</span><span class="sp-annot">2024</span></div>
  </div>
</a>
```
Grid: 3 cols desktop, 2 tablet, 1 mobile, 24 px gap.

### 7.7 SpecTable
```tsx
<SpecTable rows={[["Client", "Lagos University Teaching Hospital"], ["Role", "Site Engineer"]]} />
```
Skip empty rows. Max 8 rows.

### 7.8 Field
```tsx
<Field label="Project title" required hint="Shown on the project page" error?>
  <input className="sp-input" />
</Field>
```
Generated by the CMS `FieldRenderer` from Zod schemas. Error text replaces the hint in `--hivis-ink`.

### 7.9 Chainage (experience timeline)
```html
<div class="sp-chainage">
  <div class="sp-station sp-station--current">…IJUNT Construction · 2026 — now…</div>
  <div class="sp-station">…</div>
  <div class="sp-station sp-station--service">…NYSC…</div>
</div>
```

---

## 8. Placeholders (no photos yet)

Every project without images shows a line drawing on `--paper-sunken`, stroke `--concrete` 2px, plus the label `PHOTOS PENDING`. Healthcare adds an accent cross in `--hivis`. `viewBox="0 0 400 300"`, `preserveAspectRatio="xMidYMid slice"`, `aria-hidden="true"`.

```tsx
// components/sp/Placeholder.tsx — path data per category
export const PLACEHOLDER_PATHS: Record<Category, string[]> = {
  building:        ["M60 240h280M90 240V130h220v110M78 130h244", "M100 130l20-30h160l20 30", "M114 156h52v34h-52zM234 156h52v34h-52z", "M180 240v-70h40v70"],
  institutional:   ["M30 240h340M50 240V130h300v110", "M40 130h320l-24-34H64z", "M80 130v110M120 130v110M160 130v110M240 130v110M280 130v110M320 130v110", "M176 240v-60h48v60"],
  healthcare:      ["M50 240h300M90 240V100h220v140", "M90 146h220M90 192h220", "M116 112h28v24h-28zM160 112h28v24h-28zM212 112h28v24h-28zM256 112h28v24h-28zM116 158h28v24h-28zM256 158h28v24h-28zM116 204h28v24h-28zM256 204h28v24h-28z", "M176 240v-40h48v40"],
  "external-works":["M140 70h120v84H140z", "M60 186h280M60 234h280", "M186 154v32M214 154v32"],  // + dashed centreline M60 210h280, trees as circles
  renovation:      ["M80 250V140h240v110M60 250h280", "M80 140l120-40 120 40", "M70 250V120M330 250V120M70 170h260M70 210h260"],
  community:       ["M40 240h320", "M60 240v-70l50-36 50 36v70M70 200h24v40H70z", "M170 240v-86l60-40 60 40v86M214 190h32v50h-32z", "M300 240v-56l36-26 36 26v56"],
  road:            ["M30 190l60-20h220l60 20", "M30 190v20h340v-20"],  // + dashed centreline M90 170h220
};
// healthcare accent (stroke var(--hivis)): "M186 150h28v8h8v12h-8v8h-28v-8h-8v-12h8z"
```

---

## 9. Iconography

- **lucide-react**, `strokeWidth={1.5}`, size 18–20, colour `currentColor` (inherits `--ink` / button text).
- Common: `message-circle` (WhatsApp), `mail`, `download` (CV), `phone`, `upload`, `grip-vertical` (drag), `plus`, `external-link`, `menu`.
- No filled icons, no emoji, no WhatsApp brand logo — use the word "WhatsApp" with `message-circle`.

---

## 10. Interaction and motion

- Hover: buttons shift `-2px,-2px` with a 2px hard offset; cards shift `-4px,-4px` with `--shadow-lift`. 120 ms.
- Dimension lines may draw in once on first view (scale-x 0 → 1, 400 ms). Disable under `prefers-reduced-motion`.
- Focus: `2px solid var(--focus-ring)`, offset 2px, on every interactive element.
- Touch targets ≥ 44 px.

---

## 11. CMS-specific patterns

- Sidebar nav items: mono uppercase 12px, 40 px tall; active item = `--paper` background + 3px left border in `--hivis`. Item counts right-aligned; Leads count as a `--hivis` badge with `--on-hivis` text.
- Status in top bar: `Unpublished changes` as `sp-tag--ongoing`; `Live` as `sp-tag--done`.
- List rows: grid `20px 64px 1fr 110px` (drag · drawing no. · title · status); selected row = `outline: 1.5px solid var(--blueprint)`.
- Dropzone: 1.5px dashed `--rule` on `--paper-sunken`, upload icon, "Drop site photos here", hint "JPG or PNG · first photo is the cover".
- Destructive actions: ghost button with `--hivis-ink` text, confirm dialog before delete.

---

## 12. Accessibility checklist

- [ ] Every text pair meets §3.2 in both themes.
- [ ] Status tags always include the word.
- [ ] Real `<button>`, `<a href>`, `<label for>` + `<input>`; no clickable divs.
- [ ] Icon-only buttons have `aria-label`.
- [ ] Project images have `alt` from caption or title; placeholders are `aria-hidden`.
- [ ] Focus ring visible on every control.
- [ ] `lang="en"` on `<html>`; one `<h1>` per page.