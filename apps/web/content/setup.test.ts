import { describe, expect, it } from "vitest";
import { missingRequired, STEP_IDS } from "./setup";

describe("missingRequired", () => {
  it("lists what a page still needs, with the step that fixes each", () => {
    expect(missingRequired({ summary: "", location: " ", whatsapp: "" })).toEqual([
      { step: "about", label: "A short summary of who you are" },
      { step: "about", label: "Your base location" },
      { step: "contact", label: "A WhatsApp number" },
    ]);
  });

  it("is empty once the three required things are there", () => {
    expect(missingRequired({ summary: "Builds.", location: "Lagos", whatsapp: "2348012345678" })).toEqual([]);
  });

  it("only points at steps that exist", () => {
    for (const m of missingRequired({ summary: "", location: "", whatsapp: "" })) expect(STEP_IDS).toContain(m.step);
  });
});
