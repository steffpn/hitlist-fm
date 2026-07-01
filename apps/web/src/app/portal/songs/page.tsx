"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, isPremiumError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNumber, formatDayLabel } from "@/lib/format";
import { useCurrentUser, useImpersonation } from "@/lib/use-current-user";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ArtworkThumb,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Pill,
  Skeleton,
  Stat,
  TrendBadge,
} from "@/components/portal/ui";
import { BarSeries, HourlyHeatmap, ShareBar } from "@/components/portal/charts";
import {
  PremiumGate,
  PremiumLockCard,
  useGated,
} from "@/components/portal/premium-gate";

// ─── API shapes ─────────────────────────────────────────────────────────

interface MonitoredSong {
  id: number;
  songTitle: string;
  artistName: string;
  isrc: string;
  status: string;
  activatedAt: string;
  totalPlays: number;
  stationCount: number;
  trend: { direction: "up" | "down" | "flat"; percentChange: number };
}

interface BrowseTrack {
  title: string;
  artist: string;
  isrc: string | null;
  coverUrl: string | null;
  deezerTrackId: number;
}

interface SongAnalytics {
  song: { id: number; songTitle: string; artistName: string; isrc: string; activatedAt: string };
  dailyPlays: Array<{ date: string; count: number }>;
  totalPlays: number;
  stationCount: number;
}

interface StationBreakdownRow {
  stationId: number;
  stationName: string;
  logoUrl: string | null;
  playCount: number;
}

interface PeakHour {
  dayOfWeek: number;
  hour: number;
  plays: number;
  label: string;
}

interface SongTrend {
  thisWeek: number;
  lastWeek: number;
  percentChange: number;
  direction: "up" | "down" | "flat";
}

const DAY_RO = ["Duminică", "Luni", "Marți", "Miercuri", "Joi", "Vineri", "Sâmbătă"];

// ─── Page ───────────────────────────────────────────────────────────────

