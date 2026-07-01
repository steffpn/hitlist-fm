"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

// GET /admin/missing-songs — MissingSongReport + reporter
interface MissingSongReport {
  id: number;
  songTitle: string;
  artistName: string;
  isrc: string | null;
  youtubeUrl: string | null;
  spotifyUrl: string | null;
  notes: string | null;
  status: "pending" | "submitted" | "resolved";
  createdAt: string;
  reporter: { name: string; email: string } | null;
}

interface ListResponse {
  data: MissingSongReport[];
  nextCursor: number | null;
}

const STATUSES = ["pending", "submitted", "resolved"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-400/10 text-amber-400 border-amber-400/20",
  submitted: "bg-blue-400/10 text-blue-400 border-blue-400/20",
  resolved: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
};

export default function MissingSongsPage() {
  const [reports, setReports] = useState<MissingSongReport[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState<Status | "">("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchReports = useCallback(
    async (cursor?: number) => {
      const params = new URLSearchParams({ limit: "30" });
      if (statusFilter) params.set("status", statusFilter);
      if (cursor) params.set("cursor", String(cursor));

      if (cursor) setLoadingMore(true);
      else setLoading(true);
      setError(null);
      try {
        const res = await apiFetch<ListResponse>(`/admin/missing-songs?${params}`);
        setReports((prev) => (cursor ? [...prev, ...res.data] : res.data));
        setNextCursor(res.nextCursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load reports");
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [statusFilter],
  );

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function changeStatus(id: number, status: Status) {
    setUpdatingId(id);
    try {
      const updated = await apiFetch<MissingSongReport>(`/admin/missing-songs/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: updated.status } : r)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Missing Songs</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Songs users reported as absent from the ACRCloud catalog.
          </p>
        </div>
        <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1">
          {(["", ...STATUSES] as const).map((s) => (
            <button
              key={s || "all"}
              onClick={() => setStatusFilter(s)}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors",
                statusFilter === s
                  ? "bg-brand-500/15 text-brand-400"
                  : "text-zinc-400 hover:text-white",
              )}
            >
              {s || "All"}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 bg-brand-400/10 border border-brand-400/20 rounded-xl text-brand-400 text-sm">
          {error}
        </div>
      )}

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950/60">
              <tr className="text-zinc-400">
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Song</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">ISRC</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Links</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Reported by</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Reported</th>
                <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">Loading…</td></tr>
              ) : reports.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-zinc-500">No reports{statusFilter ? ` with status "${statusFilter}"` : ""}.</td></tr>
              ) : (
                reports.map((r) => (
                  <tr key={r.id} className="border-t border-zinc-800/60 hover:bg-zinc-800/20 transition-colors align-top">
                    <td className="px-4 py-3">
                      <div className="text-white font-medium">{r.songTitle}</div>
                      <div className="text-xs text-zinc-400">{r.artistName}</div>
                      {r.notes && (
                        <div className="text-[11px] text-zinc-500 mt-1 max-w-sm">{r.notes}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                      {r.isrc ?? <span className="text-zinc-700">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        {r.youtubeUrl && (
                          <a
                            href={r.youtubeUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-brand-400 hover:text-brand-300"
                          >
                            YouTube ↗
                          </a>
                        )}
                        {r.spotifyUrl && (
                          <a
                            href={r.spotifyUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-emerald-400 hover:text-emerald-300"
                          >
                            Spotify ↗
                          </a>
                        )}
                        {!r.youtubeUrl && !r.spotifyUrl && <span className="text-xs text-zinc-700">—</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs text-zinc-300">{r.reporter?.name ?? "—"}</div>
                      <div className="text-[11px] text-zinc-500">{r.reporter?.email}</div>
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-zinc-400 whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={r.status}
                        disabled={updatingId === r.id}
                        onChange={(e) => changeStatus(r.id, e.target.value as Status)}
                        className={cn(
                          "text-xs font-medium px-2 py-1 rounded-md border bg-transparent cursor-pointer",
                          STATUS_STYLES[r.status] || "text-zinc-400 border-zinc-700",
                          updatingId === r.id && "opacity-50",
                        )}
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s} className="bg-zinc-900 text-white">
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {nextCursor && !loading && (
          <div className="border-t border-zinc-800/60 p-4 text-center">
            <button
              onClick={() => fetchReports(nextCursor)}
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
