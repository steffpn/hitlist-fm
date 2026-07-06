import type { Metadata } from "next";
import { TopChartClient } from "./top-client";

export const metadata: Metadata = {
  title: "hitlist.fm Airplay Top — topul difuzărilor radio",
  description:
    "Top 100 piese difuzate la radio, calculat din detecții reale, actualizat non-stop. Vezi cine urcă, cine coboară și cine intră nou în top.",
  openGraph: {
    title: "hitlist.fm Airplay Top",
    description:
      "Topul oficial al difuzărilor radio — din airplay real, monitorizat non-stop de hitlist.fm.",
    type: "website",
    siteName: "hitlist.fm",
  },
  twitter: {
    card: "summary_large_image",
    title: "hitlist.fm Airplay Top",
    description:
      "Top 100 piese difuzate la radio, din detecții reale, actualizat non-stop.",
  },
};

/** Public marketing page — no auth, outside the portal shell. */
export default function TopPage() {
  return <TopChartClient />;
}
