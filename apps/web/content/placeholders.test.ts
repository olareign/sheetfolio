import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { PLACEHOLDERS, SLUG_PLACEHOLDER } from "./placeholders";
import { Slug } from "./schemas";

const REAL_PEOPLE = /rasaq|idris|olawale|abdulrasaq|taofeeq|olarewaju|olareign/i;

describe("form placeholders", () => {
  it("are generic templates, never a real user's details", () => {
    for (const [field, text] of Object.entries(PLACEHOLDERS)) expect(text, field).not.toMatch(REAL_PEOPLE);
    expect(SLUG_PLACEHOLDER).not.toMatch(REAL_PEOPLE);
  });

  it("use John Doe for the name fields", () => {
    expect(PLACEHOLDERS.name).toBe("John Doe");
    expect(PLACEHOLDERS.firstName).toBe("John");
    expect(SLUG_PLACEHOLDER).toBe("john-doe");
  });

  it("offer a slug that is itself a valid page address", () => {
    expect(Slug.safeParse(SLUG_PLACEHOLDER).success).toBe(true);
  });

  it("keeps hard-coded real names out of the sign-up form and the editor", () => {
    for (const file of ["app/(auth)/onboarding/OnboardingForm.tsx", "components/cms/FieldRenderer.tsx", "components/cms/ProfileEditor.tsx"]) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(REAL_PEOPLE);
    }
  });
});
