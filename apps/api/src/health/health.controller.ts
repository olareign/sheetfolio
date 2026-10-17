import { Controller, Get } from "@nestjs/common";
import { EmailService, type EmailTransport } from "../email/email.service.js";

@Controller("health")
export class HealthController {
  constructor(private readonly email: EmailService) {}

  /** Liveness for the host, plus which mail transport is active, so a misconfigured deploy is visible. */
  @Get()
  check(): { status: "ok"; email: EmailTransport } {
    return { status: "ok", email: this.email.transport };
  }
}
