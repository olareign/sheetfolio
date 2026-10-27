import { describe, expect, it } from "vitest";
import { parseCv, stampFor } from "./parse";

const NOW = new Date("2026-10-23T00:00:00.000Z");
const lines = (text: string) => text.trim().split("\n");

describe("parseCv: the app's own layout (role, company and dates on one line)", () => {
  const cv = parseCv(
    lines(`
Ada Obi
Site Engineer
Lagos, Nigeria | ada.obi@example.com | +234 801 234 5678 | dosinex.example/ada
SUMMARY
Builds roads and bridges across West Africa.
Leads site teams of 20+.
EXPERIENCE
Site Engineer, IJUNT Construction  2023 – Present
• Supervised the Ikorodu road.
• Managed 40 workers.
Graduate Engineer (NYSC), Pacific Works, Inc.  2022 – 2023
Intern, Lagos State Ministry of Works  2021
EDUCATION
B.Sc. (Hons) Civil Engineering  2016 – 2021
University of Lagos, Akoka
CERTIFICATIONS
COREN Registered Engineer  2024
`),
    NOW,
  );

  it("reads the contact details and the headline", () => {
    expect(cv).toMatchObject({
      name: "Ada Obi",
      headline: "Site Engineer",
      email: "ada.obi@example.com",
      phone: "+234 801 234 5678",
      location: "Lagos, Nigeria",
    });
  });

  it("joins the summary", () => {
    expect(cv.summary).toBe("Builds roads and bridges across West Africa. Leads site teams of 20+.");
  });

  it("reads each role with its company, years and notes", () => {
    expect(cv.experiences).toEqual([
      {
        role: "Site Engineer",
        company: "IJUNT Construction",
        startYear: "2023",
        endYear: "",
        notes: "Supervised the Ikorodu road. Managed 40 workers.",
      },
      {
        role: "Graduate Engineer (NYSC)",
        company: "Pacific Works, Inc.",
        startYear: "2022",
        endYear: "2023",
        notes: "",
      },
      { role: "Intern", company: "Lagos State Ministry of Works", startYear: "2021", endYear: "2021", notes: "" },
    ]);
  });

  it("works out years of experience from the earliest role", () => {
    expect(cv.yearsExperience).toBe("5");
  });

  it("reads education and certifications", () => {
    expect(cv.education).toEqual([
      {
        qualification: "B.Sc. (Hons) Civil Engineering",
        institution: "University of Lagos, Akoka",
        startYear: "2016",
        endYear: "2021",
      },
    ]);
    expect(cv.certifications).toEqual([{ title: "COREN Registered Engineer", issuer: "", year: "2024" }]);
  });
});

describe("parseCv: other common layouts", () => {
  it("reads a role on one line and the employer and dates on the next", () => {
    const cv = parseCv(
      lines(`
JOHN DOE
Registered Nurse
EXPERIENCE
Senior Nurse
Lagos University Teaching Hospital, Lagos    Jan 2018 – Present
• Led a ward of 30 nurses.
Staff Nurse
General Hospital, Ikeja    Mar 2014 – Dec 2017
`),
      NOW,
    );
    expect(cv.name).toBe("John Doe");
    expect(cv.experiences).toMatchObject([
      { role: "Senior Nurse", company: "Lagos University Teaching Hospital, Lagos", startYear: "2018", endYear: "" },
      { role: "Staff Nurse", company: "General Hospital, Ikeja", startYear: "2014", endYear: "2017" },
    ]);
    expect(cv.experiences[0]?.notes).toBe("Led a ward of 30 nurses.");
  });

  it("reads company, role and dates on three lines", () => {
    const cv = parseCv(
      lines(`
Kemi Balogun
Work Experience
Acme Builders Ltd
Project Manager
2019 - 2021
Managed three estates.
`),
      NOW,
    );
    expect(cv.experiences).toMatchObject([
      { role: "Project Manager", company: "Acme Builders Ltd", startYear: "2019", endYear: "2021" },
    ]);
  });

  it("reads pipe-separated headers with month names", () => {
    const cv = parseCv(
      lines(`
Tunde Bello
PROFESSIONAL EXPERIENCE
Architect | Studio Mono | Sept 2020 – Aug 2023
`),
      NOW,
    );
    expect(cv.experiences).toMatchObject([
      { role: "Architect", company: "Studio Mono", startYear: "2020", endYear: "2023" },
    ]);
  });

  it("reads education written on single lines, with one year or a range", () => {
    const cv = parseCv(
      lines(`
Amina Yusuf
EDUCATION
Bachelor of Science in Accounting, University of Ilorin, 2012 - 2016
HND Business Administration - Kwara Polytechnic (2010)
`),
      NOW,
    );
    expect(cv.education).toEqual([
      {
        qualification: "Bachelor of Science in Accounting",
        institution: "University of Ilorin",
        startYear: "2012",
        endYear: "2016",
      },
      {
        qualification: "HND Business Administration",
        institution: "Kwara Polytechnic",
        startYear: "2010",
        endYear: "2010",
      },
    ]);
  });

  it("reads certifications with the issuer after a dash or in brackets", () => {
    const cv = parseCv(
      lines(`
Chidi Eze
CERTIFICATES
• AWS Certified Developer – Amazon Web Services (2022)
• Project Management Professional, PMI, 2020
`),
      NOW,
    );
    expect(cv.certifications).toEqual([
      { title: "AWS Certified Developer", issuer: "Amazon Web Services", year: "2022" },
      { title: "Project Management Professional", issuer: "PMI", year: "2020" },
    ]);
  });
});

describe("parseCv: awkward input", () => {
  it("returns empty fields instead of guessing when nothing is recognisable", () => {
    const cv = parseCv(["just some words", "and more words without structure"], NOW);
    expect(cv).toMatchObject({ name: "", email: "", experiences: [], education: [], certifications: [], summary: "" });
  });

  it("does not take a section heading or a contact line for a name", () => {
    const cv = parseCv(["ada@example.com", "+2348012345678", "EXPERIENCE"], NOW);
    expect(cv.name).toBe("");
    expect(cv.email).toBe("ada@example.com");
  });

  it("keeps long text within the limits the page allows", () => {
    const cv = parseCv(["Ada Obi", "SUMMARY", "word ".repeat(600)], NOW);
    expect(cv.summary.length).toBeLessThanOrEqual(1200);
  });

  it("does not skip a role that has no end date", () => {
    const cv = parseCv(["Ada Obi", "EXPERIENCE", "Driver, Acme  2020 – Current"], NOW);
    expect(cv.experiences).toMatchObject([{ role: "Driver", company: "Acme", startYear: "2020", endYear: "" }]);
  });
});

describe("stampFor", () => {
  it("uses the capitals, or the first word, and fits 7 characters", () => {
    expect(stampFor("AWS Certified Developer")).toBe("ACD");
    expect(stampFor("Introduction to Career Skills in Software Development")).toBe("ICSSD");
    expect(stampFor("safety")).toBe("SAFETY");
    expect(stampFor("Occupational")).toBe("OCCUPAT");
  });
});
