import { describe, expect, it } from "vitest";
import { enquiryEmail, escapeHtml, passwordChangedEmail, passwordResetEmail } from "./email-templates";

const lead = {
  name: 'Ada <script>alert("x")</script>',
  email: "ada@example.com",
  company: "Acme & Sons",
  message: "Line one\nLine <b>two</b>",
  createdAt: "2026-09-29T07:30:00.000Z",
};

describe("enquiryEmail", () => {
  const mail = enquiryEmail({ lead, firstName: "Idris", slug: "idris-rasaq", origin: "https://dosinex.com/" });

  it("escapes every visitor-supplied value in HTML", () => {
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("Ada &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(mail.html).toContain("Acme &amp; Sons");
    expect(mail.html).toContain("Line <b>two</b>".replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  });

  it("addresses the engineer and links to the page, inbox and a reply", () => {
    expect(mail.subject).toBe(`New enquiry from ${lead.name}`);
    expect(mail.html).toContain("Hi Idris,");
    expect(mail.html).toContain("https://dosinex.com/dashboard/leads");
    expect(mail.html).toContain("https://dosinex.com/idris-rasaq");
    expect(mail.html).toContain("mailto:ada@example.com?subject=Re%3A%20your%20enquiry");
    expect(mail.html).toContain("Made with Dosinex");
  });

  it("has a plain-text version with the full message and details", () => {
    expect(mail.text).toContain("Line one\nLine <b>two</b>");
    expect(mail.text).toContain("Company / project: Acme & Sons");
    expect(mail.text).toContain("Received: Tue, 29 Sep 2026 07:30:00 UTC");
    expect(mail.text).toContain("https://dosinex.com/dashboard/leads");
  });

  it("omits the company row when none was given", () => {
    const { text, html } = enquiryEmail({
      lead: { ...lead, company: undefined },
      firstName: "Idris",
      slug: "idris-rasaq",
      origin: "https://dosinex.com",
    });
    expect(text).not.toContain("Company");
    expect(html).not.toContain("Company / project");
  });
});

describe("email header", () => {
  it("shows the logo from the site the link points to, with the name as alt text", () => {
    const reset = passwordResetEmail({
      url: "https://dosinex.com/reset-password?token=abc",
      email: "idris@example.com",
      expiresInMinutes: 60,
    });
    const changed = passwordChangedEmail({
      email: "idris@example.com",
      changedAt: new Date("2026-09-29T07:30:00.000Z"),
      resetUrl: "https://dosinex.com/forgot-password",
    });
    const enquiry = enquiryEmail({ lead, firstName: "Idris", slug: "idris-rasaq", origin: "https://dosinex.com/" });
    for (const mail of [reset, changed, enquiry]) {
      expect(mail.html).toContain('<img src="https://dosinex.com/brand/dosinex-logo-email.png" alt="Dosinex"');
    }
  });
});

describe("escapeHtml", () => {
  it("escapes the five significant characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});

describe("passwordResetEmail", () => {
  const url = "https://dosinex.com/reset-password?token=abc_DEF-123";
  const mail = passwordResetEmail({ url, email: "idris@example.com", expiresInMinutes: 60 });

  it("names the account, the expiry and what to do if it was not requested", () => {
    expect(mail.subject).toBe("Reset your Dosinex password");
    expect(mail.html).toContain("idris@example.com");
    expect(mail.html).toContain("expires in 1 hour");
    expect(mail.text).toContain("expires in 1 hour");
    expect(mail.text).toContain("Ignore this email");
  });

  it("carries the link in the button and in plain text", () => {
    expect(mail.html).toContain(`href="${url}"`);
    expect(mail.text).toContain(url);
  });

  it("escapes the address in HTML", () => {
    const hostile = passwordResetEmail({ url, email: '"><script>x</script>@e.co', expiresInMinutes: 60 });
    expect(hostile.html).not.toContain("<script>");
  });
});

describe("passwordChangedEmail", () => {
  const mail = passwordChangedEmail({
    email: "idris@example.com",
    changedAt: new Date("2026-10-21T09:30:00.000Z"),
    resetUrl: "https://dosinex.com/forgot-password",
  });

  it("states what changed, when (in UTC), and that every device was signed out", () => {
    expect(mail.subject).toBe("Your Dosinex password was changed");
    expect(mail.html).toContain("idris@example.com");
    expect(mail.text).toContain("Wed, 21 Oct 2026 09:30:00 UTC");
    expect(mail.text).toContain("Every device was signed out");
  });

  it("gives a way back in if it was not the owner", () => {
    expect(mail.html).toContain('href="https://dosinex.com/forgot-password"');
    expect(mail.text).toContain("If this wasn't you");
    expect(mail.text).toContain("https://dosinex.com/forgot-password");
  });

  it("never contains a password or a token", () => {
    expect(mail.text).not.toMatch(/token|password:/i);
  });
});
