/*
 * Reads the lines of a CV into the things a Sheetfolio page holds. Rule based and cautious: it fills in what it can
 * recognise and leaves the rest empty, and the person checks every field before anything is saved. A CV can be laid
 * out a hundred ways, so this will be wrong sometimes; the review step exists for that.
 */

export type ImportedExperience = { role: string; company: string; startYear: string; endYear: string; notes: string };
export type ImportedEducation = { qualification: string; institution: string; startYear: string; endYear: string };
export type ImportedCertification = { title: string; issuer: string; year: string };

export type ImportedCv = {
  name: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  summary: string;
  yearsExperience: string;
  experiences: ImportedExperience[];
  education: ImportedEducation[];
  certifications: ImportedCertification[];
};

const MONTH = "(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\\.?";
const YEAR = "(?:19|20)\\d{2}";
const DASH = "(?:-|–|—|to|until|till)";
const OPEN_END = "present|current|now|date|ongoing|today";
const RANGE = new RegExp(
  `(?:${MONTH}[\\s,/-]+)?(${YEAR})\\s*${DASH}\\s*(?:(?:${MONTH}[\\s,/-]+)?(${YEAR})|(${OPEN_END}))`,
  "i",
);
const LONE_YEAR = new RegExp(`\\b(${YEAR})\\b`);
/** A year at the very end of a short line: "Intern, Ministry of Works  2021". */
const TRAILING_YEAR = new RegExp(`(?:^|[\\s|,(])\\(?(${YEAR})\\)?\\s*$`);
const BULLET = /^\s*[•·▪▫■□◦‣⁃*●○►▶-]\s*/;

const SECTIONS: Record<string, readonly string[]> = {
  summary: [
    "summary",
    "professional summary",
    "profile",
    "personal profile",
    "about me",
    "about",
    "objective",
    "career objective",
    "personal statement",
  ],
  experience: [
    "experience",
    "work experience",
    "professional experience",
    "employment",
    "employment history",
    "work history",
    "career history",
    "relevant experience",
  ],
  education: [
    "education",
    "education and training",
    "academic background",
    "academic qualifications",
    "qualifications",
    "educational background",
  ],
  certifications: [
    "certifications",
    "certification",
    "certificates",
    "licenses",
    "licences",
    "licenses and certifications",
    "professional certifications",
    "training",
    "courses",
    "training and certifications",
  ],
  other: [
    "projects",
    "selected projects",
    "additional projects",
    "skills",
    "technical skills",
    "core competencies",
    "key skills",
    "competencies",
    "research",
    "publications",
    "referees",
    "references",
    "languages",
    "interests",
    "hobbies",
    "awards",
    "achievements",
    "volunteering",
    "volunteer experience",
    "additional information",
  ],
};
type SectionKey = keyof typeof SECTIONS;

