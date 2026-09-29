import "server-only";
import { env, usesConsoleMail } from "./env";

export class EmailError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "EmailError";
  }
}

export type Email = { to: string; subject: string; text: string; html: string; replyTo?: string };

/** Sends through Resend. In development without a key the email is printed to the server log instead. */
export async function sendEmail(email: Email): Promise<void> {
  if (usesConsoleMail()) {
    console.info(
      `\n[email] To: ${email.to}\nSubject: ${email.subject}\nReply-To: ${email.replyTo ?? "-"}\n\n${email.text}\n`,
    );
    return;
  }
  const { AUTH_RESEND_KEY, RESEND_FROM } = env();
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${AUTH_RESEND_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: email.to,
      subject: email.subject,
      text: email.text,
      html: email.html,
      ...(email.replyTo && { reply_to: email.replyTo }),
    }),
  });
  if (!res.ok) throw new EmailError(`Resend responded ${res.status}`, res.status);
}

/** Minimal HTML escaping for values interpolated into email bodies. */
export function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c,
  );
}
