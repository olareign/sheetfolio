import "server-only";
import { decodeEntities, fetchHtmlPage, PreviewError, type PreviewDeps } from "../site-preview";

/*
 * Getting the job's text, from a pasted description or from a link to the posting. Job pages are often built in the
 * browser, or behind a sign-in, and then there is no text to read: say so and ask for a paste, rather than guess.
 */

export const MIN_JOB_CHARS = 120;
export const MAX_JOB_CHARS = 20_000;

export class JobError extends Error {
  constructor(
    readonly code: "INPUT" | "FETCH",
    message: string,
  ) {
    super(message);
    this.name = "JobError";
  }
}

export type Job = { text: string; source?: string; notice?: string };

const PASTE_INSTEAD = "Paste the job description instead.";

const BLOCK_TAGS =
  /<\/?(?:p|div|section|article|main|li|ul|ol|h[1-6]|br|tr|table|header|footer|aside|blockquote|dt|dd|pre)\b[^>]*>/gi;

/** Visible text of an HTML fragment: block tags become line breaks, the rest of the markup goes. */
export function htmlToText(html: string): string {
  return decodeEntities(
    html
      .replace(/<(script|style|noscript|svg|template|iframe|head)\b[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(BLOCK_TAGS, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t ]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

type Json = Record<string, unknown>;
const isObject = (v: unknown): v is Json => typeof v === "object" && v !== null && !Array.isArray(v);
const str = (v: unknown): string => (typeof v === "string" ? v : "");

/** Finds a schema.org JobPosting in the page's JSON-LD blocks, which job boards publish for search engines. */
function findJobPosting(html: string): Json | null {
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(m[1] ?? "");
    } catch {
      continue;
    }
    const stack: unknown[] = [parsed];
    while (stack.length) {
      const node = stack.pop();
      if (Array.isArray(node)) stack.push(...node);
      else if (isObject(node)) {
        const type = node["@type"];
        if (type === "JobPosting" || (Array.isArray(type) && type.includes("JobPosting"))) return node;
        if (node["@graph"]) stack.push(node["@graph"]);
      }
    }
  }
  return null;
}

function textFromPosting(post: Json): string {
  const org = isObject(post.hiringOrganization) ? str(post.hiringOrganization.name) : str(post.hiringOrganization);
  const place = isObject(post.jobLocation) && isObject(post.jobLocation.address) ? post.jobLocation.address : {};
  const location = [str(place.addressLocality), str(place.addressRegion), str(place.addressCountry)]
    .filter(Boolean)
    .join(", ");
  return [
    str(post.title) && `Job title: ${str(post.title)}`,
    org && `Company: ${org}`,
    location && `Location: ${location}`,
    str(post.employmentType) && `Type: ${str(post.employmentType)}`,
    htmlToText(str(post.description)),
    str(post.responsibilities) && `Responsibilities:\n${htmlToText(str(post.responsibilities))}`,
    str(post.qualifications) && `Qualifications:\n${htmlToText(str(post.qualifications))}`,
    str(post.skills) && `Skills:\n${htmlToText(str(post.skills))}`,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** The job text on a posting's page: the structured posting when there is one, else the page's main text. */
export function jobTextFromHtml(html: string): string {
  const post = findJobPosting(html);
  if (post) {
    const text = textFromPosting(post);
    if (text.length >= MIN_JOB_CHARS) return text;
  }
  const main = /<(main|article)\b[^>]*>([\s\S]*?)<\/\1>/i.exec(html)?.[2];
  const body = /<body\b[^>]*>([\s\S]*?)<\/body>/i.exec(html)?.[1] ?? html;
  const chrome = (h: string) => h.replace(/<(nav|header|footer|aside|form)\b[\s\S]*?<\/\1>/gi, " ");
  const fromMain = main ? htmlToText(chrome(main)) : "";
  return fromMain.length >= MIN_JOB_CHARS ? fromMain : htmlToText(chrome(body));
}

const PREVIEW_REASONS: Record<PreviewError["code"], string> = {
  BLOCKED: "That link can't be used. Check the address.",
  FETCH: "We couldn't open that link.",
  TYPE: "That link isn't a web page.",
  SIZE: "That page is too large to read.",
};

/**
 * The text of the job from whatever the person gave: a link, or pasted text (a link wins if both are there). Throws
 * `JobError` with a message the dashboard can show as it is.
 */
export async function resolveJob(input: { url?: string; text?: string }, deps: PreviewDeps = {}): Promise<Job> {
  const url = input.url?.trim();
  if (url) {
    let page: { url: string; html: string };
    try {
      page = await fetchHtmlPage(url, deps);
    } catch (err) {
      if (err instanceof PreviewError) throw new JobError("FETCH", `${PREVIEW_REASONS[err.code]} ${PASTE_INSTEAD}`);
      throw err;
    }
    const text = jobTextFromHtml(page.html);
    if (text.length < MIN_JOB_CHARS) {
      throw new JobError(
        "FETCH",
        `We opened that page but couldn't find the job text on it. Many job sites need you to sign in, or draw the page in your browser. ${PASTE_INSTEAD}`,
      );
    }
    return text.length > MAX_JOB_CHARS
      ? {
          text: text.slice(0, MAX_JOB_CHARS),
          source: page.url,
          notice: "That page is long, so we read the first part of it.",
        }
      : { text, source: page.url };
  }

  const text = (input.text ?? "").trim();
  if (text.length < MIN_JOB_CHARS) {
    throw new JobError("INPUT", "Paste the whole job description, or give a link to it.");
  }
  if (text.length > MAX_JOB_CHARS) {
    throw new JobError(
      "INPUT",
      `That is too long. Keep the job description under ${MAX_JOB_CHARS.toLocaleString("en")} characters.`,
    );
  }
  return { text };
}
