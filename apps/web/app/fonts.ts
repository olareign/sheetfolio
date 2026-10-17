import { Archivo, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";

export const archivo = Archivo({ subsets: ["latin"], weight: ["700", "800"], variable: "--font-archivo" });
export const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "600"], variable: "--font-plex-sans" });
export const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});
