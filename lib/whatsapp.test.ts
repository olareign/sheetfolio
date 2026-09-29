import { describe, expect, it } from "vitest";
import { telLink, whatsappLink } from "./whatsapp";

describe("whatsappLink", () => {
  it("builds a wa.me link with an encoded message", () => {
    expect(whatsappLink("2347033435818", "Hi Idris, a project & more?")).toBe(
      "https://wa.me/2347033435818?text=Hi%20Idris%2C%20a%20project%20%26%20more%3F",
    );
  });
  it("strips formatting from the number and adds context", () => {
    expect(whatsappLink("+234 703-343", "Hi", "SP-004")).toBe("https://wa.me/234703343?text=Hi%20(SP-004)");
  });
  it("omits text when the message is empty", () => {
    expect(whatsappLink("2347033435818", "")).toBe("https://wa.me/2347033435818");
  });
});

describe("telLink", () => {
  it("keeps a leading plus and drops spaces", () => expect(telLink("+234 703 343 5818")).toBe("tel:+2347033435818"));
  it("handles local numbers", () => expect(telLink("0806 006 2556")).toBe("tel:08060062556"));
});
