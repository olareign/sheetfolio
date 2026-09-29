import { describe, expect, it } from "vitest";
import { enquiryEmail, escapeHtml, signInEmail } from "./email-templates";

const lead = {
  name: 'Ada <script>alert("x")</script>',
  email: "ada@example.com",
  company: "Acme & Sons",
  message: "Line one\nLine <b>two</b>",
  createdAt: "2026-09-29T07:30:00.000Z",
};

describe("signInEmail", () => {
  const mail = signInEmail({
    url: "https://sheetfolio.app/api/auth/callback/resend?token=abc&email=a%40b.com",
    email: "idris@example.com",
    expiresInMinutes: 60,
  });

  it("is branded and names the account and expiry", () => {
    expect(mail.subject).toBe("Your Sheetfolio sign-in link");
    expect(mail.html).toContain("Sign in to Sheetfolio");
    expect(mail.html).toContain("idris@example.com");
    expect(mail.html).toContain("expires in 1 hour");
    expect(mail.text).toContain("expires in 1 hour");
  });

  it("puts the link in the button and in plain text, with & escaped in HTML only", () => {
    expect(mail.html).toContain('href="https://sheetfolio.app/api/auth/callback/resend?token=abc&amp;email=a%40b.com"');
    expect(mail.text).toContain("https://sheetfolio.app/api/auth/callback/resend?token=abc&email=a%40b.com");
  });

  it("formats other expiries", () => {
    expect(signInEmail({ url: "https://x", email: "a@b.c", expiresInMinutes: 30 }).text).toContain("30 minutes");
    expect(signInEmail({ url: "https://x", email: "a@b.c", expiresInMinutes: 120 }).text).toContain("2 hours");
  });
});

describe("enquiryEmail", () => {
  const mail = enquiryEmail({ lead, firstName: "Idris", slug: "idris-rasaq", origin: "https://sheetfolio.app/" });

  it("escapes every visitor-supplied value in HTML", () => {
    expect(mail.html).not.toContain("<script>");
    expect(mail.html).toContain("Ada &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;");
    expect(mail.html).toContain("Acme &amp; Sons");
    expect(mail.html).toContain("Line <b>two</b>".replace(/</g, "&lt;").replace(/>/g, "&gt;"));
  });

  it("addresses the engineer and links to the page, inbox and a reply", () => {
    expect(mail.subject).toBe(`New enquiry from ${lead.name}`);
    expect(mail.html).toContain("Hi Idris,");
    expect(mail.html).toContain("https://sheetfolio.app/dashboard/leads");
    expect(mail.html).toContain("https://sheetfolio.app/idris-rasaq");
    expect(mail.html).toContain("mailto:ada@example.com?subject=Re%3A%20your%20enquiry");
    expect(mail.html).toContain("Drawn on Sheetfolio");
  });

  it("has a plain-text version with the full message and details", () => {
    expect(mail.text).toContain("Line one\nLine <b>two</b>");
    expect(mail.text).toContain("Company / project: Acme & Sons");
    expect(mail.text).toContain("Received: Tue, 29 Sep 2026 07:30:00 UTC");
    expect(mail.text).toContain("https://sheetfolio.app/dashboard/leads");
  });

  it("omits the company row when none was given", () => {
    const { text, html } = enquiryEmail({
      lead: { ...lead, company: undefined },
      firstName: "Idris",
      slug: "idris-rasaq",
      origin: "https://sheetfolio.app",
    });
    expect(text).not.toContain("Company");
    expect(html).not.toContain("Company / project");
  });
});

describe("escapeHtml", () => {
  it("escapes the five significant characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe("&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;");
  });
});
