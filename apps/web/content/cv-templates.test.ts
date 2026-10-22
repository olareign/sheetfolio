import { describe, expect, it } from "vitest";
import {
  CV_TEMPLATE_IDS,
  CV_TEMPLATES,
  DEFAULT_CV_TEMPLATE,
  offeredCvTemplates,
  publicCvTemplate,
  parseCvTemplate,
} from "./cv-templates";

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

describe("offeredCvTemplates", () => {
  const offered = (cvTemplate: (typeof CV_TEMPLATE_IDS)[number], cvTemplates: (typeof CV_TEMPLATE_IDS)[number][]) =>
    offeredCvTemplates({ cvTemplate, cvTemplates });

  it("lists the owner's choice with the default first and the rest in the usual order", () => {
    expect(offered("projects", ["minimal", "classic", "projects"])).toEqual(["projects", "classic", "minimal"]);
    expect(offered("modern", [...CV_TEMPLATE_IDS])).toEqual(["modern", "classic", "projects", "minimal"]);
  });

  it("offers a single layout when only one is chosen", () => {
    expect(offered("classic", ["classic"])).toEqual(["classic"]);
  });

  it("never offers a layout the owner did not choose", () => {
    expect(offered("classic", ["classic", "minimal"])).not.toContain("modern");
  });

  it("repairs a default that is not among the chosen layouts by leading with the first chosen one", () => {
    expect(offered("modern", ["minimal", "classic"])).toEqual(["classic", "minimal"]);
  });

  it("treats a missing setting (a document saved before it existed) as every layout with the usual default", () => {
    expect(offeredCvTemplates({})).toEqual(["modern", "classic", "projects", "minimal"]);
    expect(offeredCvTemplates({ cvTemplate: "classic" })).toEqual(["classic", "modern", "projects", "minimal"]);
    expect(offeredCvTemplates({ cvTemplates: ["minimal"] })).toEqual(["minimal"]);
  });

  it("repeats nothing and never returns an empty list, even for an empty setting", () => {
    expect(offered("classic", ["classic", "classic", "minimal"])).toEqual(["classic", "minimal"]);
    expect(offered("classic", [])).toEqual(["classic"]);
  });
});

describe("publicCvTemplate", () => {
  it("is the owner's chosen layout", () => {
    expect(publicCvTemplate({ cvTemplate: "classic", cvTemplates: ["classic"] })).toBe("classic");
    expect(publicCvTemplate({ cvTemplate: "minimal", cvTemplates: ["classic", "minimal"] })).toBe("minimal");
  });
  it("falls back sensibly for documents saved before the setting existed", () => {
    expect(publicCvTemplate({})).toBe("modern");
    expect(publicCvTemplate({ cvTemplates: ["projects"] })).toBe("projects");
  });
});
