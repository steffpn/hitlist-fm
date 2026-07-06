import type { Metadata } from "next";
import { Sora, IBM_Plex_Mono } from "next/font/google";
import "./globals.css";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";
import { Analytics } from "@/components/analytics";
import { SITE_URL } from "@/lib/site";

const sora = Sora({ subsets: ["latin"], variable: "--font-sora" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500", "600"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "hitlist.fm — music discovery meets music data",
    template: "%s · hitlist.fm",
  },
  description:
    "Hitlist brings together curated playlists, Playlist Battle and professional radio & TV monitoring tools for artists, labels and the music industry.",
  icons: { icon: "/icon.svg" },
  openGraph: {
    title: "hitlist.fm — music discovery meets music data",
    description:
      "Curated playlists, Playlist Battle and professional radio & TV monitoring for the modern music industry.",
    url: SITE_URL,
    siteName: "hitlist.fm",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`dark ${sora.variable} ${plexMono.variable}`}>
      <body className="font-sans">
        <SiteNav />
        <main>{children}</main>
        <SiteFooter />
        <Analytics />
      </body>
    </html>
  );
}
