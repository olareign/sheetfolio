import type { Lead } from "@/content/schemas";
import { BRAND_TOKENS as T } from "./brand-tokens";

/*
 * Transactional email content. Pure functions: subject + HTML + plain text, unit-tested.
 * HTML uses tables and inline styles because email clients ignore stylesheets and CSS variables;
 * colours come from the brand-token mirror (kept in sync with tokens.css by a test).
 */

export type EmailContent = { subject: string; html: string; text: string };

const SANS = "Helvetica, Arial, sans-serif";
const MONO = "'Courier New', Courier, monospace";

/** Escapes a value for HTML text or a double-quoted attribute. */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}

const label = (text: string) =>
  `<span style="font-family:${MONO};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${T.inkMuted};">${escapeHtml(text)}</span>`;

function button(href: string, text: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td style="background:${T.blueprint};">
<a href="${escapeHtml(href)}" style="display:inline-block;padding:13px 22px;font-family:${SANS};font-size:15px;font-weight:bold;color:${T.onBlueprint};text-decoration:none;">${escapeHtml(text)}</a>
</td></tr></table>`;
}

/** Drawing-sheet frame shared by every email: header strip, body, footer. */
function layout({
  preheader,
  sheet,
  body,
  footer,
}: {
  preheader: string;
  sheet: string;
  body: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><title>Sheetfolio</title></head>
<body style="margin:0;padding:0;background:${T.page};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${T.page};"><tr><td align="center" style="padding:32px 16px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${T.paper};border:1px solid ${T.rule};">
<tr><td style="padding:12px 24px;border-bottom:1px solid ${T.rule};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td>${label("Sheetfolio")}</td><td align="right">${label(`Sheet ${sheet}`)}</td>
</tr></table></td></tr>
<tr><td style="padding:32px 24px;font-family:${SANS};font-size:16px;line-height:1.6;color:${T.ink};">${body}</td></tr>
<tr><td style="padding:16px 24px;border-top:1px solid ${T.hairline};font-family:${SANS};font-size:12px;line-height:1.5;color:${T.inkMuted};">${footer}</td></tr>
</table></td></tr></table></body></html>`;
}

const h1 = (text: string) =>
  `<h1 style="margin:0 0 16px;font-family:${SANS};font-size:28px;line-height:1.15;font-weight:bold;color:${T.ink};">${escapeHtml(text)}</h1>`;
const p = (html: string, extra = "") => `<p style="margin:0 0 16px;${extra}">${html}</p>`;

// ── Sign-in (magic link) ────────────────────────────────────────────────────

export function signInEmail({
  url,
  email,
  expiresInMinutes,
}: {
  url: string;
  email: string;
  expiresInMinutes: number;
}): EmailContent {
  const expiry =
    expiresInMinutes % 60 === 0
      ? `${expiresInMinutes / 60} hour${expiresInMinutes === 60 ? "" : "s"}`
      : `${expiresInMinutes} minutes`;
  const subject = "Your Sheetfolio sign-in link";
  const html = layout({
    preheader: `Sign in to Sheetfolio. The link expires in ${expiry}.`,
    sheet: "A-01",
    body: [
      h1("Sign in to Sheetfolio"),
      p(
        `Use the button below to sign in as <strong>${escapeHtml(email)}</strong>. The link works once and expires in ${expiry}.`,
      ),
      `<div style="margin:24px 0;">${button(url, "Sign in to Sheetfolio")}</div>`,
      p(
        `If the button doesn't work, copy this link into your browser:<br><a href="${escapeHtml(url)}" style="color:${T.blueprint};word-break:break-all;font-family:${MONO};font-size:13px;">${escapeHtml(url)}</a>`,
        `font-size:14px;color:${T.inkMuted};`,
      ),
    ].join(""),
    footer: `Didn't ask to sign in? Ignore this email. Nothing changes until the link is used.`,
  });
  const text = [
    "Sign in to Sheetfolio",
    "",
    `Use this link to sign in as ${email}. It works once and expires in ${expiry}:`,
    url,
    "",
    "Didn't ask to sign in? Ignore this email. Nothing changes until the link is used.",
  ].join("\n");
  return { subject, html, text };
}

// ── New enquiry (to the engineer) ───────────────────────────────────────────

export function enquiryEmail({
  lead,
  firstName,
  slug,
  origin,
}: {
  lead: Pick<Lead, "name" | "email" | "company" | "message" | "createdAt">;
  firstName: string;
  slug: string;
  /** Absolute base URL, e.g. https://sheetfolio.app */
  origin: string;
}): EmailContent {
  const base = origin.replace(/\/$/, "");
  const inbox = `${base}/dashboard/leads`;
  const page = `${base}/${slug}`;
  const replyHref = `mailto:${lead.email}?subject=${encodeURIComponent("Re: your enquiry")}`;
  const received = new Date(lead.createdAt).toUTCString().replace(" GMT", " UTC");
  const rows: [string, string][] = [
    ["Name", lead.name],
    ["Email", lead.email],
    ...(lead.company ? ([["Company / project", lead.company]] as [string, string][]) : []),
    ["Received", received],
  ];
  const table = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 20px;border:1px solid ${T.rule};">${rows
    .map(
      ([k, v]) =>
        `<tr><td style="width:36%;padding:10px 12px;border-bottom:1px solid ${T.hairline};background:${T.paperSunken};vertical-align:top;">${label(k)}</td><td style="padding:10px 12px;border-bottom:1px solid ${T.hairline};font-size:15px;">${escapeHtml(v)}</td></tr>`,
    )
    .join("")}</table>`;
  const message = `<div style="margin:0 0 24px;padding:16px;border-left:3px solid ${T.hivisInk};background:${T.page};white-space:pre-wrap;font-size:15px;line-height:1.6;">${escapeHtml(lead.message)}</div>`;

  const subject = `New enquiry from ${lead.name}`;
  const html = layout({
    preheader: `${lead.name}: ${lead.message.slice(0, 90)}`,
    sheet: "Enquiry",
    body: [
      `<div style="margin:0 0 8px;">${label("Issued for enquiry")}</div>`,
      h1(`New enquiry from ${lead.name}`),
      p(`Hi ${escapeHtml(firstName)}, someone sent you an enquiry through your Sheetfolio page.`),
      table,
      message,
      `<div style="margin:0 0 16px;">${button(replyHref, `Reply to ${lead.name}`)}</div>`,
      p(
        `Replying to this email also reaches ${escapeHtml(lead.name)}. The enquiry is saved in your <a href="${escapeHtml(inbox)}" style="color:${T.blueprint};">Leads inbox</a>.`,
        `font-size:14px;color:${T.inkMuted};`,
      ),
    ].join(""),
    footer: `Sent because someone used the enquiry form on <a href="${escapeHtml(page)}" style="color:${T.inkMuted};">${escapeHtml(page.replace(/^https?:\/\//, ""))}</a>. Drawn on Sheetfolio.`,
  });
  const text = [
    `New enquiry from ${lead.name}`,
    "",
    `Hi ${firstName}, someone sent you an enquiry through your Sheetfolio page (${page}).`,
    "",
    ...rows.map(([k, v]) => `${k}: ${v}`),
    "",
    lead.message,
    "",
    `Reply to this email to answer ${lead.name}. It's also in your Leads inbox: ${inbox}`,
  ].join("\n");
  return { subject, html, text };
}
