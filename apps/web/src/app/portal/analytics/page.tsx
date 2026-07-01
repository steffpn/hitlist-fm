"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatNumber, formatDateTime } from "@/lib/format";
import {
  Card,
  ErrorNotice,
  PageHeader,
  PeriodPicker,
  Pill,
  Skeleton,
  TableShell,
  Th,
} from "@/components/portal/ui";
import { BarSeries, Donut } from "@/components/portal/charts";
import { PremiumGate, useGated } from "@/components/portal/premium-gate";

// ─── API shapes ─────────────────────────────────────────────────────────

interface RotationData {
  uniqueSongsPerHour: Array<{ hour: number; count: number }>;
  averageRotation: number;
  overRotatedSongs: Array<{
    songTitle: string;
    artistName: string;
    playCount: number;
    expectedMax: number;
  }>;
}

interface DiscoveryData {
  score: number;
  newSongsCount: number;
  totalSongsCount: number;
  newSongsPlays: number;
  totalPlays: number;
}

interface NewSong {
  songTitle: string;
  artistName: string;
  isrc: string | null;
  firstPlayedAt: string;
}

interface ExclusiveSong {
  songTitle: string;
  artistName: string;
  isrc: string | null;
  playCount: number;
}

type Period = "day" | "week" | "month";

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "day", label: "Azi" },
  { value: "week", label: "7 zile" },
  { value: "month", label: "30 zile" },
];

// ─── Page ───────────────────────────────────────────────────────────────

