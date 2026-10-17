import { ImageResponse } from "next/og";
import { BRAND_TOKENS as T } from "@/lib/brand-tokens";
import { getPublished } from "@/lib/site";

// Open Graph card from name + headline (PRD §8). Satori can't read CSS variables, so it uses the
// same token mirror as the CV (kept in sync with tokens.css by a test).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Sheetfolio engineer profile";

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const site = await getPublished(slug);
  const name = site?.profile.name ?? "Sheetfolio";
  const line = site
    ? [site.profile.headline, site.profile.location].filter(Boolean).join(" · ")
    : "Engineer portfolios";
  const projects = site?.projects.length ?? 0;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 64,
        background: T.paper,
        color: T.ink,
        border: `16px solid ${T.ink}`,
      }}
    >
      <div
        style={{ display: "flex", justifyContent: "space-between", fontSize: 22, letterSpacing: 4, color: T.inkMuted }}
      >
        <span>SHEETFOLIO</span>
        <span>SHEET SP-000</span>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 26, letterSpacing: 4, color: T.inkMuted, textTransform: "uppercase" }}>{line}</div>
        <div style={{ fontSize: name.length > 22 ? 88 : 108, fontWeight: 800, lineHeight: 0.95, marginTop: 16 }}>
          {name}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: `2px solid ${T.rule}`,
          paddingTop: 20,
          fontSize: 24,
          color: T.blueprint,
        }}
      >
        <span>{projects > 0 ? `Drawing schedule · ${projects} sheets` : "Portfolio"}</span>
        <span>/{slug}</span>
      </div>
    </div>,
    size,
  );
}
