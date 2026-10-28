import { z } from "zod";
import type { Site, UserPlan } from "./schemas";

/*
 * Tailoring a CV to a job. A tailored version is an overlay on the person's own page, not a copy of it: it keeps the
 * wording of the headline, summary, skills and experience notes, and which experiences, projects and certifications to
 * show and in what order, all by id. The facts themselves stay on the page, so editing them there carries into every
 * saved version, and nothing here can change the page unless the person applies a version to it.
 *
 * Pure and free of React, so the server, the dashboard and the tests share it.
 */

/** How many tailored versions a person can keep. */
export const MAX_TAILORED = 3;
/**
 * Who writes a tailored CV. Everyone gets the standard engine (Groq, free for us to run within its own daily limits);
 * Claude writes for accounts on the Pro plan. Each run still costs something, so each engine has its own daily cap per
 * person, counted separately.
 */
export type TailorEngine = "groq" | "claude";

export const TAILOR_ENGINES: Record<TailorEngine, { label: string; dailyRuns: number }> = {
  groq: { label: "Standard AI", dailyRuns: 5 },
  claude: { label: "Claude", dailyRuns: 20 },
};

/**
 * Runs the standard engine may do in a day across every account together. Groq's free plan allows about 200,000 tokens
 * a day per model and one run uses roughly 4,000, so the default leaves a margin. Raise it with GROQ_DAILY_LIMIT after
 * moving Groq to a paid plan.
 */
export const DEFAULT_GROQ_DAILY_LIMIT = 40;

/** The longest job description sent to the standard engine, which has a small per-minute token allowance. */
export const GROQ_JOB_CHARS = 6000;

/**
 * Which engine writes for an account: Claude for Pro when it is switched on, otherwise the standard engine, so a Pro
 * account is never left without tailoring. Null when neither is switched on.
 */
export function pickEngine(plan: UserPlan, on: { claude: boolean; groq: boolean }): TailorEngine | null {
  if (plan === "pro" && on.claude) return "claude";
  return on.groq ? "groq" : null;
}

/** How much of a job description is enough to tailor to, and the most we read. */
export const JOB_TEXT_MIN = 120;
export const JOB_TEXT_MAX = 20_000;

const Id = z.string().min(1).max(64);

export const TailorOverlay = z.object({
  headline: z.string().trim().min(1, "Add a headline").max(80, "At most 80 characters"),
  summary: z.string().trim().max(1200, "At most 1,200 characters"),
  competencies: z.array(z.string().trim().min(1).max(80)).max(6, "At most 6 skills"),
  /** The experiences to show, in order, with the notes to print under each. */
  experiences: z.array(z.object({ id: Id, notes: z.string().trim().max(1000) })).max(200),
  projects: z.array(Id).max(200),
  certifications: z.array(Id).max(200),
});
export type TailorOverlay = z.infer<typeof TailorOverlay>;

/** What the AI step hands back: the overlay plus a short read on how well the person fits. */
export type TailorResult = {
  job: { title: string; company: string; source?: string; notice?: string };
  /** Which engine wrote it. */
  engine: TailorEngine;
  overlay: TailorOverlay;
  matched: string[];
  gaps: string[];
  /** Things to check before using the result, in plain words. */
  warnings: string[];
};

/** The overlay that reproduces the page as it is now: everything, in page order. Also the undo snapshot. */
export function overlayFromSite(site: Site): TailorOverlay {
  return {
    headline: site.profile.headline,
    summary: site.profile.summary,
    competencies: [...site.competencies],
    experiences: site.experiences.map((e) => ({ id: e.id, notes: e.notes ?? "" })),
    projects: site.projects.map((p) => p.id),
    certifications: site.certifications.map((c) => c.id),
  };
}

const unique = (ids: readonly string[]) => [...new Set(ids)];

/**
 * Drops ids the page no longer has (an experience deleted after the version was saved) and repeats. The text is kept
 * as written. Safe to run on anything that came back from the AI or from storage.
 */
