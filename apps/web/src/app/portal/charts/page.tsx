"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatDateTime } from "@/lib/format";
import { usePortalRole } from "@/lib/use-portal-role";
import { ErrorNotice, PageHeader, PeriodPicker, Skeleton } from "@/components/portal/ui";
import { ChartTable, type ChartResponse } from "@/components/portal/chart-table";
import { useGated } from "@/components/portal/premium-gate";

type Period = "week" | "month";

/**
 * Topuri — the public onair.music airplay chart, with the user's own songs
 * highlighted (artist: monitored songs; label: roster catalog).
 */
export default function PortalChartsPage() {
  const { role } = usePortalRole();
  const [period, setPeriod] = useState<Period>("week");

  const chart = useGated<ChartResponse>(
    () => apiFetch(`/charts/airplay?period=${period}&limit=100`),
    [period],
  );

  // Own ISRCs for highlighting (best effort — chart still renders without).
  const ownIsrcs = useGated<Set<string>>(async () => {
    try {
      if (role === "ARTIST") {
        const songs = await apiFetch<Array<{ isrc: string }>>("/artist/songs");
        return new Set(songs.map((s) => s.isrc));
      }
      if (role === "LABEL") {
        const dash = await apiFetch<{ catalogSongs: Array<{ isrc: string }> }>(
          "/label/dashboard",
        );
        return new Set(dash.catalogSongs.map((s) => s.isrc));
      }
    } catch {
      // ignore — highlighting is optional
    }
    return new Set<string>();
  }, [role]);

  const highlightCount =
    chart.data && ownIsrcs.data
      ? chart.data.entries.filter((e) => ownIsrcs.data!.has(e.isrc)).length
      : 0;

  return (
    <div className="max-w-5xl">
      <PageHeader
        title="onair.music Airplay Top"
        description={
          chart.data
            ? `Top actualizat ${formatDateTime(chart.data.generatedAt)} — din difuzări radio reale.`
            : "Topul difuzărilor radio, calculat din detecții reale."
        }
        actions={
          <PeriodPicker
            value={period}
            onChange={setPeriod}
            options={[
              { value: "week", label: "Săptămâna" },
              { value: "month", label: "Luna" },
            ]}
          />
        }
      />

      {role !== "STATION" && highlightCount > 0 && (
        <div className="mb-4 px-4 py-3 bg-brand-500/10 border border-brand-500/25 rounded-xl text-sm text-brand-300">
          {highlightCount === 1
            ? "O piesă din catalogul tău e în top!"
            : `${highlightCount} piese din catalogul tău sunt în top!`}
        </div>
      )}

      {chart.loading ? (
        <Skeleton rows={8} />
      ) : chart.error ? (
        <ErrorNotice message={chart.error} onRetry={chart.reload} />
      ) : chart.data ? (
        <ChartTable
          entries={chart.data.entries}
          highlightIsrcs={ownIsrcs.data ?? undefined}
          highlightLabel={role === "LABEL" ? "din catalog" : "piesa ta"}
        />
      ) : null}

      <p className="text-xs text-zinc-500 mt-4">
        Δ = schimbarea față de perioada precedentă. Doar difuzările complete (peste 30 de secunde)
        contează. Click pe o piesă pentru istoricul pozițiilor.
      </p>
    </div>
  );
}
