import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  email: "ada@example.com" as string | null,
  slug: "ada-obi" as string | null,
  cloudinary: { cloudName: "demo", apiKey: "key", apiSecret: "secret" } as object | undefined,
}));
vi.mock("@/lib/auth", () => ({ auth: async () => (state.email ? { user: { email: state.email } } : null) }));
vi.mock("@/lib/accounts", () => ({ getUserRecord: async () => (state.slug ? { slug: state.slug } : null) }));
vi.mock("@/lib/env", () => ({ env: () => ({ CLOUDINARY_URL: state.cloudinary }) }));

const { POST } = await import("./route");

const post = (body: unknown) =>
  POST(new Request("https://dosinex.example/api/upload", { method: "POST", body: JSON.stringify(body) }));

beforeEach(() => {
  state.email = "ada@example.com";
  state.slug = "ada-obi";
  state.cloudinary = { cloudName: "demo", apiKey: "key", apiSecret: "secret" };
});

describe("POST /api/upload", () => {
  it("signs an upload into the owner's own folder", async () => {
    const res = await post({ pathname: "ada-obi/profile/photo.png", kind: "image" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.fields.folder).toBe("dosinex/ada-obi/profile");
    expect(body.fields.allowed_formats).toBe("jpg,png,webp");
    expect(body.apiKey).toBe("key");
    expect(JSON.stringify(body)).not.toContain("secret");
  });

  it("allows PDFs only for documents", async () => {
    const doc = await (await post({ pathname: "ada-obi/certifications/c.pdf", kind: "document" })).json();
    expect(doc.fields.allowed_formats).toContain("pdf");
  });

  it("refuses a path under someone else's slug or with odd segments", async () => {
    for (const pathname of [
      "other-person/profile/a.png",
      "ada-obi/a.png",
      "ada-obi/../x/a.png",
      "ada-obi/Pro file/a.png",
    ]) {
      expect((await post({ pathname, kind: "image" })).status).toBe(403);
    }
  });

  it("needs a signed-in owner with a page", async () => {
    state.email = null;
    expect((await post({ pathname: "ada-obi/profile/a.png", kind: "image" })).status).toBe(401);
    state.email = "ada@example.com";
    state.slug = null;
    expect((await post({ pathname: "ada-obi/profile/a.png", kind: "image" })).status).toBe(401);
  });

  it("says plainly when Cloudinary is not set up", async () => {
    state.cloudinary = undefined;
    const res = await post({ pathname: "ada-obi/profile/a.png", kind: "image" });
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("CLOUDINARY_URL");
  });

  it("rejects a malformed body", async () => {
    expect((await post({ kind: "image" })).status).toBe(400);
    expect((await post({ pathname: "ada-obi/profile/a.png", kind: "video" })).status).toBe(400);
  });
});
