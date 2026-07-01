"use client";

import { usePortalRole } from "@/lib/use-portal-role";
import { PageHeader } from "@/components/portal/ui";
import { AirplayEventsPanel } from "@/components/portal/airplay-panel";

/** Difuzări — scoped detections list with filters + CSV/PDF export. */
export default function PortalAirplayPage() {
  const { role } = usePortalRole();

  const emptyCta =
    role === "ARTIST"
      ? { label: "Adaugă o piesă", href: "/portal/songs" }
      : role === "LABEL"
        ? { label: "Adaugă un artist", href: "/portal/artists" }
        : undefined;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Difuzări"
        description={
          role === "STATION"
            ? "Tot ce a fost detectat on air pe stația ta."
            : "Fiecare apariție on air a pieselor monitorizate."
        }
      />
      <AirplayEventsPanel
        emptyTitle="Nicio difuzare încă"
        emptyMessage={
          role === "STATION"
            ? "Când stația ta e monitorizată, detecțiile apar aici în timp real."
            : "Când piesele monitorizate ajung la radio, detecțiile apar aici."
        }
        emptyCta={emptyCta}
      />
    </div>
  );
}
