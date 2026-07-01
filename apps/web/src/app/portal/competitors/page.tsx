"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNumber, timeAgo } from "@/lib/format";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  PeriodPicker,
  Skeleton,
  TableShell,
  Th,
} from "@/components/portal/ui";
import { OverlapViz } from "@/components/portal/charts";
import { PremiumGate, useGated } from "@/components/portal/premium-gate";

// ─── API shapes ─────────────────────────────────────────────────────────

interface WatchedStation {
  id: number;
  stationId: number;
  stationName: string;
}

interface StationLite {
  id: number;
  name: string;
}

interface CompetitorCard {
  stationId: number;
  stationName: string;
  playCount: number;
  topSong: { title: string; artist: string } | null;
}

interface CompetitorDetail {
  topSongs: Array<{ title: string; artist: string; isrc: string | null; playCount: number }>;
  recentDetections: Array<{ id: number; songTitle: string; artistName: string; startedAt: string }>;
  comparison: Array<{ songTitle: string; artistName: string; theirPlays: number; yourPlays: number }>;
}

interface OverlapData {
  overlapPercent: number;
  sharedCount: number;
  exclusiveToYou: number;
  exclusiveToThem: number;
  sharedSongs: Array<{ songTitle: string; artistName: string; yourPlays: number; theirPlays: number }>;
}

type Period = "day" | "week" | "month";

const PERIOD_OPTIONS: Array<{ value: Period; label: string }> = [
  { value: "day", label: "Azi" },
  { value: "week", label: "7 zile" },
  { value: "month", label: "30 zile" },
];

// ─── Page ───────────────────────────────────────────────────────────────

