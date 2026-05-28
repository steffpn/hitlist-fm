"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/cn";

interface AirplayEvent {
  id: number;
  stationId: number;
  startedAt: string;
  endedAt: string;
  songTitle: string;
  artistName: string;
  isrc: string | null;
  confidence: number;
  playCount: number;
  snippetUrl: string | null;
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

export default function DetectionsPage() {
  const [events, setEvents] = useState<AirplayEvent[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // filters
  const [q, setQ] = useState("");
  const [stationId, setStationId] = useState<string>("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // playback
  const [playingId, setPlayingId] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const fetchEvents = useCallback(async (cursor?: number) => {
    const token = getToken();
    if (!token) return;
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
      const res = await apiFetch<ListResponse>(`/airplay-events?${params}`, { token });
      setEvents((prev) => (cursor ? [...prev, ...res.data] : res.data));
      setNextCursor(res.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [q, stationId, startDate, endDate]);

  useEffect(() => {
    const token = getToken();
    if (!token) return;
    apiFetch<Station[]>("/stations", { token }).then(setStations).catch(() => {});
  }, []);

  // debounce filter changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchEvents(), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [fetchEvents]);

  async function playSnippet(eventId: number) {
    const token = getToken();
    if (!token) return;
    if (playingId === eventId && audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setPlayingId(null);
      return;
    }
    try {
      const res = await apiFetch<{ url: string }>(`/airplay-events/${eventId}/snippet`, { token });
      if (audioRef.current) audioRef.current.pause();
      const audio = new Audio(res.url);
      audio.onended = () => setPlayingId(null);
      audio.onerror = () => {
        setPlayingId(null);
        alert("Failed to play snippet");
      };
      audioRef.current = audio;
      setPlayingId(eventId);
      await audio.play();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Snippet unavailable");
      setPlayingId(null);
    }
  }

  function resetFilters() {
    setQ("");
    setStationId("");
    setStartDate("");
    setEndDate("");
  }

  const hasFilters = q || stationId || startDate || endDate;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Detections</h1>
        <p className="text-sm text-zinc-500 mt-1">Live airplay events from ACRCloud detection pipeline.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[240px]">
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Search</label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Song title, artist, ISRC"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600"
          />
        </div>
        <div className="min-w-[180px]">
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Station</label>
          <select
            value={stationId}
            onChange={(e) => setStationId(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="">All stations</option>
            {stations.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">From</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">To</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
          />
        </div>
        {hasFilters && (
          <button
            onClick={resetFilters}
            className="px-3 py-2 text-xs text-zinc-500 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-red-400/10 border border-red-400/20 rounded-xl text-red-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950/60">
              <tr className="text-zinc-400">
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">When</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Song</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Station</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Confidence</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">ISRC</th>
                <th className="text-right px-4 py-3 text-xs font-medium uppercase tracking-wider">Snippet</th>
              </tr>
            </thead>
            <tbody>
              {loading && events.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500 text-sm">Loading…</td></tr>
              ) : events.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-600 text-sm">No detections match.</td></tr>
              ) : (
                events.map((e) => (
                  <tr key={e.id} className="border-t border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
                    <td className="px-4 py-3 text-xs text-zinc-400 whitespace-nowrap">
                      <div>{formatDate(e.startedAt)}</div>
                      <div className="text-zinc-600">{formatTime(e.startedAt)} · {durationSec(e.startedAt, e.endedAt)}s</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{e.songTitle}</div>
                      <div className="text-xs text-zinc-500">{e.artistName}</div>
                    </td>
                    <td className="px-4 py-3 text-zinc-300">{e.station.name}</td>
                    <td className="px-4 py-3">
                      <ConfidenceBar value={e.confidence} />
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-500">
                      {e.isrc ?? <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {e.snippetUrl ? (
                        <button
                          onClick={() => playSnippet(e.id)}
                          className={cn(
                            "text-xs px-3 py-1 rounded-lg border transition-colors",
                            playingId === e.id
                              ? "bg-emerald-400/20 text-emerald-300 border-emerald-400/30"
                              : "bg-zinc-800/40 text-zinc-300 border-zinc-700 hover:border-zinc-500",
                          )}
                        >
                          {playingId === e.id ? "■ Stop" : "▶ Play"}
                        </button>
                      ) : (
                        <span className="text-xs text-zinc-700">no snippet</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {nextCursor && (
          <div className="border-t border-zinc-800/60 p-4 text-center">
            <button
              onClick={() => fetchEvents(nextCursor)}
              disabled={loadingMore}
              className="text-sm text-zinc-400 hover:text-white disabled:opacity-50"
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value);
  const tone = pct >= 90 ? "bg-emerald-400" : pct >= 70 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className={cn("h-full", tone)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-zinc-500 w-7 text-right">{pct}</span>
    </div>
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}
function durationSec(start: string, end: string): number {
  return Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
}