const normHeading = (line: string) =>
  line
    .toLowerCase()
    .replace(/[^a-z& ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/ &/g, " and");

function headingOf(line: string): SectionKey | null {
  if (line.length > 45) return null;
  const n = normHeading(line);
  for (const [key, names] of Object.entries(SECTIONS)) if (names.includes(n)) return key;
  return null;
}

const ROLE_WORDS =
  /\b(engineer|developer|manager|officer|director|lead|head|analyst|assistant|consultant|intern|internship|teacher|lecturer|nurse|architect|accountant|designer|technician|supervisor|coordinator|administrator|associate|specialist|executive|founder|owner|president|chief|surveyor|foreman|clerk|trainee|apprentice|tutor|researcher|scientist|doctor|pharmacist|midwife|driver|operator|writer|editor|photographer|programmer|tester|planner|estimator|inspector|auditor|advisor|adviser|representative|secretary|receptionist|cashier|sales|volunteer|fellow|instructor|professor|principal|partner)\b/i;
const DEGREE_WORDS =
  /\b(b\.?\s?sc|b\.?\s?eng|b\.?\s?tech|b\.?\s?a\b|m\.?\s?sc|m\.?\s?eng|m\.?\s?tech|m\.?\s?a\b|mba|ph\.?\s?d|hnd|ond|nce|bachelor|master|doctorate|diploma|degree|certificate|waec|neco|ssce|ssc|a-levels?|o-levels?|gcse|associate|bsc|msc|meng|beng|btech|mtech|llb|mbbs|rn|rm)\b/i;
const INSTITUTION_WORDS =
  /\b(university|college|polytechnic|school|institute|academy|seminary|campus|universit[yé])\b/i;

const clip = (s: string, max: number) => {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const cut = t.slice(0, max);
  return cut.slice(0, Math.max(cut.lastIndexOf(" "), Math.floor(max * 0.6))).trim();
};

const stripBullet = (s: string) => s.replace(BULLET, "").trim();
const isBullet = (s: string) => BULLET.test(s);

/** Splits on separators that clearly divide two things: a gap, " | ", " – ", " at ". Commas are left alone. */
function splitStrong(text: string): string[] {
  return text
    .split(/\s{2,}|\s[|•·–—-]\s|\s@\s|\sat\s/i)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Splits a header such as "Site Engineer | IJUNT" or "Nurse, General Hospital" into its parts. */
function splitHeader(text: string): string[] {
  const strong = splitStrong(text);
  if (strong.length > 1) return strong;
  // Only the first comma that is not inside brackets: "Role (Intern, NYSC), Company, Inc." → role, "Company, Inc."
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (c === "(" || c === "[") depth += 1;
    else if (c === ")" || c === "]") depth = Math.max(0, depth - 1);
    else if (c === "," && depth === 0) return [text.slice(0, i).trim(), text.slice(i + 1).trim()].filter(Boolean);
  }
  return strong;
}

const TRAILING_JOINER = /[\s|•·,;:–—-]+$/;
const LEADING_JOINER = /^[\s|•·,;:–—-]+/;

/** Takes the dates out of a line. A single year counts as a range of one year (a role that lasted a year). */
function removeRange(line: string): { rest: string; start?: number; end?: number; open: boolean } {
  const m = RANGE.exec(line);
  const clean = (s: string) =>
    s
      .replace(/\(\s*\)|\[\s*\]/g, " ")
      .replace(/\s+/g, " ")
      .replace(TRAILING_JOINER, "")
      .replace(LEADING_JOINER, "")
      .trim();
  if (m) {
    const rest = clean(line.slice(0, m.index) + " " + line.slice(m.index + m[0].length));
    return { rest, start: Number(m[1]), end: m[2] ? Number(m[2]) : undefined, open: Boolean(m[3]) };
  }
  const single = TRAILING_YEAR.exec(line);
  if (single)
    return { rest: clean(line.slice(0, single.index)), start: Number(single[1]), end: Number(single[1]), open: false };
  return { rest: line, open: false };
}

// ── Header ──────────────────────────────────────────────────────────────────

const EMAIL = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE = /(\+?\d[\d\s().-]{7,}\d)/;
const looksLikeContact = (s: string) =>
  EMAIL.test(s) ||
  (PHONE.exec(s)?.[1]?.replace(/\D/g, "").length ?? 0) >= 8 ||
  /https?:\/\/|www\.|linkedin\.|github\./i.test(s);

function titleCase(s: string): string {
  return s === s.toUpperCase() ? s.toLowerCase().replace(/\b\p{L}/gu, (c) => c.toUpperCase()) : s;
}

function looksLikeName(s: string): boolean {
  if (s.length > 60 || /\d|@|[|•]/.test(s)) return false;
  const words = s.trim().split(/\s+/);
  return words.length >= 2 && words.length <= 5 && words.every((w) => /^\p{Lu}[\p{L}.'’-]*$/u.test(w)) && !headingOf(s);
}

function parseHeader(lines: string[]): Pick<ImportedCv, "name" | "headline" | "email" | "phone" | "location"> {
  const block = lines.slice(0, 8);
  const nameIndex = block.findIndex(looksLikeName);
  const name = nameIndex >= 0 ? titleCase(block[nameIndex]!) : "";
  const email = EMAIL.exec(block.join(" "))?.[0] ?? "";
  let phone = "";
  for (const l of block) {
    const m = PHONE.exec(l.replace(EMAIL, " "));
    if (m && m[1]!.replace(/\D/g, "").length >= 8) {
      phone = m[1]!.trim();
      break;
    }
  }
  const headline =
    nameIndex >= 0
      ? (block.slice(nameIndex + 1).find((l) => !looksLikeContact(l) && l.length <= 90 && !headingOf(l)) ?? "")
      : "";

  let location = "";
  for (const l of block) {
    for (const token of l.split(/\s*[|•·]\s*|\s{2,}/)) {
      if (
        !looksLikeContact(token) &&
        /^\p{Lu}[\p{L} .'’-]+(?:,\s*\p{Lu}[\p{L} .'’-]+)+$/u.test(token.trim()) &&
        token.trim() !== name &&
        token.trim() !== headline
      ) {
        location = token.trim();
        break;
      }
    }
    if (location) break;
  }
  return { name: clip(name, 120), headline: clip(headline, 80), email, phone, location: clip(location, 120) };
}

// ── Experience ──────────────────────────────────────────────────────────────

function roleScore(s: string): number {
  return ROLE_WORDS.test(s) ? 1 : 0;
}

/** Which of the parts is the role and which the company; the first is the role when nothing tells them apart. */
function roleAndCompany(parts: string[]): { role: string; company: string } {
  if (parts.length === 0) return { role: "", company: "" };
  if (parts.length === 1)
    return roleScore(parts[0]!) ? { role: parts[0]!, company: "" } : { role: "", company: parts[0]! };
  const [a, b] = parts as [string, string];
  if (roleScore(b) > roleScore(a)) return { role: b, company: a };
  return { role: a, company: b };
}

function parseExperience(lines: string[]): ImportedExperience[] {
  const entries: ImportedExperience[] = [];
  // A line with a date range starts an entry; so does a short line that ends with a single year and has a role or a separator.
  const startsEntry = (l: string) =>
    !isBullet(l) &&
    (RANGE.test(l) || (l.length <= 90 && TRAILING_YEAR.test(l) && (ROLE_WORDS.test(l) || /[|,–—-]/.test(l))));
  const anchors = lines.map((l, i) => (startsEntry(l) ? i : -1)).filter((i) => i >= 0);
  const headerStart = new Map<number, number>();

  for (const [n, i] of anchors.entries()) {
    const { rest } = removeRange(lines[i]!);
    let start = i;
    if (rest.length < 3) {
      // The dates are on a line of their own: the entry's title lines sit just above (at most two, never a bullet).
      const floor = n === 0 ? 0 : (anchors[n - 1] ?? 0) + 1;
      while (
        start > floor &&
        i - start < 2 &&
        !isBullet(lines[start - 1]!) &&
        lines[start - 1]!.length <= 90 &&
        !startsEntry(lines[start - 1]!)
      )
        start -= 1;
    } else if (
      i > 0 &&
      roleScore(rest) === 0 &&
      !isBullet(lines[i - 1]!) &&
      lines[i - 1]!.length <= 70 &&
      roleScore(lines[i - 1]!) === 1 &&
      !startsEntry(lines[i - 1]!) &&
      (n === 0 || i - 1 > (anchors[n - 1] ?? -1))
    ) {
      // "Role" on one line, then "Company, City   2019 – 2021" below it.
      start = i - 1;
    }
    headerStart.set(i, start);
  }

  for (const [n, i] of anchors.entries()) {
    const { rest, start, end, open } = removeRange(lines[i]!);
    const first = headerStart.get(i) ?? i;
    const titleLines = [...lines.slice(first, i).map(stripBullet), rest].filter((s) => s.length > 0);
    // One line holds both ("Role, Company"); with two lines each is one thing, such as "Company, City".
    const parts =
      titleLines.length === 1 ? splitHeader(titleLines[0]!) : titleLines.map((l) => splitStrong(l).join(", "));
    const { role, company } = roleAndCompany(parts);
    const next = anchors[n + 1];
    const notesEnd = next === undefined ? lines.length : (headerStart.get(next) ?? next);
    const notes = lines
      .slice(i + 1, notesEnd)
      .map(stripBullet)
      .join(" ");
    if (!role && !company) continue;
    entries.push({
      role: clip(role, 120),
      company: clip(company, 120),
      startYear: String(start ?? ""),
      endYear: open || end === undefined ? "" : String(end),
      notes: clip(notes, 1000),
    });
  }
  return entries;
}

// ── Education ───────────────────────────────────────────────────────────────

function parseEducation(lines: string[]): ImportedEducation[] {
  const out: ImportedEducation[] = [];
  let cur: ImportedEducation | null = null;
  const flush = () => {
    if (cur && (cur.qualification || cur.institution)) out.push(cur);
    cur = null;
  };
  const blank = (): ImportedEducation => ({ qualification: "", institution: "", startYear: "", endYear: "" });

  for (const raw of lines) {
    const line = stripBullet(raw);
    const r = removeRange(line);
    const lone = r.start === undefined ? LONE_YEAR.exec(line) : null;
    const text =
      r.start !== undefined
        ? r.rest
        : line
            .replace(new RegExp(`\\(?\\b${YEAR}\\b\\)?`, "g"), " ")
            .replace(/\s+/g, " ")
            .replace(TRAILING_JOINER, "")
            .trim();
    // A comma only divides "Degree, University" when each side is recognisable; "University of Lagos, Akoka" stays whole.
    let parts = splitStrong(text);
    if (parts.length === 1 && DEGREE_WORDS.test(text) && INSTITUTION_WORDS.test(text)) parts = splitHeader(text);

    for (const part of parts.length ? parts : [""]) {
      const isDegree = DEGREE_WORDS.test(part);
      const isInstitution = INSTITUTION_WORDS.test(part);
      if (!part) continue;
      if (isDegree && !isInstitution) {
        if (cur?.qualification) flush();
        cur ??= blank();
        cur.qualification = clip(part, 120);
      } else if (isInstitution) {
        if (cur?.institution) flush();
        cur ??= blank();
        cur.institution = clip(part, 160);
      } else if (cur && !cur.institution && cur.qualification) {
        cur.institution = clip(part, 160);
      } else if (cur && !cur.qualification && cur.institution) {
        cur.qualification = clip(part, 120);
      } else if (!cur) {
        cur = { ...blank(), qualification: clip(part, 120) };
      }
    }
    if (cur && (r.start !== undefined || lone)) {
      if (r.start !== undefined) {
        cur.startYear = String(r.start);
        cur.endYear = r.end !== undefined ? String(r.end) : r.open ? "" : cur.startYear;
      } else if (lone) {
        cur.startYear ||= lone[1]!;
        cur.endYear ||= lone[1]!;
      }
    }
  }
  flush();
  return out;
}

// ── Certifications ──────────────────────────────────────────────────────────

/** "Title, Issuer" only when the left side is clearly a title: "Health, Safety and Environment Management" stays whole. */
function splitTitleIssuer(text: string): [string, string] {
  const strong = splitStrong(text);
  if (strong.length > 1) return [strong[0]!, strong.slice(1).join(", ")];
  const comma = text.lastIndexOf(",");
  if (comma > 0) {
    const left = text.slice(0, comma).trim();
    const right = text.slice(comma + 1).trim();
    if (left.split(/\s+/).length >= 2 && right.split(/\s+/).length <= 6) return [left, right];
  }
  // A closing "(Issuer)" is the issuer, but a short all-capitals tag such as "(HSEP)" belongs to the title.
  const bracket = /^(.*\S)\s*\(([^)]{2,60})\)$/.exec(text);
  if (bracket && !/^[A-Z0-9&.-]{2,8}$/.test(bracket[2]!)) return [bracket[1]!, bracket[2]!];
  return [text, ""];
}

function parseCertifications(lines: string[]): ImportedCertification[] {
  const out: ImportedCertification[] = [];
  for (const raw of lines) {
    const line = stripBullet(raw);
    if (line.length < 4) continue;
    const years = [...line.matchAll(new RegExp(YEAR, "g"))];
    const year = years.length ? years[years.length - 1]![0] : "";
    const text = line
      .replace(new RegExp(`\\(?\\b${YEAR}\\b\\)?`, "g"), " ")
      .replace(/\s+/g, " ")
      .replace(TRAILING_JOINER, "")
      .trim();
    const previous = out[out.length - 1];
    // A line with no year under a certificate that has no issuer yet is that certificate's issuer.
    if (!year && !isBullet(raw) && previous && !previous.issuer && text.length <= 100) {
      previous.issuer = clip(text, 160);
      continue;
    }
    const [title, issuer] = splitTitleIssuer(text);
    if (title.length < 3) continue;
    out.push({ title: clip(title, 160), issuer: clip(issuer, 160), year });
  }
  return out;
}

/** A short stamp for a certificate: its capitals when it has several ("AWS Certified" → "AWSC"), else its first word. */
export function stampFor(title: string): string {
  const caps = title.match(/\b\p{Lu}/gu)?.join("") ?? "";
  const stamp = caps.length >= 2 ? caps : (title.trim().split(/\s+/)[0] ?? title);
  return stamp.slice(0, 7).toUpperCase();
}

// ── Whole CV ────────────────────────────────────────────────────────────────

export function parseCv(allLines: readonly string[], now: Date = new Date()): ImportedCv {
  const lines = allLines.map((l) => l.replace(/\s+$/g, "")).filter((l) => l.trim().length > 0);
  const sections = new Map<SectionKey, string[]>();
  let current: SectionKey | "header" = "header";
  const header: string[] = [];
  for (const line of lines) {
    const key = headingOf(line);
    if (key) {
      current = key;
      if (!sections.has(key)) sections.set(key, []);
      continue;
    }
    if (current === "header") header.push(line);
    else sections.get(current)!.push(line);
  }

  const experiences = parseExperience(sections.get("experience") ?? []);
  const starts = experiences.map((e) => Number(e.startYear)).filter((y) => y >= 1950);
  const years = starts.length ? Math.min(70, Math.max(0, now.getFullYear() - Math.min(...starts))) : 0;

  return {
    ...parseHeader(header),
    summary: clip((sections.get("summary") ?? []).map(stripBullet).join(" "), 1200),
    yearsExperience: years > 0 ? String(years) : "",
    experiences,
    education: parseEducation(sections.get("education") ?? []),
    certifications: parseCertifications(sections.get("certifications") ?? []),
  };
}
