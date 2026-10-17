import { afterEach, describe, expect, it, vi } from "vitest";
import { parseEnv } from "../config/env.js";
import { EmailError, EmailService, type Email } from "./email.service.js";

const email: Email = { to: "ada@example.com", subject: "Hi", text: "Hello", html: "<p>Hello</p>" };
const withKey = () =>
  new EmailService(parseEnv({ RESEND_API_KEY: "re_test", RESEND_FROM: "Sheetfolio <hello@owanbespace.com>" }));

afterEach(() => vi.unstubAllGlobals());

describe("EmailService", () => {
  it("prints instead of sending outside production without a key", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const service = new EmailService(parseEnv({}));

    expect(service.transport).toBe("console");
    await service.send(email);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("always uses Resend in production", () => {
    const env = parseEnv({ NODE_ENV: "production", RESEND_API_KEY: "re_test", WEB_ORIGIN: "https://a.example" });
    expect(new EmailService(env).transport).toBe("resend");
  });

  it("posts the message to Resend with the configured sender and key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await withKey().send({ ...email, replyTo: "visitor@example.com" });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(new Headers(init.headers).get("Authorization")).toBe("Bearer re_test");
    expect(JSON.parse(init.body as string)).toEqual({
      from: "Sheetfolio <hello@owanbespace.com>",
      to: "ada@example.com",
      subject: "Hi",
      text: "Hello",
      html: "<p>Hello</p>",
      reply_to: "visitor@example.com",
    });
  });

  it("omits reply_to when none is given", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await withKey().send(email);

    const body = JSON.parse((fetchMock.mock.calls[0] as [string, RequestInit])[1].body as string);
    expect(body).not.toHaveProperty("reply_to");
  });

  it("surfaces Resend's reason and status when a send is refused", async () => {
    const refusal = JSON.stringify({ message: "The owanbespace.com domain is not verified" });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(refusal, { status: 403 })));

    const error = await withKey()
      .send(email)
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(EmailError);
    expect(error).toMatchObject({
      status: 403,
      message: "Resend responded 403: The owanbespace.com domain is not verified",
    });
  });

  it("falls back to the status text when the refusal body is not JSON", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("<html>", { status: 502, statusText: "Bad Gateway" })),
    );
    await expect(withKey().send(email)).rejects.toThrow("Resend responded 502: Bad Gateway");
  });

  it("wraps network failures in an EmailError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    await expect(withKey().send(email)).rejects.toThrow(new EmailError("Resend unreachable: fetch failed"));
  });
});
