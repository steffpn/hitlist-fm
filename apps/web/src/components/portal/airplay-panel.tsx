"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiDownload, apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDate, formatTime } from "@/lib/format";
import {
  ArtworkThumb,
  EmptyState,
  ErrorNotice,
  Skeleton,
  TableShell,
  Th,
} from "@/components/portal/ui";

interface AirplayEvent {
  id: number;
  stationId: number;
  startedAt: string;
  endedAt: string;
  songTitle: string;
  artistName: string;
  isrc: string | null;
  snippetUrl: string | null;
  partialPlay: boolean;
  artworkUrl: string | null;
  station: { name: string };
}

interface Station {
  id: number;
  name: string;
}

interface ListResponse {
  data: AirplayEvent[];
  nextCursor: number | null;
}

/**
 * Shared detections panel (all portal roles): search + station/date filters,
 * cursor pagination, snippet playback and CSV/PDF export. The API scopes the
 * results server-side (artist → own ISRCs, label → roster, station → own
 * stations), so this component is role-agnostic.
 */
export function AirplayEventsPanel({
  emptyTitle = "Nicio difuzare încă",
  emptyMessage = "Când piesele monitorizate ajung on air, detecțiile apar aici.",
  emptyCta,
}: {
  emptyTitle?: string;
  emptyMessage?: string;
  emptyCta?: { label: string; href: string };
}) {
  const [events, setEvents] = useState<AirplayEvent[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [stationId, setStationId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // snippet playback
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchEvents = useCallback(
    async (cursor?: number) => {
      const params = new URLSearchParams({ limit: "30" });
      if (cursor) params.set("cursor", String(cursor));
      if (q.trim()) params.set("q", q.trim());
      if (stationId) params.set("stationId", stationId);
      if (startDate) params.set("startDate", startDate);
      if (endDate) params.set("endDate", endDate);

      if (cursor) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<ListResponse>(`/airplay-events?${params}`);
        setEvents((prev) => (cursor ? [...prev, ...res.data] : res.data));
        setNextCursor(res.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Nu am putut încărca difuzările");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [q, stationId, startDate, endDate],
  );

  useEffect(() => {
    apiFetch<Station[]>("/stations")
      .then(setStations)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEvents(), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchEvents]);

  // Stop audio when the component unmounts.
  useEffect(() => {
    return () => {
      audioRef.current?.pause();
    };
  }, []);

  async function playSnippet(eventId: number) {
    if (playingId === eventId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    try {
      const res = await apiFetch<{ url: string }>(`/airplay-events/${eventId}/snippet`);
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(res.url);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => setPlayingId(null);
      audioRef.current = audio;
      setPlayingId(eventId);
      await audio.play();
    } catch {
      setPlayingId(null);
    }
  }

  function exportQuery(): string {
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (stationId) params.set("stationId", stationId);
    if (startDate) params.set("startDate", startDate);
    if (endDate) params.set("endDate", endDate);
    const s = params.toString();
    return s ? `?${s}` : "";
  }

  const [exporting, setExporting] = useState<"csv" | "pdf" | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const pdfReady = !!startDate && !!endDate;

  async function handleExport(kind: "csv" | "pdf") {
    setExporting(kind);
    setExportError(null);
    try {
      await apiDownload(
        `/exports/${kind}${exportQuery()}`,
        kind === "csv" ? "difuzari-hitlist.csv" : "raport-difuzari.pdf",
      );
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Exportul a eșuat");
    } finally {
      setExporting(null);
    }
  }

  const hasFilters = q || stationId || startDate || endDate;
  const showEmptyState = !loading && events.length === 0 && !hasFilters && !error;

  return (
    <div>
      {/* Filters + export */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
            Caută
          </label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Titlu, artist sau ISRC"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/60"
          />
        </div>
        <div className="min-w-[160px]">
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
            Stație
          </label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="">Toate stațiile</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
            De la
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
            Până la
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => {
              setQ("");
              setStationId("");
              setStartDate("");
              setEndDate("");
            }}
            className="px-3 py-2 text-xs text-zinc-400 hover:text-white"
          >
            Resetează
          </button>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => handleExport("csv")}
            disabled={exporting !== null}
            className="px-3 py-2 text-xs font-semibold text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {exporting === "csv" ? "Se exportă…" : "Export CSV"}
          </button>
          <button
            onClick={() => handleExport("pdf")}
            disabled={exporting !== null || !pdfReady}
            title={pdfReady ? "Raport PDF cu brand hitlist.fm" : "Alege mai întâi un interval de date"}
            className="px-3 py-2 text-xs font-semibold text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {exporting === "pdf" ? "Se exportă…" : "Export PDF"}
          </button>
        </div>
      </div>

      {exportError && (
        <div className="mb-4">
          <ErrorNotice message={exportError} />
        </div>
      )}
      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} onRetry={() => fetchEvents()} />
        </div>
      )}

      {loading && events.length === 0 ? (
        <Skeleton rows={6} />
      ) : showEmptyState ? (
        <EmptyState title={emptyTitle} message={emptyMessage} cta={emptyCta} />
      ) : (
        <TableShell>
          <thead className="bg-zinc-950/60">
            <tr>
              <Th>Când</Th>
              <Th>Piesă</Th>
              <Th>Stație</Th>
              <Th>ISRC</Th>
              <Th align="right">Snippet</Th>
            </tr>
          </thead>
          <tbody>
            {events.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-zinc-500 text-sm">
                  Nicio difuzare nu se potrivește filtrelor.
                </td>
              </tr>
            ) : (
              events.map((e) => (
                <tr
                  key={e.id}
                  className="border-t border-zinc-800/60 hover:bg-zinc-800/20 transition-colors"
                >
                  <td className="px-4 py-3 text-xs font-mono text-zinc-400 whitespace-nowrap">
                    <div>{formatDate(e.startedAt)}</div>
                    <div className="text-zinc-500">{formatTime(e.startedAt)}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ArtworkThumb url={e.artworkUrl} />
                      <div className="min-w-0">
                        <div className="text-white font-medium flex items-center gap-2">
                          <span className="truncate">{e.songTitle}</span>
                          {e.partialPlay && (
                            <span
                              title="Difuzare parțială — sub 30 de secunde (teaser/jingle), exclusă din statistici"
                              className="inline-flex items-center text-[9px] font-mono uppercase tracking-wider text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-full px-1.5 py-0.5 shrink-0"
                            >
                              parțial &lt;30s
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-zinc-400 truncate">{e.artistName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-zinc-300 whitespace-nowrap">{e.station.name}</td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                    {e.isrc ?? <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {e.snippetUrl ? (
                      <button
                        onClick={() => playSnippet(e.id)}
                        className={cn(
                          "text-xs px-3 py-1 rounded-lg border transition-colors",
                          playingId === e.id
                            ? "bg-brand-500/20 text-brand-300 border-brand-500/30"
                            : "bg-zinc-800/40 text-zinc-300 border-zinc-700 hover:border-zinc-500",
                        )}
                      >
                        {playingId === e.id ? "■ Stop" : "▶ Ascultă"}
                      </button>
                    ) : (
                      <span className="text-xs text-zinc-600">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </TableShell>
      )}

      {nextCursor && !showEmptyState && (
        <div className="mt-4 text-center">
          <button
            onClick={() => fetchEvents(nextCursor)}
            disabled={loadingMore}
            className="text-sm text-zinc-400 hover:text-white disabled:opacity-50"
          >
            {loadingMore ? "Se încarcă…" : "Încarcă mai multe"}
          </button>
        </div>
      )}
    </div>
  );
}