export default function SongsPage() {
  const user = useCurrentUser();
  const impersonation = useImpersonation();
  const artistName = impersonation?.displayName ?? user?.name ?? "";

  const [songs, setSongs] = useState<MonitoredSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<MonitoredSong | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<MonitoredSong[]>("/artist/songs");
      setSongs(data);
      setSelectedId((prev) => prev ?? data.find((s) => s.status === "active")?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut încărca piesele");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/artist/songs/${pendingDelete.id}`, { method: "DELETE" });
      if (selectedId === pendingDelete.id) setSelectedId(null);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ștergerea a eșuat");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const selected = songs.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Piesele mele"
        description="Piesele pe care le monitorizăm la radio pentru tine."
        actions={
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {showAdd ? "Închide" : "+ Adaugă piesă"}
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} onRetry={load} />
        </div>
      )}

      {showAdd && (
        <AddSongPanel
          artistName={artistName}
          existingIsrcs={new Set(songs.map((s) => s.isrc))}
          onAdded={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}

      {loading ? (
        <Skeleton rows={5} />
      ) : songs.length === 0 && !showAdd ? (
        <EmptyState
          title="Nicio piesă monitorizată"
          message="Adaugă prima piesă — o căutăm în catalog după titlu și numărăm fiecare difuzare de la activare încolo."
          cta={{ label: "Adaugă o piesă", onClick: () => setShowAdd(true) }}
        />
      ) : (
        songs.length > 0 && (
          <>
            {/* Song list */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden mb-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-zinc-950/60">
                    <tr className="text-zinc-400">
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Piesă</th>
                      <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">ISRC</th>
                      <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider">Difuzări</th>
                      <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider">Stații</th>
                      <th className="text-center px-4 py-3 text-xs font-medium uppercase tracking-wider">Trend</th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody>
                    {songs.map((s) => (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedId(s.id)}
                        className={cn(
                          "border-t border-zinc-800/60 cursor-pointer transition-colors",
                          selectedId === s.id
                            ? "bg-brand-500/[0.07]"
                            : "hover:bg-zinc-800/20",
                        )}
                      >
                        <td className="px-4 py-3">
                          <div className="text-white font-medium flex items-center gap-2">
                            {s.songTitle}
                            {s.status !== "active" && <Pill tone="amber">{s.status}</Pill>}
                          </div>
                          <div className="text-xs text-zinc-500">{s.artistName}</div>
                        </td>
                        <td className="px-4 py-3 text-xs font-mono text-zinc-400">{s.isrc}</td>
                        <td className="px-4 py-3 text-right font-mono text-white">
                          {formatNumber(s.totalPlays)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-zinc-400">
                          {s.stationCount}
                        </td>
                        <td className="px-4 py-3 text-center">
                          <TrendBadge
                            direction={s.trend.direction}
                            percentChange={s.trend.percentChange}
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setPendingDelete(s);
                            }}
                            title="Nu mai monitoriza piesa"
                            className="text-xs text-zinc-500 hover:text-brand-400 transition-colors"
                          >
                            Șterge
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Analytics for the selected song */}
            {selected && <SongAnalyticsPanel key={selected.id} song={selected} />}
          </>
        )
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Ștergi piesa?"
        message={
          pendingDelete ? (
            <>
              Nu vom mai monitoriza{" "}
              <span className="text-white font-medium">{pendingDelete.songTitle}</span>. Istoricul
              difuzărilor detectate rămâne în platformă.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Șterge"
        cancelLabel="Renunță"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

// ─── Add song panel (catalog search + manual fallback) ──────────────────

function AddSongPanel({
  artistName,
  existingIsrcs,
  onAdded,
}: {
  artistName: string;
  existingIsrcs: Set<string>;
  onAdded: () => void;
}) {
  const [mode, setMode] = useState<"search" | "manual">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrowseTrack[]>([]);
  const [searching, setSearching] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);
  const [premiumLimit, setPremiumLimit] = useState(false);
  const [addingIsrc, setAddingIsrc] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // manual fallback
  const [manualTitle, setManualTitle] = useState("");
  const [manualIsrc, setManualIsrc] = useState("");
  const [manualSubmitting, setManualSubmitting] = useState(false);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch<BrowseTrack[]>(
          `/artist/browse-tracks?q=${encodeURIComponent(query.trim())}`,
        );
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function addSong(songTitle: string, artist: string, isrc: string) {
    setAddError(null);
    setAddingIsrc(isrc);
    try {
      await apiFetch("/artist/songs", {
        method: "POST",
        body: JSON.stringify({ songTitle, artistName: artist, isrc }),
      });
      onAdded();
    } catch (err) {
      if (isPremiumError(err)) {
        setPremiumLimit(true);
      } else {
        setAddError(err instanceof Error ? err.message : "Nu am putut adăuga piesa");
      }
    } finally {
      setAddingIsrc(null);
    }
  }

  if (premiumLimit) {
    return (
      <div className="mb-6">
        <PremiumLockCard
          title="Ai atins limita planului gratuit"
          message="Planul gratuit permite până la 5 piese monitorizate. Fă upgrade ca să monitorizezi oricâte piese vrei."
        />
      </div>
    );
  }

  return (
    <Card title="Adaugă o piesă" className="mb-6">
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("search")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
            mode === "search"
              ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
              : "text-zinc-400 border-zinc-800 hover:text-white",
          )}
        >
          Caută în catalog
        </button>
        <button
          onClick={() => setMode("manual")}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors",
            mode === "manual"
              ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
              : "text-zinc-400 border-zinc-800 hover:text-white",
          )}
        >
          Introdu manual (ISRC)
        </button>
      </div>

      {addError && (
        <div className="mb-3">
          <ErrorNotice message={addError} />
        </div>
      )}

      {mode === "search" ? (
        <>
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Caută piesele tale — ex. „${artistName || "artist"} titlu piesă”`}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/60"
          />
          <p className="text-[11px] text-zinc-500 mt-1.5">
            Poți monitoriza doar piese care apar sub numele tău de artist ({artistName}).
          </p>
          {searching ? (
            <div className="mt-3">
              <Skeleton rows={3} />
            </div>
          ) : results.length > 0 ? (
            <ul className="mt-3 divide-y divide-zinc-800/60 max-h-80 overflow-y-auto">
              {results.map((t) => {
                const already = t.isrc !== null && existingIsrcs.has(t.isrc);
                const ownTrack =
                  t.artist.toLowerCase() === artistName.toLowerCase();
                return (
                  <li key={t.deezerTrackId} className="py-2 flex items-center gap-3">
                    <ArtworkThumb url={t.coverUrl} />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{t.title}</div>
                      <div className="text-xs text-zinc-500 truncate">
                        {t.artist} · <span className="font-mono">{t.isrc}</span>
                      </div>
                    </div>
                    {already ? (
                      <Pill tone="neutral">deja monitorizată</Pill>
                    ) : (
                      <button
                        disabled={addingIsrc !== null || !t.isrc || !ownTrack}
                        title={
                          ownTrack
                            ? undefined
                            : "Poți adăuga doar piese sub numele tău de artist"
                        }
                        onClick={() => t.isrc && addSong(t.title, t.artist, t.isrc)}
                        className="px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-40 shrink-0"
                      >
                        {addingIsrc === t.isrc ? "Se adaugă…" : "Adaugă"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : query.trim().length >= 2 ? (
            <p className="text-sm text-zinc-500 mt-4">
              Nimic găsit. Încearcă alt titlu sau{" "}
              <button onClick={() => setMode("manual")} className="text-brand-400 hover:underline">
                adaugă manual cu ISRC
              </button>
              .
            </p>
          ) : null}
        </>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setManualSubmitting(true);
            await addSong(manualTitle.trim(), artistName, manualIsrc.trim().toUpperCase());
            setManualSubmitting(false);
          }}
          className="grid sm:grid-cols-[1fr_1fr_auto] gap-3 items-end"
        >
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
              Titlul piesei
            </label>
            <input
              required
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500/60"
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
              ISRC
            </label>
            <input
              required
              value={manualIsrc}
              onChange={(e) => setManualIsrc(e.target.value)}
              placeholder="ex. ROA012400123"
              className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white font-mono placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/60"
            />
          </div>
          <button
            type="submit"
            disabled={manualSubmitting}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
          >
            {manualSubmitting ? "Se adaugă…" : "Adaugă"}
          </button>
        </form>
      )}
    </Card>
  );
}

// ─── Analytics panel for the selected song ──────────────────────────────

function SongAnalyticsPanel({ song }: { song: MonitoredSong }) {
  const analytics = useGated<SongAnalytics>(
    () => apiFetch(`/artist/songs/${song.id}/analytics`),
    [song.id],
  );
  const trend = useGated<SongTrend>(() => apiFetch(`/artist/songs/${song.id}/trend`), [song.id]);
  const breakdown = useGated<StationBreakdownRow[]>(
    () => apiFetch(`/artist/songs/${song.id}/station-breakdown`),
    [song.id],
  );
  const peakHours = useGated<PeakHour[]>(
    () => apiFetch(`/artist/songs/${song.id}/peak-hours`),
    [song.id],
  );
  const heatmap = useGated<{ matrix: number[][]; maxValue: number }>(
    () => apiFetch(`/artist/songs/${song.id}/hourly-heatmap`),
    [song.id],
  );

  return (
    <div>
      <h2 className="text-lg font-bold text-white mb-4">
        Analiză: <span className="text-brand-400">{song.songTitle}</span>
      </h2>

      {/* Totals + trend */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Difuzări total" value={formatNumber(song.totalPlays)} tone="brand" />
        <Stat label="Stații" value={song.stationCount} />
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
          <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
            Săptămâna asta vs trecută
          </div>
          {trend.loading ? (
            <div className="h-8 w-24 bg-zinc-800 rounded animate-pulse" />
          ) : trend.data ? (
            <div className="flex items-center gap-3">
              <span className="text-3xl font-bold font-mono text-white">
                {formatNumber(trend.data.thisWeek)}
              </span>
              <TrendBadge
                direction={trend.data.direction}
                percentChange={trend.data.percentChange}
              />
            </div>
          ) : (
            <span className="text-zinc-500 text-sm">—</span>
          )}
          {trend.data && (
            <div className="text-xs text-zinc-500 mt-1">
              săpt. trecută: {formatNumber(trend.data.lastWeek)}
            </div>
          )}
        </div>
      </div>

      {/* Daily series */}
      <Card title="Difuzări pe zi" className="mb-6">
        {analytics.loading ? (
          <Skeleton rows={3} />
        ) : analytics.error ? (
          <ErrorNotice message={analytics.error} onRetry={analytics.reload} />
        ) : analytics.data ? (
          <BarSeries
            points={analytics.data.dailyPlays.map((d) => ({
              label: formatDayLabel(d.date),
              value: d.count,
            }))}
          />
        ) : null}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Station breakdown */}
        <Card title="Pe stații">
          {breakdown.loading ? (
            <Skeleton rows={4} />
          ) : breakdown.error ? (
            <p className="text-sm text-zinc-500">{breakdown.error}</p>
          ) : !breakdown.data || breakdown.data.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">Nicio difuzare detectată încă.</p>
          ) : (
            <ul className="space-y-2.5">
              {breakdown.data.map((b) => (
                <li key={b.stationId} className="flex items-center gap-3 text-sm">
                  <ArtworkThumb url={b.logoUrl} size="sm" rounded="rounded-full" />
                  <span className="text-white flex-1 min-w-0 truncate">{b.stationName}</span>
                  <div className="w-28 hidden sm:block">
                    <ShareBar value={b.playCount} max={breakdown.data![0].playCount} />
                  </div>
                  <span className="font-mono text-zinc-300 w-14 text-right">
                    {formatNumber(b.playCount)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Peak hours */}
        <Card title="Orele de vârf">
          {peakHours.loading ? (
            <Skeleton rows={4} />
          ) : peakHours.error ? (
            <p className="text-sm text-zinc-500">{peakHours.error}</p>
          ) : !peakHours.data || peakHours.data.length === 0 ? (
            <p className="text-sm text-zinc-500 py-4">Încă nu avem destule date.</p>
          ) : (
            <ul className="space-y-2.5">
              {peakHours.data.map((p, i) => (
                <li key={`${p.dayOfWeek}-${p.hour}`} className="flex items-center gap-3 text-sm">
                  <span className="font-mono text-brand-400 font-bold w-5">{i + 1}</span>
                  <span className="text-white flex-1">
                    {DAY_RO[p.dayOfWeek]}, {String(p.hour).padStart(2, "0")}:00
                  </span>
                  <span className="font-mono text-zinc-300">{formatNumber(p.plays)} difuzări</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Hourly heatmap (premium) */}
      <Card title="Harta orelor de difuzare (7 zile × 24 ore)">
        <PremiumGate
          state={heatmap}
          skeletonRows={4}
          lockTitle="Heatmap-ul orar e Premium"
          lockMessage="Vezi exact în ce zile și la ce ore se învârte piesa ta, pe o hartă 7×24."
        >
          {(data) => <HourlyHeatmap matrix={data.matrix} maxValue={data.maxValue} />}
        </PremiumGate>
      </Card>
    </div>
  );
}
