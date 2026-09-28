import type { Metadata } from "next";
import { archivo, plexMono, plexSans } from "./fonts";
import "@/styles/tokens.css";
import "@/styles/sp.css";
import "@/styles/app.css";

export const metadata: Metadata = {
  title: { default: "Siteproof", template: "%s · Siteproof" },
  description: "Portfolio pages for civil engineers, drawn like a construction drawing set.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-theme="sheet" className={`${archivo.variable} ${plexSans.variable} ${plexMono.variable}`}>
      <body className="sp-root">{children}</body>
    </html>
  );
}