export function reconcileOverlay(site: Site, overlay: TailorOverlay): TailorOverlay {
  const experiences = new Set(site.experiences.map((e) => e.id));
  const projects = new Set(site.projects.map((p) => p.id));
  const certifications = new Set(site.certifications.map((c) => c.id));
  const seen = new Set<string>();
  return {
    ...overlay,
    experiences: overlay.experiences.filter((e) => {
      if (!experiences.has(e.id) || seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    }),
    projects: unique(overlay.projects).filter((id) => projects.has(id)),
    certifications: unique(overlay.certifications).filter((id) => certifications.has(id)),
  };
}

/**
 * The page as one tailored CV should show it: the overlay's headline, summary and skills, and only the listed
 * experiences, projects and certifications, in the overlay's order. Education, contact details, private details and
 * referees stay as they are on the page, with the page's own visibility rules.
 */
export function cvSite(site: Site, overlay: TailorOverlay): Site {
  const o = reconcileOverlay(site, overlay);
  const experienceById = new Map(site.experiences.map((e) => [e.id, e]));
  const kept = new Set(o.experiences.map((e) => e.id));
  const projectById = new Map(site.projects.map((p) => [p.id, p]));
  const certificationById = new Map(site.certifications.map((c) => [c.id, c]));
  return {
    ...site,
    profile: { ...site.profile, headline: o.headline, summary: o.summary },
    competencies: o.competencies,
    experiences: o.experiences.flatMap(({ id, notes }) => {
      const e = experienceById.get(id);
      return e ? [{ ...e, notes: notes || undefined }] : [];
    }),
    projects: o.projects.flatMap((id) => {
      const p = projectById.get(id);
      if (!p) return [];
      // A project's employer is read from the experience it points at; if that experience is left off this CV, keep
      // the employer's name on the project instead of printing a project with no employer.
      const left = p.experienceId && !kept.has(p.experienceId) ? experienceById.get(p.experienceId) : undefined;
      return [left ? { ...p, client: p.client || left.company, experienceId: undefined } : p];
    }),
    certifications: o.certifications.flatMap((id) => {
      const c = certificationById.get(id);
      return c ? [c] : [];
    }),
  };
}

const firstThenRest = <T extends { id: string }>(items: readonly T[], order: readonly string[]): T[] => {
  const byId = new Map(items.map((i) => [i.id, i]));
  const first = order.flatMap((id) => {
    const item = byId.get(id);
    return item ? [item] : [];
  });
  const listed = new Set(first.map((i) => i.id));
  return [...first, ...items.filter((i) => !listed.has(i.id))];
};

/**
 * The page with this version applied to it. Nothing is ever removed: items the version leaves out move to the end, in
 * their old order. Experience notes are replaced only for the experiences the version lists.
 */
export function applyOverlayToSite(site: Site, overlay: TailorOverlay): Site {
  const o = reconcileOverlay(site, overlay);
  const notes = new Map(o.experiences.map((e) => [e.id, e.notes]));
  return {
    ...site,
    profile: { ...site.profile, headline: o.headline, summary: o.summary },
    competencies: o.competencies,
    experiences: firstThenRest(
      site.experiences,
      o.experiences.map((e) => e.id),
    ).map((e) => (notes.has(e.id) ? { ...e, notes: notes.get(e.id) || undefined } : e)),
    projects: firstThenRest(site.projects, o.projects),
    certifications: firstThenRest(site.certifications, o.certifications),
  };
}

// ── Keeping the AI to the person's facts ────────────────────────────────────

const FIGURE = /\d[\d,.]*\d%?|\d%/g;

/** Figures in a text, ignoring one-digit numbers, which are usually counts of words ("3 projects"), not claims. */
function figuresIn(text: string): string[] {
  return (text.match(FIGURE) ?? []).map((f) => f.replace(/,/g, "").replace(/\.$/, ""));
}

/**
 * Figures (years, amounts, percentages) that appear in `generated` but nowhere in `source`. The AI is told never to
 * invent one, so any that turn up are shown to the person to check before they use the result.
 */
export function inventedFigures(generated: string, source: string): string[] {
  const known = new Set(figuresIn(source));
  return [...new Set(figuresIn(generated))].filter((f) => !known.has(f));
}

/** Every piece of text on the page the AI was shown, as one string to check its figures against. */
export function sourceText(site: Site): string {
  return [
    site.profile.headline,
    site.profile.summary,
    String(site.profile.yearsExperience),
    ...site.competencies,
    ...site.experiences.flatMap((e) => [
      e.company,
      e.role,
      String(e.startYear),
      String(e.endYear ?? ""),
      e.notes ?? "",
    ]),
    ...site.projects.flatMap((p) => [p.title, p.role, p.scope, String(p.startYear), String(p.endYear ?? "")]),
    ...site.certifications.flatMap((c) => [c.title, c.issuer, String(c.year)]),
    ...site.education.flatMap((e) => [e.qualification, e.institution, String(e.startYear), String(e.endYear)]),
  ].join("\n");
}

const cut = (text: string, max: number): string => {
  if (text.length <= max) return text;
  const slice = text.slice(0, max);
  const at = Math.max(slice.lastIndexOf(". "), slice.lastIndexOf("\n"));
  return (at > max * 0.5 ? slice.slice(0, at + 1) : slice.slice(0, slice.lastIndexOf(" "))).trim();
};

/** What the model returns before it is checked. Loose on purpose: limits are enforced in `finishOverlay`. */
export type AiTailoring = {
  job: { title: string; company: string };
  headline: string;
  summary: string;
  competencies: string[];
  experiences: { id: string; notes: string }[];
  projects: string[];
  certifications: string[];
  matched: string[];
  gaps: string[];
};

/**
 * Turns the model's answer into a result the dashboard can show: unknown ids dropped, text cut to the page's own
 * limits, anything blank replaced by what the page already says, and a warning for every figure the page does not
 * contain. The model is trusted for wording and order, never for facts or ids.
 */
export function finishTailoring(site: Site, ai: AiTailoring, source?: string): Omit<TailorResult, "engine"> {
  const current = overlayFromSite(site);
  const known = new Map(site.experiences.map((e) => [e.id, e]));
  const listed = reconcileOverlay(site, {
    headline: current.headline,
    summary: current.summary,
    competencies: [],
    experiences: ai.experiences.map((e) => ({ id: e.id, notes: e.notes.trim() })),
    projects: ai.projects,
    certifications: ai.certifications,
  });
  const overlay: TailorOverlay = {
    headline: cut(ai.headline.replace(/\s+/g, " ").trim(), 80) || current.headline,
    summary: cut(ai.summary.trim(), 1200) || current.summary,
    competencies: ai.competencies
      .map((c) => cut(c.replace(/\s+/g, " ").trim(), 80))
      .filter(Boolean)
      .slice(0, 6),
    // An experience the model listed without notes keeps the person's own.
    experiences: (listed.experiences.length ? listed.experiences : current.experiences).map((e) => ({
      id: e.id,
      notes: cut(e.notes || known.get(e.id)?.notes || "", 1000),
    })),
    projects: listed.projects.length ? listed.projects : current.projects,
    certifications: listed.certifications.length ? listed.certifications : current.certifications,
  };

  const origin = source ?? sourceText(site);
  const warnings: string[] = [];
  const check = (label: string, text: string) => {
    const bad = inventedFigures(text, origin);
    if (bad.length)
      warnings.push(`${label} mentions ${bad.join(", ")}, which is not on your page. Check it or remove it.`);
  };
  check("The summary", overlay.summary);
  check("The headline", overlay.headline);
  for (const e of overlay.experiences) {
    const exp = known.get(e.id);
    check(`The notes for ${exp ? `${exp.role} at ${exp.company}` : "an experience"}`, e.notes);
  }

  return {
    job: { title: ai.job.title.trim().slice(0, 160), company: ai.job.company.trim().slice(0, 160) },
    overlay,
    matched: ai.matched
      .map((m) => m.trim())
      .filter(Boolean)
      .slice(0, 12),
    gaps: ai.gaps
      .map((g) => g.trim())
      .filter(Boolean)
      .slice(0, 12),
    warnings,
  };
}

/** "Frontend" → "Frontend", for the name of the PDF: ASCII only, safe for a download header. */
export function tailoredFileName(personName: string, label: string): string {
  const ascii = (text: string) =>
    text
      .normalize("NFKD")
      .replace(/[^\w\s-]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  const tail = ascii(label);
  return `${ascii(personName) || "CV"}-CV${tail ? `-${tail}` : ""}.pdf`;
}
