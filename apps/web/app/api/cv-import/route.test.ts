import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { cvModel } from "@/content/cv";
import { PublishableSite } from "@/content/schemas";
import { CV_LAYOUTS } from "@/lib/cv-layouts";
import { renderCv } from "@/lib/cv-pdf";

const state = vi.hoisted(() => ({
  email: "ada@example.com" as string | null,
  slug: "ada-obi" as string | null,
  allowed: true,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => (state.email ? { user: { email: state.email } } : null) }));
vi.mock("@/lib/accounts", () => ({ getUserRecord: async () => (state.slug ? { slug: state.slug } : null) }));
vi.mock("@/lib/ratelimit", () => ({ allowCvImport: async () => state.allowed }));

const { POST } = await import("./route");

const post = (file?: File | string) => {
  const form = new FormData();
  if (file !== undefined) form.set("cv", file);
  return POST(new Request("https://sheetfolio.example/api/cv-import", { method: "POST", body: form }));
};
const pdfFile = (bytes: BlobPart, name = "cv.pdf") => new File([bytes], name, { type: "application/pdf" });

beforeEach(() => {
  state.email = "ada@example.com";
  state.slug = "ada-obi";
  state.allowed = true;
});

describe("POST /api/cv-import", () => {
  it("reads a real CV and returns what it found, without saving anything", async () => {
    const file = JSON.parse(readFileSync("seed/abdulrasaq.json", "utf8")) as { site: object };
    const site = PublishableSite.parse({ ...file.site, updatedAt: "2026-10-21T00:00:00.000Z" });
    const pdf = await renderCv(cvModel(site, "https://sheetfolio.example/x"), "modern", CV_LAYOUTS.modern);

    const res = await post(pdfFile(new Uint8Array(pdf)));
    expect(res.status).toBe(200);
    const { cv } = await res.json();
    expect(cv.name).toBe(site.profile.name);
    expect(cv.experiences.length).toBe(site.experiences.length);
  }, 60_000);

  it("needs a signed-in owner", async () => {
    state.email = null;
    expect((await post(pdfFile("%PDF-1.7"))).status).toBe(401);
    state.email = "ada@example.com";
    state.slug = null;
    expect((await post(pdfFile("%PDF-1.7"))).status).toBe(401);
  });

  it("slows down someone who imports too often", async () => {
    state.allowed = false;
    expect((await post(pdfFile("%PDF-1.7"))).status).toBe(429);
  });

  it("explains each way a file can be refused", async () => {
    expect((await post()).status).toBe(400);
    expect((await post("not a file")).status).toBe(400);
    const notPdf = await post(pdfFile("hello world, this is plain text"));
    expect(notPdf.status).toBe(422);
    expect((await notPdf.json()).error).toContain("not a PDF");
    expect((await post(pdfFile(new Uint8Array(4 * 1024 * 1024 + 1)))).status).toBe(413);
    expect((await post(pdfFile(new Uint8Array()))).status).toBe(400);
  });
});
