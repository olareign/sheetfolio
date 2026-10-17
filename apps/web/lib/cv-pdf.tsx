import "server-only";
import { Children } from "react";
import { Document, Page, renderToBuffer, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { CvModel } from "@/content/cv";
import { BRAND_TOKENS as T } from "./brand-tokens";

// TODO(product): embed Archivo / IBM Plex. Built-in Helvetica + Courier keep the PDF self-contained for now.
const s = StyleSheet.create({
  page: {
    padding: 40,
    paddingBottom: 56,
    backgroundColor: T.paper,
    color: T.ink,
    fontFamily: "Helvetica",
    fontSize: 10,
    lineHeight: 1.45,
  },
  label: { fontFamily: "Courier", fontSize: 7.5, letterSpacing: 1, textTransform: "uppercase", color: T.inkMuted },
  name: { fontFamily: "Helvetica", fontWeight: "bold", fontSize: 26, lineHeight: 1.05, marginTop: 4 },
  headline: { fontSize: 12, marginTop: 4 },
  head: { borderBottomWidth: 1, borderBottomColor: T.rule, paddingBottom: 12, marginBottom: 4 },
  contact: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  contactItem: { marginRight: 16, marginTop: 2 },
  mono: { fontFamily: "Courier", fontSize: 8.5, color: T.inkMuted },
  section: { marginTop: 14 },
  h2: {
    fontFamily: "Helvetica",
    fontWeight: "bold",
    fontSize: 12,
    marginBottom: 6,
    paddingBottom: 3,
    borderBottomWidth: 0.75,
    borderBottomColor: T.hairline,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  strong: { fontFamily: "Helvetica", fontWeight: "bold" },
  item: { marginBottom: 7 },
  sub: { color: T.inkMuted },
  no: { fontFamily: "Courier", fontSize: 8.5, color: T.blueprint, width: 44 },
  chips: { flexDirection: "row", flexWrap: "wrap" },
  chip: {
    borderWidth: 0.75,
    borderColor: T.rule,
    paddingVertical: 2,
    paddingHorizontal: 5,
    marginRight: 4,
    marginBottom: 4,
    fontSize: 8.5,
  },
  ongoing: { color: T.hivisInk },
  completed: { color: T.cured },
  footerLeft: { position: "absolute", left: 40, right: 40, bottom: 24 },
});

/** A section heading is never left alone at the foot of a page: it travels with its first entry. */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const [first, ...rest] = Children.toArray(children);
  return (
    <View style={s.section}>
      <View wrap={false}>
        <Text style={s.h2}>{title}</Text>
        {first}
      </View>
      {rest}
    </View>
  );
}

export function CvDocument({ cv }: { cv: CvModel }) {
  return (
    <Document title={`${cv.name} · CV`} author={cv.name} subject={cv.headline} creator="Sheetfolio">
      <Page size="A4" style={s.page}>
        <View style={s.head}>
          <Text style={s.label}>Curriculum vitae · Sheet SP-000</Text>
          <Text style={s.name}>{cv.name}</Text>
          <Text style={s.headline}>{[cv.headline, cv.location].filter(Boolean).join(" · ")}</Text>
          <View style={s.contact}>
            {cv.contact.map((c) => (
              <Text key={c.label} style={s.contactItem}>
                <Text style={s.label}>{c.label} </Text>
                {c.value}
              </Text>
            ))}
          </View>
        </View>

        {cv.summary !== "" && (
          <Section title="Profile">
            <Text>{cv.summary}</Text>
          </Section>
        )}

        {cv.details.length > 0 && (
          <Section title="Personal details">
            {cv.details.map((d) => (
              <Text key={d.label}>
                <Text style={s.label}>{d.label} </Text>
                {d.value}
              </Text>
            ))}
          </Section>
        )}

        {cv.competencies.length > 0 && (
          <Section title="Core competencies">
            <View style={s.chips}>
              {cv.competencies.map((c) => (
                <Text key={c} style={s.chip}>
                  {c}
                </Text>
              ))}
            </View>
          </Section>
        )}

        {cv.experience.length > 0 && (
          <Section title="Experience">
            {cv.experience.map((e) => (
              <View key={`${e.company}-${e.years}`} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.strong}>{e.company}</Text>
                  <Text style={s.mono}>{e.years}</Text>
                </View>
                <Text style={s.sub}>{e.role}</Text>
                {e.projects.map((p) => (
                  <Text key={p} style={s.mono}>
                    {p}
                  </Text>
                ))}
              </View>
            ))}
          </Section>
        )}

        {cv.projects.length > 0 && (
          <Section title={`Projects · ${cv.projects.length} sheets`}>
            {cv.projects.map((p) => (
              <View key={p.no} style={[s.row, s.item]} wrap={false}>
                <Text style={s.no}>{p.no}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={s.strong}>{p.title}</Text>
                  <Text style={s.mono}>{p.meta}</Text>
                </View>
                <View style={{ width: 90, alignItems: "flex-end" }}>
                  <Text style={s.mono}>{p.years}</Text>
                  <Text style={[s.mono, p.status === "Ongoing" ? s.ongoing : s.completed]}>{p.status}</Text>
                </View>
              </View>
            ))}
          </Section>
        )}

        {cv.certifications.length > 0 && (
          <Section title="Certifications">
            {cv.certifications.map((c) => (
              <View key={c.title} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.strong}>{c.title}</Text>
                  <Text style={s.mono}>{c.year}</Text>
                </View>
                <Text style={s.sub}>{c.issuer}</Text>
              </View>
            ))}
          </Section>
        )}

        {cv.education.length > 0 && (
          <Section title="Education">
            {cv.education.map((e) => (
              <View key={e.qualification} style={s.item} wrap={false}>
                <View style={s.row}>
                  <Text style={s.strong}>{e.qualification}</Text>
                  <Text style={s.mono}>{e.years}</Text>
                </View>
                <Text style={s.sub}>{e.institution}</Text>
              </View>
            ))}
          </Section>
        )}

        {cv.research && (
          <Section title={`Research · ${cv.research.year}`}>
            <Text>{cv.research.title}</Text>
            {cv.research.summary !== "" && <Text style={s.sub}>{cv.research.summary}</Text>}
          </Section>
        )}

        <Section title="Referees">
          {cv.referees ? (
            cv.referees.map((r) => (
              <View key={r.name} style={s.item} wrap={false}>
                <Text style={s.strong}>{r.name}</Text>
                {r.line !== "" && <Text style={s.sub}>{r.line}</Text>}
              </View>
            ))
          ) : (
            <Text>References available on request.</Text>
          )}
        </Section>

        {/* TODO(product): page numbers. react-pdf's `render` prop drew nothing here (Next 16 + React 19). */}
        <Text style={[s.label, s.footerLeft]} fixed>
          {cv.footer} · Drawn on Sheetfolio
        </Text>
      </Page>
    </Document>
  );
}

export function renderCv(cv: CvModel): Promise<Buffer> {
  return renderToBuffer(<CvDocument cv={cv} />);
}
