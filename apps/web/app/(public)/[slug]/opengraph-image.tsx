import { ImageResponse } from "next/og";
import { initials } from "@/content/derive";
import { publicSiteUrl } from "@/lib/env";
import { loadOgPhoto } from "@/lib/og-photo";
import { getPublished } from "@/lib/site";

// The link preview for one person's page: their photo, name, headline and place, so a shared link says who it is
// for. (The landing page has its own card, about the product.) Satori can't read CSS variables, so the colours here
// are the CTA gradient from tokens.css written out.
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Dosinex page preview";

const INDIGO = "#4338ca";
const DEEP = "#312e81";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getPublished(slug);
  const host = publicSiteUrl().host;

  const name = site?.profile.name ?? "Dosinex";
  const headline = site?.profile.headline ?? "Your work, your CV and your enquiries on one page";
  const location = site?.profile.location ?? "";
  const photo = site?.profile.avatar ? await loadOgPhoto(site.profile.avatar) : null;
  const counts = site
    ? [
        site.projects.length && `${site.projects.length} ${site.projects.length === 1 ? "project" : "projects"}`,
        site.certifications.length &&
          `${site.certifications.length} ${site.certifications.length === 1 ? "certification" : "certifications"}`,
      ].filter(Boolean)
    : [];

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "56px 72px",
        background: `linear-gradient(135deg, ${INDIGO}, ${DEEP})`,
        color: "#ffffff",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          width: 360,
          height: 360,
          borderRadius: 48,
          border: "10px solid rgba(255,255,255,0.9)",
          background: "#ffffff",
          color: INDIGO,
          fontSize: 132,
          fontWeight: 800,
          overflow: "hidden",
        }}
      >
        {photo ? <img src={photo} width={340} height={340} style={{ objectFit: "cover" }} alt="" /> : initials(name)}
      </div>
      {/* 1200 - 2 x 72 padding - 360 photo - 64 gap: a fixed width is what makes long names wrap instead of running off the card */}
      <div style={{ display: "flex", flexDirection: "column", width: 632, marginLeft: 64 }}>
        <div style={{ display: "flex", fontSize: 24, letterSpacing: 6, opacity: 0.8 }}>DOSINEX</div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: name.length > 24 ? 60 : name.length > 16 ? 72 : 92,
            fontWeight: 800,
            lineHeight: 1.02,
          }}
        >
          {name}
        </div>
        <div style={{ display: "flex", marginTop: 20, fontSize: 38, lineHeight: 1.2, opacity: 0.92 }}>{headline}</div>
        <div style={{ display: "flex", marginTop: 28, fontSize: 28, opacity: 0.8 }}>
          {[location, ...counts].filter(Boolean).join("  ·  ")}
        </div>
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            marginTop: 36,
            padding: "10px 24px",
            borderRadius: 999,
            background: "rgba(255,255,255,0.16)",
            fontSize: 26,
          }}
        >
          {host}/{slug}
        </div>
      </div>
    </div>,
    size,
  );
}