export default function StationAnalyticsPage() {
  const [period, setPeriod] = useState<Period>("week");

  const rotation = useGated<RotationData>(
    () => apiFetch(`/station/rotation?period=${period}`),
    [period],
  );
  const discovery = useGated<DiscoveryData>(
    () => apiFetch(`/station/discovery-score?period=${period}`),
    [period],
  );
  const newSongs = useGated<NewSong[]>(
    () => apiFetch(`/station/new-songs?period=${period}`),
    [period],
  );
  const exclusive = useGated<ExclusiveSong[]>(
    () => apiFetch(`/station/exclusive-songs?period=${period}`),
    [period],
  );

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Analiză"
        description="Rotația, descoperirile și piesele exclusive ale stației tale."
        actions={<PeriodPicker value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />}
      />

      <div className="space-y-6">
        {/* Rotation (premium) */}
        <Card title="Analiza rotației">
          <PremiumGate
            state={rotation}
            skeletonRows={4}
            lockTitle="Analiza rotației e Premium"
            lockMessage="Vezi câte piese unice difuzezi pe oră și care piese sunt supra-rotite față de restul playlistului."
          >
            {(data) => (
              <div className="grid lg:grid-cols-2 gap-6">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                    Piese unice pe oră
                  </div>
                  <BarSeries
                    points={data.uniqueSongsPerHour.map((h) => ({
                      label: `${String(h.hour).padStart(2, "0")}:00`,
                      value: h.count,
                    }))}
                    height={100}
                    emptyLabel="Fără difuzări în perioada asta."
                  />
                  <p className="text-xs text-zinc-500 mt-3">
                    Rotație medie:{" "}
                    <span className="font-mono text-white">
                      {data.averageRotation.toLocaleString("ro-RO")}
                    </span>{" "}
                    difuzări per piesă
                  </p>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                    Piese supra-rotite
                  </div>
                  {data.overRotatedSongs.length === 0 ? (
                    <p className="text-sm text-zinc-500 py-3">
                      Nicio piesă supra-rotită — rotația arată sănătos.
                    </p>
                  ) : (
                    <ul className="divide-y divide-zinc-800/60">
                      {data.overRotatedSongs.slice(0, 8).map((s, i) => (
                        <li key={i} className="py-2 flex items-center gap-3 text-sm">
                          <div className="min-w-0 flex-1">
                            <div className="text-white truncate">{s.songTitle}</div>
                            <div className="text-xs text-zinc-500 truncate">{s.artistName}</div>
                          </div>
                          <Pill tone="amber" title={`Așteptat cel mult ~${s.expectedMax} difuzări`}>
                            {formatNumber(s.playCount)} difuzări
                          </Pill>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </PremiumGate>
        </Card>

        {/* Discovery score (premium) */}
        <Card title="Scor discovery">
          <PremiumGate
            state={discovery}
            skeletonRows={3}
            lockTitle="Scorul discovery e Premium"
            lockMessage="Măsoară cât la sută din airplay-ul tău e muzică nouă (piese apărute în ultimele 30 de zile pe piață)."
          >
            {(data) => (
              <div className="flex flex-wrap items-center gap-8">
                <Donut percent={data.score} sublabel="muzică nouă" />
                <div className="space-y-1.5 text-sm text-zinc-300">
                  <div>
                    <span className="font-mono font-bold text-white">
                      {formatNumber(data.newSongsCount)}
                    </span>{" "}
                    piese noi din{" "}
                    <span className="font-mono">{formatNumber(data.totalSongsCount)}</span> difuzate
                  </div>
                  <div>
                    <span className="font-mono font-bold text-white">
                      {formatNumber(data.newSongsPlays)}
                    </span>{" "}
                    difuzări de muzică nouă din{" "}
                    <span className="font-mono">{formatNumber(data.totalPlays)}</span> total
                  </div>
                  <p className="text-xs text-zinc-500 max-w-sm pt-1">
                    „Nouă” = piesă apărută pentru prima dată pe orice stație monitorizată în
                    ultimele 30 de zile.
                  </p>
                </div>
              </div>
            )}
          </PremiumGate>
        </Card>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* New songs */}
          <Card title="Piese noi în playlist">
            {newSongs.loading ? (
              <Skeleton rows={4} />
            ) : newSongs.error ? (
              <ErrorNotice message={newSongs.error} onRetry={newSongs.reload} />
            ) : !newSongs.data || newSongs.data.length === 0 ? (
              <p className="text-sm text-zinc-500 py-3">
                Nicio piesă nouă în perioada selectată.
              </p>
            ) : (
              <ul className="divide-y divide-zinc-800/60 max-h-96 overflow-y-auto">
                {newSongs.data.map((s, i) => (
                  <li key={i} className="py-2 flex items-center gap-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="text-white truncate">{s.songTitle}</div>
                      <div className="text-xs text-zinc-500 truncate">{s.artistName}</div>
                    </div>
                    <span
                      className="text-xs font-mono text-zinc-500 shrink-0"
                      title="Prima difuzare"
                    >
                      {formatDateTime(s.firstPlayedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          {/* Exclusive songs */}
          <Card title="Exclusivități — doar la tine">
            {exclusive.loading ? (
              <Skeleton rows={4} />
            ) : exclusive.error ? (
              <ErrorNotice message={exclusive.error} onRetry={exclusive.reload} />
            ) : !exclusive.data || exclusive.data.length === 0 ? (
              <p className="text-sm text-zinc-500 py-3">
                Nicio piesă exclusivă în perioada asta — tot ce difuzezi rulează și la alții.
              </p>
            ) : (
              <TableShell>
                <thead className="bg-zinc-950/60">
                  <tr>
                    <Th>Piesă</Th>
                    <Th align="right">Difuzări</Th>
                  </tr>
                </thead>
                <tbody>
                  {exclusive.data.slice(0, 15).map((s, i) => (
                    <tr key={i} className="border-t border-zinc-800/60">
                      <td className="px-4 py-2">
                        <div className="text-white text-sm truncate max-w-[260px]">
                          {s.songTitle}
                        </div>
                        <div className="text-xs text-zinc-500 truncate max-w-[260px]">
                          {s.artistName}
                        </div>
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-sm text-white">
                        {formatNumber(s.playCount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </TableShell>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
