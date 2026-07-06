import type { Metadata } from "next";
import { Sora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { LayoutShell } from "@/components/layout-shell";

const sora = Sora({
  subsets: ["latin"],
  variable: "--font-sora",
});

const plexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-plex-mono",
});

export const metadata: Metadata = {
  title: "hitlist.fm",
  description: "Radio & TV airplay monitoring — stations, detections, artists, billing.",
  icons: { icon: "/icon.svg" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sora.variable} ${plexMono.variable}`}>
      <body className="font-sans">
        <LayoutShell>{children}</LayoutShell>
      </body>
    </html>
  );
}
