import type { Metadata } from "next";
import { publicSiteUrl } from "@/lib/env";
import { ROOT_THEME_SCRIPT } from "@/lib/theme";
import { inter } from "./fonts";
import "@/styles/tokens.css";
import "@/styles/sp.css";
import "@/styles/app.css";

export const metadata: Metadata = {
  metadataBase: publicSiteUrl(),
  applicationName: "Sheetfolio",
  title: { default: "Sheetfolio", template: "%s · Sheetfolio" },
  description: "A clean portfolio page for your projects, credentials and CV.",
  openGraph: { siteName: "Sheetfolio", type: "website", locale: "en" },
  twitter: { card: "summary_large_image" },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // data-theme is set by the head script before first paint (viewer choice or OS setting);
    // without JS the :root tokens give the light "sheet" theme.
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: ROOT_THEME_SCRIPT }} />
      </head>
      <body className="sp-root">{children}</body>
    </html>
  );
}
