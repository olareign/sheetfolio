import { ImageResponse } from "next/og";
import { publicSiteUrl } from "@/lib/env";

// The link preview for the landing page and the other marketing pages: it speaks for the product. A person's own page
// has its own card with their photo (see app/(public)/[slug]/opengraph-image.tsx).
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Sheetfolio: your work, your CV and your enquiries on one page";

const INDIGO = "#4338ca";
const DEEP = "#312e81";
const TOOLS = ["Projects", "CV layouts", "Enquiries", "Insights"];

export default function Image() {
  const host = publicSiteUrl().host;
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        padding: "0 72px",
        background: `linear-gradient(135deg, ${INDIGO}, ${DEEP})`,
        color: "#ffffff",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", flexGrow: 1 }}>
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 18,
              background: "#ffffff",
              color: INDIGO,
              fontSize: 38,
              fontWeight: 800,
            }}
          >
            S
          </div>
          <div style={{ display: "flex", marginLeft: 18, fontSize: 38, fontWeight: 700 }}>Sheetfolio</div>
        </div>
        <div style={{ display: "flex", marginTop: 40, maxWidth: 620, fontSize: 70, fontWeight: 800, lineHeight: 1.04 }}>
          Your work, your CV and your enquiries on one page
        </div>
        <div style={{ display: "flex", marginTop: 36 }}>
          {TOOLS.map((t) => (
            <div
              key={t}
              style={{
                display: "flex",
                marginRight: 12,
                padding: "10px 22px",
                borderRadius: 999,
                background: "rgba(255,255,255,0.16)",
                fontSize: 26,
              }}
            >
              {t}
            </div>
          ))}
        </div>
        <div style={{ display: "flex", marginTop: 36, fontSize: 26, opacity: 0.8 }}>{host}</div>
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flexShrink: 0,
          width: 330,
          padding: 28,
          marginLeft: 24,
          borderRadius: 32,
          background: "#ffffff",
          color: "#0f172a",
          transform: "rotate(4deg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 32,
              background: "#e0e7ff",
              color: INDIGO,
              fontSize: 26,
              fontWeight: 800,
            }}
          >
            YN
          </div>
          <div style={{ display: "flex", flexDirection: "column", marginLeft: 16 }}>
            <div style={{ display: "flex", fontSize: 26, fontWeight: 700 }}>Your name</div>
            <div style={{ display: "flex", fontSize: 18, color: "#475569" }}>Your headline</div>
          </div>
        </div>
        <div style={{ display: "flex", marginTop: 24, height: 130, borderRadius: 18, background: "#e0e7ff" }} />
        {[100, 82, 64].map((w) => (
          <div
            key={w}
            style={{
              display: "flex",
              marginTop: 14,
              height: 12,
              width: `${w}%`,
              borderRadius: 6,
              background: "#cbd5e1",
            }}
          />
        ))}
        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            marginTop: 24,
            padding: "10px 22px",
            borderRadius: 999,
            background: INDIGO,
            color: "#ffffff",
            fontSize: 20,
            fontWeight: 700,
          }}
        >
          Download CV
        </div>
      </div>
    </div>,
    size,
  );
}
