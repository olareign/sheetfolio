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
  if (!res.ok) throw new EmailError(`Resend responded ${res.status}: ${await resendReason(res)}`, res.status);
}

/**
 * Resend's own explanation (e.g. "The example.com domain is not verified"), so a 403 is diagnosable
 * from the logs. It describes the request, never the key.
 */
async function resendReason(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json();
    if (typeof body === "object" && body !== null && "message" in body && typeof body.message === "string") {
      return body.message.slice(0, 300);
    }
  } catch {
    // non-JSON body
  }
  return res.statusText || "no details";
}
