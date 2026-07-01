"use client";

import { usePortalRole } from "@/lib/use-portal-role";
import { ArtistDashboardPage } from "@/components/portal/artist-dashboard";
import { LabelDashboardPage } from "@/components/portal/label-dashboard";
import { StationDashboardPage } from "@/components/portal/station-dashboard";

/** Portal home — per-role dashboard (artist / label / station). */
export default function PortalHomePage() {
  const { role, displayName } = usePortalRole();

  if (role === "ARTIST") return <ArtistDashboardPage displayName={displayName} />;
  if (role === "LABEL") return <LabelDashboardPage displayName={displayName} />;
  if (role === "STATION") return <StationDashboardPage displayName={displayName} />;
  // Pre-hydration / no role: LayoutShell already handles redirects.
  return null;
}
