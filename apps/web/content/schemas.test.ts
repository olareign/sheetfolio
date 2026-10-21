import { describe, expect, it } from "vitest";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  createEmptySite,
  NewPassword,
  Project,
  PublishableSite,
  Site,
  Slug,
  Username,
} from "./schemas";

const now = new Date("2026-09-28T10:00:00.000Z");
const empty = () =>
  createEmptySite({
    name: "Rasaq Idris Olawale",
    firstName: "Idris",
    headline: "Site Engineer",
    publicEmail: "i@example.com",
    now,
  });

const project = (over: Record<string, unknown> = {}) => ({
  id: "p1",
  drawingNo: "SP-001",
  title: "Geriatric Centre",
  location: "Surulere, Lagos",
  category: "healthcare",
  role: "Site Engineer",
  startYear: 2024,
  status: "completed",
  ...over,
});

describe("createEmptySite", () => {
  it("produces a valid Site with empty collections", () => {
    const site = empty();
    expect(Site.safeParse(site).success).toBe(true);
    expect(site.projects).toEqual([]);
    expect(site.experiences).toEqual([]);
    expect(site.settings).toEqual({ theme: "sheet", status: "draft", cvTemplate: "modern" });
    expect(site.updatedAt).toBe(now.toISOString());
    expect(site.publishedAt).toBeUndefined();
  });

  it("hides every private field by default", () => {
    const { visibility } = empty().profile;
    expect(Object.values(visibility).every((v) => v === false)).toBe(true);
    expect(Object.keys(visibility).sort()).toEqual(
      ["dateOfBirth", "maritalStatus", "nationality", "placeOfBirth", "referees", "stateOfOrigin"].sort(),
    );
  });

  it("uses the PRD default WhatsApp message with the first name", () => {
    expect(empty().profile.whatsappMessage).toBe(
      "Hi Idris, I saw your profile on Sheetfolio and would like to discuss a project.",
    );
  });

  it("rejects a missing name", () => {
    expect(() =>
      createEmptySite({ name: " ", firstName: "I", headline: "H", publicEmail: "i@example.com", now }),
    ).toThrow();
  });
});

describe("Slug", () => {
  it.each(["idris-rasaq", "abc", "a1-b2-c3"])("accepts %s", (s) => {
    expect(Slug.safeParse(s).success).toBe(true);
  });

  it("normalises case and whitespace", () => {
    expect(Slug.parse("  Idris-Rasaq ")).toBe("idris-rasaq");
  });

  it.each(["ab", "-abc", "abc-", "a--b", "a_b", "a b", "dashboard", "api", "login", "preview", "x".repeat(41)])(
    "rejects %s",
    (s) => {
      expect(Slug.safeParse(s).success).toBe(false);
    },
  );
});

describe("Project", () => {
  it("accepts a project with no photos and defaults the rest", () => {
    const p = Project.parse(project());
    expect(p.images).toEqual([]);
    expect(p.featured).toBe(false);
    expect(p.scope).toBe("");
  });

  it("rejects an end year before the start year", () => {
    const r = Project.safeParse(project({ startYear: 2024, endYear: 2020 }));
    expect(r.success).toBe(false);
    expect(r.error?.issues[0]?.path).toEqual(["endYear"]);
  });

  it("rejects two cover photos", () => {
    const img = { url: "https://example.com/a.jpg", isCover: true };
    expect(Project.safeParse(project({ images: [img, img] })).success).toBe(false);
  });

  it("rejects more than 12 photos", () => {
    const images = Array.from({ length: 13 }, (_, i) => ({ url: `https://example.com/${i}.jpg`, isCover: i === 0 }));
    expect(Project.safeParse(project({ images })).success).toBe(false);
  });

  it("rejects a malformed drawing number and unknown category", () => {
    expect(Project.safeParse(project({ drawingNo: "4" })).success).toBe(false);
    expect(Project.safeParse(project({ category: "bridge" })).success).toBe(false);
  });
});

describe("PublishableSite", () => {
  it("blocks publishing an empty draft and says why", () => {
    const r = PublishableSite.safeParse(empty());
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path.join("."))).toEqual([
      "profile.summary",
      "profile.location",
      "profile.whatsapp",
    ]);
  });

  it("allows publishing once the essentials are filled in", () => {
    const site = empty();
    site.profile = {
      ...site.profile,
      summary: "Site engineer.",
      location: "Akure, Ondo State",
      whatsapp: "2347033435818",
    };
    expect(PublishableSite.safeParse(site).success).toBe(true);
  });
});

describe("Username", () => {
  it("lowercases and trims, and accepts single separators between letters and digits", () => {
    expect(Username.parse("  Ada.Lovelace-1815 ")).toBe("ada.lovelace-1815");
    expect(Username.parse("idris-rasaq")).toBe("idris-rasaq");
  });

  it.each(["ab", "x".repeat(31), "has space", "-lead", "trail-", "dou..ble", "semi;colon", "emoji🙂ok", "a@b.com"])(
    "rejects %j",
    (value) => {
      expect(Username.safeParse(value).success).toBe(false);
    },
  );
});

describe("NewPassword", () => {
  it("accepts 10 to 128 characters, spaces included", () => {
    expect(NewPassword.safeParse("a".repeat(10)).success).toBe(true);
    expect(NewPassword.safeParse("correct horse battery staple").success).toBe(true);
    expect(NewPassword.safeParse("a".repeat(128)).success).toBe(true);
  });

  it("rejects 9 characters and 129 characters", () => {
    expect(NewPassword.safeParse("a".repeat(9)).success).toBe(false);
    expect(NewPassword.safeParse("a".repeat(129)).success).toBe(false);
  });
});

describe("project categories", () => {
  it("labels every category, so no project can render without a tag", () => {
    for (const category of CATEGORIES) expect(CATEGORY_LABELS[category]).toBeTruthy();
  });

  it("accepts a software category on a project", () => {
    expect(Project.safeParse(project({ category: "fintech" })).success).toBe(true);
  });
});

describe("settings.cvTemplate", () => {
  it("defaults to modern, so a site saved before templates existed still loads", () => {
    const stored = { ...empty(), settings: { theme: "blueprint", status: "published" } };
    expect(Site.parse(stored).settings.cvTemplate).toBe("modern");
  });

  it("accepts the four templates and rejects anything else", () => {
    for (const cvTemplate of ["classic", "modern", "projects", "minimal"]) {
      expect(Site.safeParse({ ...empty(), settings: { cvTemplate } }).success).toBe(true);
    }
    expect(Site.safeParse({ ...empty(), settings: { cvTemplate: "fancy" } }).success).toBe(false);
  });
});