export default function CompetitorsPage() {
  const [period, setPeriod] = useState<Period>("week");
  const [watched, setWatched] = useState<WatchedStation[]>([]);
  const [allStations, setAllStations] = useState<StationLite[]>([]);
  const [ownIds, setOwnIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [pendingRemove, setPendingRemove] = useState<WatchedStation | null>(null);
  const [removing, setRemoving] = useState(false);
  const [addStationId, setAddStationId] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [w, own, stations] = await Promise.all([
        apiFetch<WatchedStation[]>("/competitors/watched"),
        apiFetch<{ stationIds: number[] }>("/competitors/own"),
        apiFetch<StationLite[]>("/stations").catch(() => [] as StationLite[]),
      ]);
      setWatched(w);
      setOwnIds(own.stationIds);
      setAllStations(stations);
      setSelectedStationId((prev) => prev ?? w[0]?.stationId ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut încărca competitorii");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const summary = useGated<CompetitorCard[]>(
    () => apiFetch(`/competitors/summary?period=${period}`),
    [period, watched.length],
  );

  async function addCompetitor() {
    if (!addStationId) return;
    setAdding(true);
    setError(null);
    try {
      await apiFetch("/competitors/watched", {
        method: "POST",
        body: JSON.stringify({ stationId: Number(addStationId) }),
      });
      setAddStationId("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut adăuga competitorul");
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove() {
    if (!pendingRemove) return;
    setRemoving(true);
    try {
      await apiFetch(`/competitors/watched/${pendingRemove.stationId}`, { method: "DELETE" });
      if (selectedStationId === pendingRemove.stationId) setSelectedStationId(null);
      setPendingRemove(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ștergerea a eșuat");
      setPendingRemove(null);
    } finally {
      setRemoving(false);
    }
  }

  const watchedIds = new Set(watched.map((w) => w.stationId));
  const addable = allStations.filter((s) => !watchedIds.has(s.id) && !ownIds.includes(s.id));
  const selected = watched.find((w) => w.stationId === selectedStationId) ?? null;
  const summaryByStation = new Map((summary.data ?? []).map((c) => [c.stationId, c]));

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Competitori"
        description="Urmărește ce difuzează stațiile concurente."
        actions={<PeriodPicker value={period} onChange={setPeriod} options={PERIOD_OPTIONS} />}
      />

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} onRetry={load} />
        </div>
      )}

      {/* Add competitor */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[220px]">
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
            Adaugă un competitor (max. 20)
          </label>
          <select
            value={addStationId}
            onChange={(e) => setAddStationId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="">Alege o stație…</option>
            {addable.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={addCompetitor}
          disabled={!addStationId || adding}
          className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
        >
          {adding ? "Se adaugă…" : "Urmărește"}
        </button>
      </div>

      {loading ? (
        <Skeleton rows={4} />
      ) : watched.length === 0 ? (
        <EmptyState
          title="Niciun competitor urmărit"
          message="Alege stațiile concurente de mai sus — vezi ce difuzează, ce au exclusiv și cât de mult vă suprapuneți."
        />
      ) : (
        <>
          {/* Competitor cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {watched.map((w) => {
              const card = summaryByStation.get(w.stationId);
              return (
                <button
                  key={w.id}
                  onClick={() => setSelectedStationId(w.stationId)}
                  className={cn(
                    "text-left bg-zinc-900 border rounded-xl p-4 transition-colors",
                    selectedStationId === w.stationId
                      ? "border-brand-500/50 bg-brand-500/[0.04]"
                      : "border-zinc-800 hover:border-zinc-700",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-white font-semibold truncate">{w.stationName}</div>
                      <div className="text-xs text-zinc-500 mt-1">
                        {card ? (
                          <>
                            <span className="font-mono text-zinc-300">
                              {formatNumber(card.playCount)}
                            </span>{" "}
                            difuzări
                            {card.topSong && (
                              <div className="truncate mt-0.5">
                                top: {card.topSong.title} — {card.topSong.artist}
                              </div>
                            )}
                          </>
                        ) : summary.loading ? (
                          "se încarcă…"
                        ) : (
                          "fără date"
                        )}
                      </div>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingRemove(w);
                      }}
                      title="Nu mai urmări"
                      className="text-zinc-600 hover:text-brand-400 transition-colors p-1 shrink-0"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="w-4 h-4"
                      >
                        <path d="M18 6 6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Detail for the selected competitor */}
          {selected && (
            <CompetitorDetailPanel
              key={`${selected.stationId}-${period}`}
              competitor={selected}
              period={period}
            />
          )}
        </>
      )}

      <ConfirmDialog
        open={pendingRemove !== null}
        title="Nu mai urmărești stația?"
        message={
          pendingRemove ? (
            <>
              <span className="text-white font-medium">{pendingRemove.stationName}</span> dispare
              din lista ta de competitori.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Nu mai urmări"
        cancelLabel="Renunță"
        danger
        loading={removing}
        onConfirm={handleRemove}
        onCancel={() => setPendingRemove(null)}
      />
    </div>
  );
}

// ─── Detail panel ───────────────────────────────────────────────────────

function CompetitorDetailPanel({
  competitor,
  period,
}: {
  competitor: WatchedStation;
  period: Period;
}) {
  const detail = useGated<CompetitorDetail>(
    () => apiFetch(`/competitors/${competitor.stationId}/detail?period=${period}`),
    [competitor.stationId, period],
  );
  const overlap = useGated<OverlapData>(
    () => apiFetch(`/station/overlap/${competitor.stationId}?period=${period}`),
    [competitor.stationId, period],
  );

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">
        Detalii: <span className="text-brand-400">{competitor.stationName}</span>
      </h2>

      {/* Overlap (premium) */}
      <Card title="Suprapunere playlist" className="mb-6">
        <PremiumGate
          state={overlap}
          skeletonRows={3}
          lockTitle="Analiza competitorilor e Premium"
          lockMessage="Vezi câte piese aveți în comun, ce difuzează doar ei și cât de asemănătoare sunt playlisturile."
        >
          {(data) => (
            <div className="grid lg:grid-cols-2 gap-6 items-start">
              <OverlapViz
                overlapPercent={data.overlapPercent}
                exclusiveToYou={data.exclusiveToYou}
                sharedCount={data.sharedCount}
                exclusiveToThem={data.exclusiveToThem}
                competitorName={competitor.stationName}
              />
              <div>
                <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                  Piese comune (top {Math.min(10, data.sharedSongs.length)})
                </div>
                {data.sharedSongs.length === 0 ? (
                  <p className="text-sm text-zinc-500">Nicio piesă comună în perioada asta.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/60">
                    {data.sharedSongs.slice(0, 10).map((s, i) => (
                      <li key={i} className="py-2 flex items-center gap-3 text-sm">
                        <div className="min-w-0 flex-1">
                          <div className="text-white truncate">{s.songTitle}</div>
                          <div className="text-xs text-zinc-500 truncate">{s.artistName}</div>
                        </div>
                        <span className="font-mono text-xs text-zinc-400 shrink-0">
                          tu {s.yourPlays} · ei {s.theirPlays}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </PremiumGate>
      </Card>

      {detail.loading ? (
        <Skeleton rows={5} />
      ) : detail.error ? (
        <ErrorNotice message={detail.error} onRetry={detail.reload} />
      ) : detail.data ? (
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Top songs at competitor */}
          <Card title="Top piese la ei">
            {detail.data.topSongs.length === 0 ? (
              <p className="text-sm text-zinc-500 py-3">Fără difuzări în perioada asta.</p>
            ) : (
              <ul className="divide-y divide-zinc-800/60">
                {detail.data.topSongs.slice(0, 12).map((s, i) => (
                  <li key={i} className="py-2 flex items-center gap-3 text-sm">
                    <span className="font-mono text-zinc-500 w-6">{i + 1}</span>
                    <div className="min-w-0 flex-1">
                      <div className="text-white truncate">{s.title}</div>
                      <div className="text-xs text-zinc-500 truncate">{s.artist}</div>
                    </div>
                    <span className="font-mono text-zinc-300 shrink-0">
                      {formatNumber(s.playCount)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <div className="space-y-6">
            {/* Head-to-head comparison */}
            <Card title="Piese difuzate de amândoi">
              {detail.data.comparison.length === 0 ? (
                <p className="text-sm text-zinc-500 py-3">Nicio piesă în comun în perioada asta.</p>
              ) : (
                <TableShell>
                  <thead className="bg-zinc-950/60">
                    <tr>
                      <Th>Piesă</Th>
                      <Th align="right">Tu</Th>
                      <Th align="right">Ei</Th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.data.comparison.slice(0, 10).map((c, i) => (
                      <tr key={i} className="border-t border-zinc-800/60">
                        <td className="px-4 py-2">
                          <div className="text-white text-sm truncate max-w-[220px]">
                            {c.songTitle}
                          </div>
                          <div className="text-xs text-zinc-500 truncate max-w-[220px]">
                            {c.artistName}
                          </div>
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-sm text-white">
                          {c.yourPlays}
                        </td>
                        <td className="px-4 py-2 text-right font-mono text-sm text-zinc-400">
                          {c.theirPlays}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </TableShell>
              )}
            </Card>

            {/* Recent detections */}
            <Card title="Detecții recente la ei">
              {detail.data.recentDetections.length === 0 ? (
                <p className="text-sm text-zinc-500 py-3">Nimic detectat recent.</p>
              ) : (
                <ul className="divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">
                  {detail.data.recentDetections.slice(0, 15).map((d) => (
                    <li key={d.id} className="py-2 flex items-center gap-3 text-sm">
                      <div className="min-w-0 flex-1">
                        <div className="text-white truncate">{d.songTitle}</div>
                        <div className="text-xs text-zinc-500 truncate">{d.artistName}</div>
                      </div>
                      <span className="text-xs font-mono text-zinc-500 shrink-0">
                        {timeAgo(d.startedAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      ) : null}
    </div>
  );
}
