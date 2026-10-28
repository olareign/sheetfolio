import { describe, expect, it } from "vitest";
import { missingRequired, setupLocked, STEP_IDS } from "./setup";

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

describe("setupLocked", () => {
  const empty = { summary: "", location: "", whatsapp: "", published: false, skipped: false };
  const ready = { ...empty, summary: "Builds.", location: "Lagos", whatsapp: "2348012345678" };

  it("holds a new page that is missing the basics", () => {
    expect(setupLocked(empty)).toBe(true);
    expect(setupLocked({ ...ready, whatsapp: "" })).toBe(true);
  });

  it("lets go once the basics are in", () => {
    expect(setupLocked(ready)).toBe(false);
  });

  it("lets go when the owner skips", () => {
    expect(setupLocked({ ...empty, skipped: true })).toBe(false);
  });

  it("never holds a page that is already live", () => {
    expect(setupLocked({ ...empty, published: true })).toBe(false);
  });
});
