import "server-only";
import { existsSync } from "node:fs";
import path from "node:path";
import { Children, Fragment, type ReactNode } from "react";
import { Document, Font, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import { leadProjects, type CvModel, type CvProject } from "@/content/cv";
import { DEFAULT_CV_TEMPLATE, type CvTemplateId } from "@/content/cv-templates";
import { CV_LAYOUTS, type CvLayout, type CvSection } from "./cv-layouts";

/*
 * One renderer for every template; the layouts in cv-layouts.ts are the only difference between them.
 * ATS rules it keeps: a single column, real selectable text in embedded fonts, standard section names,
 * contact details in the body (not a header or footer), plain "•" bullets, and no images, icons, tables,
 * text boxes or coloured backgrounds.
 */

// Embedded rather than the built-in Helvetica/Times: those cannot draw the Yoruba dot-below letters (Ọ, ẹ, ṣ) or
// the Naira sign, and print them as the wrong characters. Tinos and Arimo have the same metrics, so layouts match.
// The folder is traced into the serverless bundle by next.config.ts.
// The server runs from the app folder (apps/web) in dev, in tests and on Vercel; the repo-root candidate covers hosts
// that start from the monorepo root. A missing folder fails loudly rather than with a PDF full of wrong characters.
const FONT_DIR = [
  path.join(process.cwd(), "lib", "fonts"),
  path.join(process.cwd(), "apps", "web", "lib", "fonts"),
].find((dir) => existsSync(path.join(dir, "Arimo-Regular.ttf")));
if (!FONT_DIR) throw new Error(`CV fonts not found; looked in ${process.cwd()}/lib/fonts. See lib/fonts/README.md.`);
const fontFile = (name: string) => path.join(FONT_DIR, name);
for (const family of ["Arimo", "Tinos"]) {
  Font.register({
    family,
    fonts: [
      { src: fontFile(`${family}-Regular.ttf`) },
      { src: fontFile(`${family}-Bold.ttf`), fontWeight: "bold" },
      { src: fontFile(`${family}-Italic.ttf`), fontStyle: "italic" },
    ],
  });
}

// Never split words across lines. Automatic hyphenation breaks "backend" into "back-" and "end" in the
// PDF's text, so an ATS keyword search for it fails.
Font.registerHyphenationCallback((word) => [word]);

/** Space between entries. Applied only between siblings: a trailing margin on the last entry can push a section's box
 * past the page edge and make react-pdf emit an empty extra page. */
const GAP = 7;
const INK = "#111111";
const MUTED = "#444444";

/** Exported so tests can assert what a template does and does not draw (e.g. Minimal has no rules). */
export function cvStyles(l: CvLayout) {
  return StyleSheet.create({
    page: {
      padding: l.padding,
      fontFamily: l.font,
      fontSize: l.bodySize,
      lineHeight: l.lineHeight,
      color: INK,
    },
    name: {
      fontFamily: l.font,
      fontWeight: "bold",
      fontSize: l.nameSize,
      lineHeight: 1.1,
      color: l.accent,
      textAlign: l.nameAlign,
    },
    headline: {
      fontFamily: l.font,
      fontStyle: "italic",
      fontSize: l.bodySize + 1.5,
      marginTop: 3,
      textAlign: l.nameAlign,
    },
    contact: { color: MUTED, marginTop: 4, textAlign: l.nameAlign },
    section: { marginTop: 13 },
    heading: {
      fontFamily: l.font,
      fontWeight: "bold",
      fontSize: l.headingSize,
      color: l.accent,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 5,
      // Without a rule the heading stands on bold type and spacing alone.
      ...(l.headingRule ? { borderBottomWidth: 0.75, borderBottomColor: l.accent, paddingBottom: 2 } : {}),
    },
    row: { flexDirection: "row", justifyContent: "space-between" },
    rowMain: { flex: 1, marginRight: 10 },
    bold: { fontFamily: l.font, fontWeight: "bold" },
    italic: { fontFamily: l.font, fontStyle: "italic" },
    dates: { color: MUTED },
    sub: { color: MUTED },
    bullet: { flexDirection: "row", marginTop: 1.5 },
    bulletMark: { width: 10 },
    bulletText: { flex: 1 },
    scope: { marginTop: 2 },
  });
}
type Styles = ReturnType<typeof cvStyles>;

/** A heading is never left alone at the foot of a page: it travels with its first entry. */
function Section({ title, s, children }: { title: string; s: Styles; children: ReactNode }) {
  const [first, ...rest] = Children.toArray(children);
  return (
    <View style={s.section}>
      <View wrap={false}>
        <Text style={s.heading}>{title}</Text>
        {first}
      </View>
      {rest.map((child, i) => (
        <View key={i} style={{ marginTop: GAP }}>
          {child}
        </View>
      ))}
    </View>
  );
}

/** Children separated by `gap` points, with nothing after the last. */
function Stack({ gap, children }: { gap: number; children: ReactNode }) {
  return (
    <View>
      {Children.toArray(children).map((child, i) => (
        <View key={i} style={i === 0 ? undefined : { marginTop: gap }}>
          {child}
        </View>
      ))}
    </View>
  );
}

function Bullets({ items, s }: { items: string[]; s: Styles }) {
  return (
    <View>
      {items.map((item) => (
        <View key={item} style={s.bullet} wrap={false}>
          <Text style={s.bulletMark}>•</Text>
          <Text style={s.bulletText}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/** "Title | Role | Employer | 2023 – Present" on one line. */
function ProjectLine({ p, s }: { p: CvProject; s: Styles }) {
  const rest = [p.role, p.employer, p.years].filter(Boolean).join(" | ");
  return (
    <View wrap={false}>
      <Text>
        <Text style={s.bold}>{p.title}</Text>
        {rest !== "" && ` | ${rest}`}
      </Text>
    </View>
  );
}

function ProjectEntry({ p, s }: { p: CvProject; s: Styles }) {
  const meta = [p.role, p.employer, p.location].filter(Boolean).join(" | ");
  return (
    <View wrap={false}>
      <View style={s.row}>
        <Text style={[s.bold, s.rowMain]}>{p.title}</Text>
        <Text style={s.dates}>{p.years}</Text>
      </View>
      {meta !== "" && <Text style={s.sub}>{meta}</Text>}
      {p.scope !== "" && <Text style={s.scope}>{p.scope}</Text>}
    </View>
  );
}

type Draw = (cv: CvModel, l: CvLayout, s: Styles) => ReactNode;

const SECTIONS: Record<CvSection, Draw> = {
  summary: (cv, _l, s) =>
    cv.summary !== "" && (
      <Section title="Summary" s={s}>
        <Text>{cv.summary}</Text>
      </Section>
    ),

  skills: (cv, _l, s) =>
    cv.competencies.length > 0 && (
      <Section title="Skills" s={s}>
        <Text>{cv.competencies.join(" | ")}</Text>
      </Section>
    ),

  experience: (cv, _l, s) =>
    cv.experience.length > 0 && (
      <Section title="Experience" s={s}>
        {cv.experience.map((e) => (
          <View key={`${e.company}-${e.role}-${e.years}`} wrap={false}>
            <View style={s.row}>
              <Text style={[s.bold, s.rowMain]}>{`${e.role}, ${e.company}`}</Text>
              <Text style={s.dates}>{e.years}</Text>
            </View>
            {e.notes.length > 0 && <Bullets items={e.notes} s={s} />}
          </View>
        ))}
      </Section>
    ),

  projects: (cv, l, s) => {
    if (cv.projects.length === 0) return null;
    // Templates with no detailed entries list every project as one line, with no sub-heading.
    if (l.detailedProjects === 0) {
      return (
        <Section title="Projects" s={s}>
          {cv.projects.map((p) => (
            <ProjectLine key={p.title} p={p} s={s} />
          ))}
        </Section>
      );
    }
    const { lead, rest } = leadProjects(cv, l.detailedProjects);
    return (
      <Section title="Selected projects" s={s}>
        {lead.map((p) => (
          <ProjectEntry key={p.title} p={p} s={s} />
        ))}
        {rest.length > 0 && (
          <View>
            <Text style={s.bold}>Additional projects</Text>
            <View style={{ marginTop: 4 }}>
              <Stack gap={4}>
                {rest.map((p) => (
                  <ProjectLine key={p.title} p={p} s={s} />
                ))}
              </Stack>
            </View>
          </View>
        )}
      </Section>
    );
  },

  education: (cv, _l, s) =>
    cv.education.length > 0 && (
      <Section title="Education" s={s}>
        {cv.education.map((e) => (
          <View key={`${e.qualification}-${e.institution}`} wrap={false}>
            <View style={s.row}>
              <Text style={[s.bold, s.rowMain]}>{e.qualification}</Text>
              <Text style={s.dates}>{e.years}</Text>
            </View>
            <Text style={s.sub}>{e.institution}</Text>
          </View>
        ))}
      </Section>
    ),

  certifications: (cv, _l, s) =>
    cv.certifications.length > 0 && (
      <Section title="Certifications" s={s}>
        {cv.certifications.map((c) => (
          <View key={`${c.title}-${c.issuer}`} wrap={false}>
            <View style={s.row}>
              <Text style={[s.bold, s.rowMain]}>{c.title}</Text>
              <Text style={s.dates}>{String(c.year)}</Text>
            </View>
            <Text style={s.sub}>{c.issuer}</Text>
          </View>
        ))}
      </Section>
    ),

  details: (cv, _l, s) =>
    cv.details.length > 0 && (
      <Section title="Personal details" s={s}>
        {cv.details.map((d) => (
          <Text key={d.label}>{`${d.label}: ${d.value}`}</Text>
        ))}
      </Section>
    ),

  research: (cv, _l, s) =>
    cv.research && (
      <Section title="Research" s={s}>
        <Text>
          <Text style={s.bold}>{cv.research.title}</Text>
          {` (${cv.research.year})`}
        </Text>
        {cv.research.summary !== "" && <Text style={s.sub}>{cv.research.summary}</Text>}
      </Section>
    ),

  referees: (cv, _l, s) => (
    <Section title="References" s={s}>
      {cv.referees ? (
        cv.referees.map((r) => (
          <View key={r.name} wrap={false}>
            <Text style={s.bold}>{r.name}</Text>
            {r.line !== "" && <Text style={s.sub}>{r.line}</Text>}
          </View>
        ))
      ) : (
        <Text>References available on request.</Text>
      )}
    </Section>
  ),
};

export function CvDocument({
  cv,
  template = DEFAULT_CV_TEMPLATE,
  layout = CV_LAYOUTS[template],
}: {
  cv: CvModel;
  template?: CvTemplateId;
  /** Overrides the template's layout; for tests that probe page-edge behaviour. */
  layout?: CvLayout;
}) {
  const s = cvStyles(layout);
  // One plain line: location, email, phone, portfolio. Kept in the body so ATS parsers find it.
  const contact = [cv.location, ...cv.contact.map((c) => c.value.replace(/^https?:\/\//, ""))]
    .filter(Boolean)
    .join(" | ");
  return (
    <Document title={`${cv.name} – CV`} author={cv.name} subject={cv.headline} creator="Dosinex">
      <Page size="A4" style={s.page}>
        <Text style={s.name}>{cv.name}</Text>
        {cv.headline !== "" && <Text style={s.headline}>{cv.headline}</Text>}
        <Text style={s.contact}>{contact}</Text>
        {layout.sections.map((id) => {
          const drawn = SECTIONS[id](cv, layout, s);
          return drawn ? <Fragment key={id}>{drawn}</Fragment> : null;
        })}
      </Page>
    </Document>
  );
}

export function renderCv(
  cv: CvModel,
  template: CvTemplateId = DEFAULT_CV_TEMPLATE,
  layout?: CvLayout,
): Promise<Buffer> {
  return renderToBuffer(<CvDocument cv={cv} template={template} layout={layout} />);
}
