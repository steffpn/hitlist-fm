"use client";

import { useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";

// GET /admin/acrcloud-search?q=&type= — proxied ACRCloud external-metadata
// response. Shape is ACRCloud's; typed loosely and rendered defensively.
interface AcrTrack {
  name?: string;
  isrc?: string;
  duration_ms?: number;
  label?: string;
  release_date?: string;
  artists?: Array<{ name?: string }>;
  album?: { name?: string };
  external_metadata?: {
    spotify?: { id?: string };
    deezer?: { id?: string };
    youtube?: { id?: string };
  };
}

interface SearchResponse {
  data?: AcrTrack[];
}

const SEARCH_TYPES = ["track", "artist", "album"] as const;
type SearchType = (typeof SEARCH_TYPES)[number];

export default function AcrcloudSearchPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState<SearchType>("track");
  const [results, setResults] = useState<AcrTrack[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSearch(e: FormEvent) {
    e.preventDefault();
    const query = q.trim();
    if (!query) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ q: query, type });
      const res = await apiFetch<SearchResponse>(`/admin/acrcloud-search?${params}`);
      setResults(Array.isArray(res?.data) ? res.data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
      setResults(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">ACRCloud Search</h1>
        <p className="text-sm text-zinc-400 mt-1">
          Search the ACRCloud music catalog — verify whether a song is fingerprintable before
          chasing a &quot;missing&quot; detection.
        </p>
      </div>

      <form
        onSubmit={handleSearch}
        className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 mb-6 flex flex-wrap gap-3 items-end"
      >
        <div className="flex-1 min-w-[260px]">
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Query</label>
          <input
            type="search"
            value={q}
            autoFocus
            onChange={(e) => setQ(e.target.value)}
            placeholder="Song title, artist or album"
            className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/60"
          />
        </div>
        <div>
          <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">Type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as SearchType)}
            className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
          >
            {SEARCH_TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading || !q.trim()}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-semibold transition-colors",
            loading || !q.trim()
              ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
              : "bg-brand-600 text-white hover:bg-brand-500",
          )}
        >
          {loading ? "Searching…" : "Search"}
        </button>
      </form>

      {error && (
        <div className="mb-4 px-4 py-3 bg-brand-400/10 border border-brand-400/20 rounded-xl text-brand-400 text-sm">
          {error}
        </div>
      )}

      {results !== null && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-zinc-950/60">
                <tr className="text-zinc-400">
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Track</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Album</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">ISRC</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Duration</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Label</th>
                  <th className="text-left px-4 py-3 text-xs font-medium uppercase tracking-wider">Released</th>
                </tr>
              </thead>
              <tbody>
                {results.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-12 text-center text-zinc-500">
                      No catalog matches — candidate for a missing-song submission.
                    </td>
                  </tr>
                ) : (
                  results.map((t, i) => (
                    <tr key={`${t.isrc ?? "row"}-${i}`} className="border-t border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
                      <td className="px-4 py-3">
                        <div className="text-white font-medium">{t.name ?? "—"}</div>
                        <div className="text-xs text-zinc-400">
                          {(t.artists ?? []).map((a) => a.name).filter(Boolean).join(", ") || "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-zinc-300 text-xs">{t.album?.name ?? "—"}</td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                        {t.isrc ?? <span className="text-zinc-700">—</span>}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                        {formatDuration(t.duration_ms)}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400 max-w-[180px] truncate">
                        {t.label ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-xs font-mono text-zinc-400 whitespace-nowrap">
                        {t.release_date ?? "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {results.length > 0 && (
            <div className="border-t border-zinc-800/60 px-4 py-2 text-[11px] text-zinc-500">
              {results.length} result{results.length === 1 ? "" : "s"} from ACRCloud catalog
            </div>
          )}
        </div>
      )}

      {results === null && !error && (
        <div className="bg-zinc-900/50 border border-dashed border-zinc-800 rounded-xl py-16 text-center text-zinc-500 text-sm">
          Type a query above to search the ACRCloud catalog.
        </div>
      )}
    </div>
  );
}

function formatDuration(ms?: number): string {
  if (!ms || ms <= 0) return "—";
  const totalSec = Math.round(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${String(sec).padStart(2, "0")}`;
}
