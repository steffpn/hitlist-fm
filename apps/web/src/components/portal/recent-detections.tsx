"use client";

import Link from "next/link";
import { apiFetch, apiDownload } from "@/lib/api";
import { useState } from "react";
import { timeAgo } from "@/lib/format";
import { ArtworkThumb, Card, Skeleton } from "@/components/portal/ui";
import { useGated } from "@/components/portal/premium-gate";

interface AirplayEvent {
  id: number;
  startedAt: string;
  songTitle: string;
  artistName: string;
  artworkUrl: string | null;
  station: { name: string };
}

/**
 * "Ultimele difuzări" card for the artist/label dashboards. The API scopes
 * events server-side to the user's monitored catalog.
 */
export function RecentDetectionsCard() {
  const state = useGated<{ data: AirplayEvent[] }>(
    () => apiFetch("/airplay-events?limit=8"),
    [],
  );
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handleExport() {
    setExporting(true);
    setExportError(null);
    try {
      await apiDownload("/exports/csv", "difuzari-hitlist.csv");
    } catch (err) {
      setExportError(err instanceof Error ? err.message : "Exportul a eșuat");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Card
      title="Ultimele difuzări"
      action={
        <div className="flex items-center gap-3">
          <button
            onClick={handleExport}
            disabled={exporting}
            className="text-xs font-semibold text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
          >
            {exporting ? "Se exportă…" : "Export CSV"}
          </button>
          <Link href="/portal/airplay" className="text-xs text-brand-400 hover:text-brand-300">
            Vezi tot →
          </Link>
        </div>
      }
    >
      {exportError && <p className="text-xs text-brand-400 mb-2">{exportError}</p>}
      {state.loading ? (
        <Skeleton rows={4} />
      ) : state.error ? (
        <p className="text-sm text-zinc-500">{state.error}</p>
      ) : !state.data || state.data.data.length === 0 ? (
        <p className="text-sm text-zinc-500 py-4">
          Nicio difuzare încă — detecția rulează non-stop, aparițiile on air apar aici.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {state.data.data.map((e) => (
            <li key={e.id} className="py-2 flex items-center gap-3 text-sm">
              <ArtworkThumb url={e.artworkUrl} size="sm" />
              <div className="min-w-0 flex-1">
                <div className="text-white truncate">{e.songTitle}</div>
                <div className="text-xs text-zinc-400 truncate">
                  {e.artistName} · {e.station.name}
                </div>
              </div>
              <span className="text-xs font-mono text-zinc-500 shrink-0">
                {timeAgo(e.startedAt)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
