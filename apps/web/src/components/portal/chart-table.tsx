"use client";

import { Fragment, useState } from "react";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { ArtworkThumb, Pill, TableShell, Th } from "@/components/portal/ui";

export interface ChartEntry {
  rank: number;
  songTitle: string;
  artistName: string;
  isrc: string;
  plays: number;
  stationCount: number;
  artworkUrl: string | null;
  delta: number | null;
  peakPosition: number | null;
  isNew: boolean;
}

export interface ChartResponse {
  period: string;
  periodStart: string;
  generatedAt: string;
  entries: ChartEntry[];
}

interface HistoryWeek {
  weekStart: string;
  plays: number;
  position: number;
}

function DeltaBadge({ entry }: { entry: ChartEntry }) {
  if (entry.isNew) {
    return <Pill tone="brand">nou</Pill>;
  }
  if (entry.delta === null || entry.delta === 0) {
    return <span className="text-zinc-500 font-mono text-xs">—</span>;
  }
  const up = entry.delta > 0;
  return (
    <span
      className={cn(
        "font-mono text-xs font-semibold",
        up ? "text-emerald-400" : "text-brand-400",
      )}
      title={up ? `A urcat ${entry.delta} poziții` : `A coborât ${Math.abs(entry.delta)} poziții`}
    >
      {up ? "↑" : "↓"} {Math.abs(entry.delta)}
    </span>
  );
}

/** Small sparkline of weekly chart positions (lower = better → inverted y). */
function PositionHistory({ weeks }: { weeks: HistoryWeek[] }) {
  if (weeks.length === 0) {
    return <p className="text-xs text-zinc-500">Fără istoric în ultimele 12 săptămâni.</p>;
  }
  const maxPos = Math.max(...weeks.map((w) => w.position));
  const W = 320;
  const H = 60;
  const PAD = 6;
  const x = (i: number) =>
    weeks.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (weeks.length - 1);
  const y = (pos: number) => PAD + ((pos - 1) / Math.max(maxPos - 1, 1)) * (H - PAD * 2);

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-64 h-16" role="img" aria-label="Istoric poziții">
        <polyline
          points={weeks.map((w, i) => `${x(i)},${y(w.position)}`).join(" ")}
          fill="none"
          stroke="#F5B13D"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {weeks.map((w, i) => (
          <circle key={w.weekStart} cx={x(i)} cy={y(w.position)} r="2.5" fill="#F5B13D">
            <title>{`Săpt. ${w.weekStart}: locul ${w.position} (${formatNumber(w.plays)} difuzări)`}</title>
          </circle>
        ))}
      </svg>
      <div className="text-xs text-zinc-400">
        <div>
          Cea mai bună poziție:{" "}
          <span className="font-mono text-white">
            #{Math.min(...weeks.map((w) => w.position))}
          </span>
        </div>
        <div className="text-zinc-500">ultimele {weeks.length} săptămâni în top</div>
      </div>
    </div>
  );
}

/**
 * Public airplay chart table — used by the portal "Topuri" page and the
 * public /top landing. Rows expand to a 12-week position history
 * (public endpoint, works logged out).
 */
export function ChartTable({
  entries,
  highlightIsrcs,
  highlightLabel = "piesa ta",
  onShare,
}: {
  entries: ChartEntry[];
  highlightIsrcs?: Set<string>;
  highlightLabel?: string;
  onShare?: (entry: ChartEntry) => void;
}) {
  const [expandedIsrc, setExpandedIsrc] = useState<string | null>(null);
  const [history, setHistory] = useState<Record<string, HistoryWeek[] | "loading" | "error">>({});

  async function toggleExpand(isrc: string) {
    if (expandedIsrc === isrc) {
      setExpandedIsrc(null);
      return;
    }
    setExpandedIsrc(isrc);
    if (!history[isrc]) {
      setHistory((h) => ({ ...h, [isrc]: "loading" }));
      try {
        // Public endpoint — plain fetch, no auth needed (works on /top too).
        const res = await fetch(`${API_BASE}/charts/airplay/song/${encodeURIComponent(isrc)}`);
        if (!res.ok) throw new Error();
        const body = (await res.json()) as { weeks: HistoryWeek[] };
        setHistory((h) => ({ ...h, [isrc]: body.weeks }));
      } catch {
        setHistory((h) => ({ ...h, [isrc]: "error" }));
      }
    }
  }

  const colCount = onShare ? 6 : 5;

  return (
    <TableShell>
      <thead className="bg-zinc-950/60">
        <tr>
          <Th className="w-14">#</Th>
          <Th>Piesă</Th>
          <Th align="center" className="w-16">
            Δ
          </Th>
          <Th align="right">Difuzări</Th>
          <Th align="right" className="whitespace-nowrap">
            Stații
          </Th>
          {onShare && <Th align="right" />}
        </tr>
      </thead>
      <tbody>
        {entries.length === 0 ? (
          <tr>
            <td colSpan={colCount} className="px-4 py-12 text-center text-zinc-500 text-sm">
              Topul se calculează — revino puțin mai târziu.
            </td>
          </tr>
        ) : (
          entries.map((e) => {
            const highlighted = highlightIsrcs?.has(e.isrc) ?? false;
            const hist = history[e.isrc];
            return (
              <Fragment key={e.isrc}>
                <tr
                  onClick={() => toggleExpand(e.isrc)}
                  className={cn(
                    "border-t border-zinc-800/60 cursor-pointer transition-colors",
                    highlighted
                      ? "bg-brand-500/[0.07] hover:bg-brand-500/10"
                      : "hover:bg-zinc-800/20",
                  )}
                >
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "font-mono font-bold",
                        e.rank <= 3 ? "text-brand-400 text-lg" : "text-zinc-300",
                      )}
                    >
                      {e.rank}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <ArtworkThumb url={e.artworkUrl} size="md" />
                      <div className="min-w-0">
                        <div className="text-white font-medium flex items-center gap-2">
                          <span className="truncate">{e.songTitle}</span>
                          {highlighted && <Pill tone="brand">{highlightLabel}</Pill>}
                        </div>
                        <div className="text-xs text-zinc-400 truncate">{e.artistName}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <DeltaBadge entry={e} />
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-white">
                    {formatNumber(e.plays)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-zinc-400">
                    {e.stationCount}
                  </td>
                  {onShare && (
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          onShare(e);
                        }}
                        title="Distribuie"
                        className="text-zinc-500 hover:text-brand-400 transition-colors p-1"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          className="w-4 h-4"
                        >
                          <circle cx="18" cy="5" r="3" />
                          <circle cx="6" cy="12" r="3" />
                          <circle cx="18" cy="19" r="3" />
                          <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
                        </svg>
                      </button>
                    </td>
                  )}
                </tr>
                {expandedIsrc === e.isrc && (
                  <tr className="border-t border-zinc-800/40 bg-zinc-950/40">
                    <td colSpan={colCount} className="px-6 py-4">
                      {hist === "loading" || hist === undefined ? (
                        <p className="text-xs text-zinc-500">Se încarcă istoricul…</p>
                      ) : hist === "error" ? (
                        <p className="text-xs text-zinc-500">Istoricul nu e disponibil momentan.</p>
                      ) : (
                        <PositionHistory weeks={hist} />
                      )}
                    </td>
                  </tr>
                )}
              </Fragment>
            );
          })
        )}
      </tbody>
    </TableShell>
  );
}
