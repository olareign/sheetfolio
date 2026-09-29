import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("./env", () => ({
  usesConsoleMail: () => false,
  env: () => ({ AUTH_RESEND_KEY: "re_test_key", RESEND_FROM: "Sheetfolio <no-reply@example.com>" }),
}));

const { sendEmail, EmailError } = await import("./email");
const email = { to: "a@example.com", subject: "S", text: "T", html: "<p>T</p>" };

afterEach(() => vi.unstubAllGlobals());

describe("sendEmail", () => {
  it("puts Resend's reason in the error so a 403 is diagnosable (and never the key)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ statusCode: 403, message: "The example.com domain is not verified." }, { status: 403 }),
      ),
    );
    const err = await sendEmail(email).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(EmailError);
    expect((err as Error).message).toBe("Resend responded 403: The example.com domain is not verified.");
    expect((err as Error).message).not.toContain("re_test_key");
  });

  it("falls back to the status text for a non-JSON error", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("oops", { status: 502, statusText: "Bad Gateway" })),
    );
    await expect(sendEmail(email)).rejects.toThrow("Resend responded 502: Bad Gateway");
  });

  it("sends from RESEND_FROM with reply-to", async () => {
    const fetchMock = vi.fn<(url: string, init: RequestInit) => Promise<Response>>(async () =>
      Response.json({ id: "1" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    await sendEmail({ ...email, replyTo: "v@example.com" });
    const body = JSON.parse(String(fetchMock.mock.calls[0]?.[1].body));
    expect(body).toMatchObject({
      from: "Sheetfolio <no-reply@example.com>",
      to: "a@example.com",
      reply_to: "v@example.com",
    });
  });
});
