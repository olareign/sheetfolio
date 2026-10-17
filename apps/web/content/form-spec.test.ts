import { describe, expect, it } from "vitest";
import { collectionFields } from "./cms";
import { describeFields, humanize, issuesToFieldErrors } from "./form-spec";
import { Profile, SettingsInput } from "./schemas";

const byName = (fields: ReturnType<typeof describeFields>) => Object.fromEntries(fields.map((f) => [f.name, f]));

describe("describeFields (PRD §4.2 mapping)", () => {
  const project = byName(collectionFields("projects"));

  it("skips the id and keeps schema order", () => {
    expect(project.id).toBeUndefined();
    expect(collectionFields("projects")[0]?.name).toBe("drawingNo");
  });

  it("takes labels from .describe()", () => {
    expect(project.title?.label).toBe("Project title");
    expect(project.endYear?.label).toBe("End year");
  });

  it("maps each Zod type to its input", () => {
    expect(project.title).toMatchObject({ kind: "text", required: true, maxLength: 160 });
    expect(project.scope).toMatchObject({ kind: "textarea", required: false, wide: true }); // max 2000 > 200
    expect(project.startYear).toMatchObject({ kind: "number", required: true });
    expect(project.endYear).toMatchObject({ kind: "number", required: false });
    expect(project.featured).toMatchObject({ kind: "checkbox", required: false });
    expect(project.images).toMatchObject({ kind: "images", wide: true });
    expect(project.experienceId).toMatchObject({ kind: "relation", relation: "experiences", required: false });
  });

  it("lists enum options with readable labels", () => {
    expect(project.category?.kind).toBe("select");
    expect(project.category?.options).toContainEqual({ value: "external-works", label: "External works" });
    expect(project.status?.options?.map((o) => o.label)).toEqual(["Completed", "Ongoing"]);
  });

  it("treats url fields as uploads, with per-field kinds", () => {
    expect(byName(collectionFields("certifications")).fileUrl).toMatchObject({ kind: "upload", upload: "document" });
    expect(byName(describeFields(Profile)).avatar).toMatchObject({ kind: "upload", upload: "image" });
  });

  it("flags defaulted selects so they offer no blank option", () => {
    expect(byName(describeFields(SettingsInput)).theme).toMatchObject({
      kind: "select",
      required: false,
      hasDefault: true,
    });
    expect(project.status).toMatchObject({ required: true, hasDefault: false });
  });

  it("recognises email fields", () => {
    expect(byName(describeFields(SettingsInput)).publicEmail?.kind).toBe("email");
  });

  it("does not render object fields it can't map", () => {
    const names = describeFields(Profile).map((f) => f.name);
    expect(names).not.toContain("private");
    expect(names).not.toContain("visibility");
  });
});

describe("humanize", () => {
  it.each([
    ["external-works", "External works"],
    ["endYear", "End year"],
    ["completed", "Completed"],
  ])("%s → %s", (input, out) => expect(humanize(input)).toBe(out));
});

describe("issuesToFieldErrors", () => {
  it("keys by dotted path, keeps the first message per field, pathless under ''", () => {
    expect(
      issuesToFieldErrors([
        { path: ["images", 0, "url"], message: "Bad URL" },
        { path: ["title"], message: "Required" },
        { path: ["title"], message: "Second" },
        { path: [], message: "Whole form" },
      ]),
    ).toEqual({ "images.0.url": "Bad URL", title: "Required", "": "Whole form" });
  });
});
