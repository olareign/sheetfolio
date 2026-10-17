import { Inject, Injectable, Logger } from "@nestjs/common";
import { ENV, type Env } from "../config/env.js";

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
export type EmailTransport = "resend" | "console";

const RESEND_URL = "https://api.resend.com/emails";
const TIMEOUT_MS = 10_000;

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);

  constructor(@Inject(ENV) private readonly env: Env) {}

  /** "console" only outside production without a key; production always sends through Resend. */
  get transport(): EmailTransport {
    return this.env.NODE_ENV !== "production" && !this.env.RESEND_API_KEY ? "console" : "resend";
  }

  async send(email: Email): Promise<void> {
    if (this.transport === "console") {
      this.logger.log(`[console mail] ${email.subject}`, { to: email.to, replyTo: email.replyTo, text: email.text });
      return;
    }

    let res: Response;
    try {
      res = await fetch(RESEND_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${this.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.env.RESEND_FROM,
          to: email.to,
          subject: email.subject,
          text: email.text,
          html: email.html,
          ...(email.replyTo && { reply_to: email.replyTo }),
        }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (cause) {
      throw new EmailError(`Resend unreachable: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
    if (!res.ok) throw new EmailError(`Resend responded ${res.status}: ${await resendReason(res)}`, res.status);
  }
}

/** Resend's own explanation (e.g. "domain is not verified"). It describes the request, never the key. */
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
