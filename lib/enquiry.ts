import "server-only";
import { LeadInput, type Lead, type Site } from "@/content/schemas";
import { escapeHtml, sendEmail } from "./email";
import { addLead, SiteError } from "./site";

export type EnquiryResult =
  | { ok: true; emailed: boolean }
  | { ok: false; reason: "INVALID"; fieldErrors: Record<string, string> }
  | { ok: false; reason: "RATE_LIMITED" | "UNAVAILABLE" };

type Deps = {
  /** Resolves the published site (null when missing or suspended). */
  getSite: (slug: string) => Promise<Site | null>;
  /** Returns true when this sender may submit now. */
  allow: () => Promise<boolean>;
  send?: typeof sendEmail;
  now?: Date;
};

function emailFor(site: Site, slug: string, lead: Lead) {
  const lines = [
    `New enquiry from your Siteproof page (/${slug}).`,
    "",
    `Name: ${lead.name}`,
    `Email: ${lead.email}`,
    ...(lead.company ? [`Company / project: ${lead.company}`] : []),
    "",
    lead.message,
    "",
    "Reply to this email to answer. It is also in your Leads inbox.",
  ];
  const html = lines.map((l) => (l ? `<p>${escapeHtml(l)}</p>` : "")).join("");
  return {
    to: site.profile.publicEmail,
    subject: `New enquiry from ${lead.name}`,
    text: lines.join("\n"),
    html,
    replyTo: lead.email,
  };
}

/**
 * Validate → rate-limit → store the lead → email the engineer.
 * The lead is stored before emailing, so a failed email never loses an enquiry (PRD §2.1).
 */
export async function submitEnquiry(slug: string, input: unknown, deps: Deps): Promise<EnquiryResult> {
  const parsed = LeadInput.safeParse(input);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[String(i.path[0])] ??= i.message;
    return { ok: false, reason: "INVALID", fieldErrors };
  }
  const site = await deps.getSite(slug);
  if (!site) return { ok: false, reason: "UNAVAILABLE" };
  if (!(await deps.allow())) return { ok: false, reason: "RATE_LIMITED" };

  let lead: Lead;
  try {
    lead = await addLead(slug, parsed.data, deps.now);
  } catch (err) {
    if (err instanceof SiteError) return { ok: false, reason: "UNAVAILABLE" };
    throw err;
  }

  try {
    await (deps.send ?? sendEmail)(emailFor(site, slug, lead));
    return { ok: true, emailed: true };
  } catch (err) {
    // Logged without the message body or visitor details (no PII in logs).
    console.error(`[enquiry] email to /${slug} failed:`, err instanceof Error ? err.message : err);
    return { ok: true, emailed: false };
  }
}
