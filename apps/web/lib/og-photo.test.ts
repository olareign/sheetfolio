import { describe, expect, it } from "vitest";
import { loadOgPhoto, ogPhotoUrl } from "./og-photo";

const reply = (body: BodyInit, type: string, status = 200) =>
  (async () => new Response(body, { status, headers: { "content-type": type } })) as unknown as typeof fetch;

describe("ogPhotoUrl", () => {
  it("asks Cloudinary for a square, face-centred JPEG", () => {
    expect(ogPhotoUrl("https://res.cloudinary.com/demo/image/upload/v1/sheetfolio/ada/images/me.webp")).toBe(
      "https://res.cloudinary.com/demo/image/upload/c_fill,g_face,w_480,h_480,f_jpg,q_auto/v1/sheetfolio/ada/images/me.webp",
    );
  });

  it("leaves other addresses alone", () => {
    expect(ogPhotoUrl("https://example.com/me.jpg")).toBe("https://example.com/me.jpg");
    expect(ogPhotoUrl("not a url")).toBe("not a url");
  });
});

describe("loadOgPhoto", () => {
  it("returns a data URI for a JPEG", async () => {
    const out = await loadOgPhoto("https://example.com/a.jpg", reply(new Uint8Array([1, 2, 3]), "image/jpeg"));
    expect(out).toBe(`data:image/jpeg;base64,${Buffer.from([1, 2, 3]).toString("base64")}`);
  });

  it("refuses formats the renderer cannot read, failed requests and empty bodies", async () => {
    expect(await loadOgPhoto("https://example.com/a.webp", reply(new Uint8Array([1]), "image/webp"))).toBeNull();
    expect(await loadOgPhoto("https://example.com/a.jpg", reply("x", "image/jpeg", 404))).toBeNull();
    expect(await loadOgPhoto("https://example.com/a.jpg", reply(new Uint8Array(), "image/jpeg"))).toBeNull();
  });

  it("refuses pictures over 3 MB and non-https addresses", async () => {
    expect(
      await loadOgPhoto("https://example.com/a.jpg", reply(new Uint8Array(3 * 1024 * 1024 + 1), "image/png")),
    ).toBeNull();
    expect(await loadOgPhoto("http://example.com/a.jpg", reply(new Uint8Array([1]), "image/jpeg"))).toBeNull();
  });

  it("never throws when the network fails", async () => {
    const failing = (async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await loadOgPhoto("https://example.com/a.jpg", failing)).toBeNull();
  });
});
