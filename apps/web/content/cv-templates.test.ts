import { describe, expect, it } from "vitest";
import { CV_TEMPLATE_IDS, CV_TEMPLATES, DEFAULT_CV_TEMPLATE, parseCvTemplate } from "./cv-templates";

describe("CV templates", () => {
  it("offers the four chosen layouts, each with a label and description", () => {
    expect(CV_TEMPLATE_IDS).toEqual(["classic", "modern", "projects", "minimal"]);
    for (const id of CV_TEMPLATE_IDS) {
      expect(CV_TEMPLATES[id].label).toBeTruthy();
      expect(CV_TEMPLATES[id].description.endsWith(".")).toBe(true);
    }
  });

  it("defaults to a template that exists", () => {
    expect(CV_TEMPLATE_IDS).toContain(DEFAULT_CV_TEMPLATE);
  });

  it("parses known ids and rejects everything else", () => {
    expect(parseCvTemplate("classic")).toBe("classic");
    for (const bad of ["", "Classic", "fancy", "../etc", null, undefined, 3, ["modern"]]) {
      expect(parseCvTemplate(bad)).toBeNull();
    }
  });
});
