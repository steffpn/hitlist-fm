"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import {
  EmptyState,
  ErrorNotice,
  PageHeader,
  PeriodPicker,
  Pill,
  Stat,
  StatSkeleton,
  Skeleton,
  TableShell,
  Th,
} from "@/components/portal/ui";
import { useGated } from "@/components/portal/premium-gate";

interface StationOverview {
  totalPlays: number;
  uniqueSongs: number;
  uniqueArtists: number;
  stationNames: string[];
}

interface TopSong {
  rank: number;
  songTitle: string;
  artistName: string;
  isrc: string | null;
  playCount: number;
}

interface CoverageInfo {
  stationId: number;
  days: number;
  coveragePercent: number;
  gaps: Array<{ startedAt: string; endedAt: string | null; reason: string | null }>;
}

interface StationLite {
  id: number;
  name: string;
}

type Period = "day" | "week" | "month";

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "day", label: "Azi" },
  { value: "week", label: "7 zile" },
  { value: "month", label: "30 zile" },
];

function CoverageBadge({ stationName, percent }: { stationName: string; percent: number }) {
  const tone = percent >= 99 ? "green" : percent >= 95 ? "amber" : "red";
  return (
    <Pill
      tone={tone}
      title={`Monitorizare activă ${percent.toLocaleString("ro-RO")}% din ultimele 7 zile`}
    >
      {stationName}: {percent.toLocaleString("ro-RO")}%
    </Pill>
  );
}

export function StationDashboardPage({ displayName }: { displayName: string }) {
  const [period, setPeriod] = useState<Period>("week");

  const overview = useGated<StationOverview>(
    () => apiFetch(`/station/overview?period=${period}`),
    [period],
  );
  const topSongs = useGated<TopSong[]>(
    () => apiFetch(`/station/top-songs?period=${period}&limit=15`),
    [period],
  );
  // Coverage transparency for the user's own station(s): ids from
  // /competitors/own (scope-derived), then per-station coverage + names.
  const coverage = useGated<Array<CoverageInfo & { name: string }>>(async () => {
    const own = await apiFetch<{ stationIds: number[] }>("/competitors/own");
    if (own.stationIds.length === 0) return [];
    const stations = await apiFetch<StationLite[]>("/stations").catch(() => [] as StationLite[]);
    const nameById = new Map(stations.map((s) => [s.id, s.name]));
    const infos = await Promise.all(
      own.stationIds.map((id) =>
        apiFetch<CoverageInfo>(`/stations/${id}/coverage?days=7`).catch(() => null),
      ),
    );
    return infos
      .filter((i): i is CoverageInfo => i !== null)
      .map((i) => ({ ...i, name: nameById.get(i.stationId) ?? `Stația #${i.stationId}` }));
  }, []);

  const noStation =
    !overview.loading && !overview.error && overview.data?.stationNames.length === 0;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Stația mea"
        description={
          overview.data && overview.data.stationNames.length > 0
            ? overview.data.stationNames.join(" · ")
            : displayName
        }
        actions={<PeriodPicker value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />}
      />

      {noStation ? (
        <EmptyState
          title="Nicio stație asociată contului"
          message="Contul tău nu are încă o stație în scope. Scrie-ne și o conectăm imediat la pipeline-ul de detecție."
        />
      ) : (
        <>
          {/* Coverage badges */}
          {coverage.data && coverage.data.length > 0 && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider text-zinc-500">
                Acoperire monitorizare (7 zile):
              </span>
              {coverage.data.map((c) => (
                <CoverageBadge key={c.stationId} stationName={c.name} percent={c.coveragePercent} />
              ))}
            </div>
          )}

          {/* Overview stats */}
          <div className="mb-6">
            {overview.loading ? (
              <StatSkeleton count={3} />
            ) : overview.error ? (
              <ErrorNotice message={overview.error} onRetry={overview.reload} />
            ) : overview.data ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Stat label="Difuzări" value={formatNumber(overview.data.totalPlays)} tone="brand" />
                <Stat label="Piese unice" value={formatNumber(overview.data.uniqueSongs)} />
                <Stat label="Artiști unici" value={formatNumber(overview.data.uniqueArtists)} />
              </div>
            ) : null}
          </div>

          {/* Top songs */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-5 pt-5 pb-3">
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
                Cele mai difuzate piese
              </h2>
            </div>
            {topSongs.loading ? (
              <div className="p-5 pt-0">
                <Skeleton rows={5} />
              </div>
            ) : topSongs.error ? (
              <div className="p-5 pt-0">
                <ErrorNotice message={topSongs.error} onRetry={topSongs.reload} />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-950/60">
                    <tr>
                      <Th className="w-12">#</Th>
                      <Th>Piesă</Th>
                      <Th>Artist</Th>
                      <Th align="right">Difuzări</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {(topSongs.data ?? []).map((s) => (
                      <tr key={s.rank} className="border-t border-zinc-800/60 hover:bg-zinc-800/20">
                        <td className="px-4 py-2.5 font-mono text-zinc-400">{s.rank}</td>
                        <td className="px-4 py-2.5 text-white">{s.songTitle}</td>
                        <td className="px-4 py-2.5 text-zinc-400">{s.artistName}</td>
                        <td className="px-4 py-2.5 text-right font-mono text-white">
                          {formatNumber(s.playCount)}
                        </td>
                      </tr>
                    ))}
                    {topSongs.data?.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                          Nicio difuzare în perioada selectată.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
