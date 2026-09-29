import type { Metadata } from "next";
import { publicSiteUrl } from "@/lib/env";
import { ROOT_THEME_SCRIPT } from "@/lib/theme";
import { archivo, plexMono, plexSans } from "./fonts";
import "@/styles/tokens.css";
import "@/styles/sp.css";
import "@/styles/app.css";

export const metadata: Metadata = {
  metadataBase: publicSiteUrl(),
  title: { default: "Sheetfolio", template: "%s · Sheetfolio" },
  description: "Portfolio pages for civil engineers, drawn like a construction drawing set.",
  openGraph: { siteName: "Sheetfolio", type: "website" },
  twitter: { card: "summary_large_image" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is set by the head script before first paint (viewer choice or OS setting);
    // without JS the :root tokens give the light "sheet" theme.
    <html
      lang="en"
      className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: ROOT_THEME_SCRIPT }} />
      </head>
      <body className="sp-root">{children}</body>
    </html>
  );
}
