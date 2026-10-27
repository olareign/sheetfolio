import { describe, expect, it } from "vitest";
import { parseCloudinaryUrl, signParams, signUpload } from "./cloudinary";

describe("parseCloudinaryUrl", () => {
  it("reads the key, secret and cloud name from the dashboard's environment variable", () => {
    expect(parseCloudinaryUrl("cloudinary://123456:s3cr3t_-x@my-cloud")).toEqual({
      apiKey: "123456",
      apiSecret: "s3cr3t_-x",
      cloudName: "my-cloud",
    });
  });

  it.each(["", "https://my-cloud", "cloudinary://onlykey@cloud", "cloudinary://k:s@", "cloudinary://k:s@a b"])(
    "rejects %j",
    (raw) => expect(parseCloudinaryUrl(raw)).toBeNull(),
  );
});

describe("signParams", () => {
  it("matches the signature in Cloudinary's own documentation", () => {
    const signature = signParams(
      { eager: "w_400,h_300,c_pad|w_260,h_200,c_crop", public_id: "sample_image", timestamp: 1315060510 },
      "abcd",
    );
    expect(signature).toBe("bfd09f95f331f558cbd1320e67aa8d488770583e");
  });

  it("does not depend on the order the parameters were written in", () => {
    expect(signParams({ b: 2, a: 1 }, "s")).toBe(signParams({ a: 1, b: 2 }, "s"));
  });

  it("changes when a signed value or the secret changes", () => {
    const base = signParams({ folder: "dosinex/a/projects", timestamp: 1 }, "s");
    expect(signParams({ folder: "dosinex/b/projects", timestamp: 1 }, "s")).not.toBe(base);
    expect(signParams({ folder: "dosinex/a/projects", timestamp: 1 }, "other")).not.toBe(base);
  });
});

describe("signUpload", () => {
  const cfg = { cloudName: "demo", apiKey: "key", apiSecret: "secret" };
  const now = new Date("2026-10-22T12:00:00.000Z");

  it("signs exactly the fields it returns, so the browser can't change the folder or formats", () => {
    const signed = signUpload(cfg, { folder: "dosinex/ada/profile", formats: ["jpg", "png"], now });
    expect(signed.uploadUrl).toBe("https://api.cloudinary.com/v1_1/demo/auto/upload");
    expect(signed.fields).toEqual({
      allowed_formats: "jpg,png",
      folder: "dosinex/ada/profile",
      timestamp: String(Math.floor(now.getTime() / 1000)),
      unique_filename: "true",
      use_filename: "true",
    });
    expect(signed.signature).toBe(signParams(signed.fields, "secret"));
  });

  it("never includes the API secret in what is sent to the browser", () => {
    expect(JSON.stringify(signUpload(cfg, { folder: "f", formats: ["jpg"], now }))).not.toContain("secret");
  });
});
