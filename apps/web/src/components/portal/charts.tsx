"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";
import { formatNumber, DAY_NAMES_RO_SHORT } from "@/lib/format";

/* Small chart primitives — plain divs/SVG, no chart library. */

// ─── Daily bar series ───────────────────────────────────────────────────

export function BarSeries({
  points,
  height = 120,
  emptyLabel = "Nicio difuzare în perioada asta.",
}: {
  points: Array<{ label: string; value: number }>;
  height?: number;
  emptyLabel?: string;
}) {
  const max = Math.max(...points.map((p) => p.value), 0);
  if (points.length === 0 || max === 0) {
    return <p className="text-sm text-zinc-500 py-6 text-center">{emptyLabel}</p>;
  }

  return (
    <div>
      <div className="flex items-end gap-[2px]" style={{ height }}>
        {points.map((p, i) => (
          <div
            key={i}
            title={`${p.label}: ${formatNumber(p.value)} difuzări`}
            className="flex-1 min-w-[3px] bg-brand-500/70 hover:bg-brand-400 rounded-t transition-colors"
            style={{ height: `${Math.max((p.value / max) * 100, p.value > 0 ? 3 : 0)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] font-mono text-zinc-500">
        <span>{points[0].label}</span>
        {points.length > 2 && <span>{points[Math.floor(points.length / 2)].label}</span>}
        <span>{points[points.length - 1].label}</span>
      </div>
    </div>
  );
}

// ─── Multi-series line chart (label artist comparison) ──────────────────

export const SERIES_COLORS = [
  "#FF4B45", // brand
  "#38BDF8", // sky
  "#34D399", // emerald
  "#FBBF24", // amber
  "#A78BFA", // violet
  "#F472B6", // pink
];

export function MultiLineChart({
  series,
  height = 180,
}: {
  series: Array<{ name: string; points: Array<{ date: string; count: number }> }>;
  height?: number;
}) {
  const gradientId = useId();
  // Union of all dates, sorted — every series is sampled on the same x axis.
  const dates = Array.from(
    new Set(series.flatMap((s) => s.points.map((p) => p.date))),
  ).sort();

  const max = Math.max(
    ...series.flatMap((s) => s.points.map((p) => p.count)),
    0,
  );

  if (dates.length === 0 || max === 0) {
    return (
      <p className="text-sm text-zinc-500 py-6 text-center">
        Nicio difuzare de comparat în perioada asta.
      </p>
    );
  }

  const W = 600;
  const H = 200;
  const PAD = 8;
  const x = (i: number) =>
    dates.length === 1 ? W / 2 : PAD + (i * (W - PAD * 2)) / (dates.length - 1);
  const y = (v: number) => H - PAD - (v / max) * (H - PAD * 2);

  return (
    <div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        style={{ height }}
        role="img"
        aria-label="Comparație difuzări zilnice"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="100%" stopColor="transparent" />
          </linearGradient>
        </defs>
        {/* grid lines */}
        {[0.25, 0.5, 0.75].map((f) => (
          <line
            key={f}
            x1={PAD}
            x2={W - PAD}
            y1={y(max * f)}
            y2={y(max * f)}
            stroke="#27272a"
            strokeWidth="1"
          />
        ))}
        {series.map((s, si) => {
          const byDate = new Map(s.points.map((p) => [p.date, p.count]));
          const pts = dates
            .map((d, i) => `${x(i)},${y(byDate.get(d) ?? 0)}`)
            .join(" ");
          return (
            <g key={s.name}>
              <polyline
                points={pts}
                fill="none"
                stroke={SERIES_COLORS[si % SERIES_COLORS.length]}
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              {dates.map((d, i) => (
                <circle
                  key={d}
                  cx={x(i)}
                  cy={y(byDate.get(d) ?? 0)}
                  r="2.5"
                  fill={SERIES_COLORS[si % SERIES_COLORS.length]}
                >
                  <title>{`${s.name} — ${d}: ${byDate.get(d) ?? 0} difuzări`}</title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="flex justify-between mt-1 text-[10px] font-mono text-zinc-500">
        <span>{dates[0]}</span>
        <span>{dates[dates.length - 1]}</span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
        {series.map((s, si) => (
          <span key={s.name} className="inline-flex items-center gap-1.5 text-xs text-zinc-300">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: SERIES_COLORS[si % SERIES_COLORS.length] }}
            />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── 7×24 heatmap ───────────────────────────────────────────────────────

export function HourlyHeatmap({
  matrix,
  maxValue,
}: {
  matrix: number[][];
  maxValue: number;
}) {
  // API rows: 0=Sunday … 6=Saturday. Display Monday-first.
  const dayOrder = [1, 2, 3, 4, 5, 6, 0];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
        <div className="grid" style={{ gridTemplateColumns: "2.5rem repeat(24, 1fr)" }}>
          <div />
          {Array.from({ length: 24 }).map((_, h) => (
            <div key={h} className="text-center text-[9px] font-mono text-zinc-500 pb-1">
              {h % 3 === 0 ? h : ""}
            </div>
          ))}
          {dayOrder.map((dow) => (
            <DayRow key={dow} dow={dow} row={matrix[dow] ?? []} maxValue={maxValue} />
          ))}
        </div>
        <div className="flex items-center gap-2 mt-3 text-[10px] text-zinc-500">
          <span>puține</span>
          {[0.15, 0.35, 0.6, 0.85, 1].map((o) => (
            <span
              key={o}
              className="w-3.5 h-3.5 rounded-sm"
              style={{ backgroundColor: `rgba(255, 75, 69, ${o * 0.9})` }}
            />
          ))}
          <span>multe difuzări</span>
        </div>
      </div>
    </div>
  );
}

function DayRow({ dow, row, maxValue }: { dow: number; row: number[]; maxValue: number }) {
  return (
    <>
      <div className="text-[10px] font-mono text-zinc-500 pr-2 flex items-center justify-end">
        {DAY_NAMES_RO_SHORT[dow]}
      </div>
      {Array.from({ length: 24 }).map((_, h) => {
        const v = row[h] ?? 0;
        const intensity = maxValue > 0 ? v / maxValue : 0;
        return (
          <div key={h} className="p-px">
            <div
              title={`${DAY_NAMES_RO_SHORT[dow]} ${String(h).padStart(2, "0")}:00 — ${v} difuzări`}
              className={cn("h-4 rounded-[3px]", v === 0 && "bg-zinc-800/60")}
              style={
                v > 0
                  ? { backgroundColor: `rgba(255, 75, 69, ${0.15 + intensity * 0.75})` }
                  : undefined
              }
            />
          </div>
        );
      })}
    </>
  );
}

// ─── Donut / gauge ──────────────────────────────────────────────────────

export function Donut({
  percent,
  label,
  sublabel,
  size = 140,
}: {
  percent: number;
  label?: string;
  sublabel?: string;
  size?: number;
}) {
  const clamped = Math.min(100, Math.max(0, percent));
  const r = 42;
  const c = 2 * Math.PI * r;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" width={size} height={size} className="-rotate-90">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#27272a" strokeWidth="9" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="#FF4B45"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={`${(clamped / 100) * c} ${c}`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-xl font-bold font-mono text-white">
          {label ?? `${clamped.toLocaleString("ro-RO")}%`}
        </span>
        {sublabel && <span className="text-[10px] text-zinc-500 mt-0.5">{sublabel}</span>}
      </div>
    </div>
  );
}

// ─── Playlist overlap (two circles) ─────────────────────────────────────

export function OverlapViz({
  overlapPercent,
  exclusiveToYou,
  sharedCount,
  exclusiveToThem,
  competitorName,
}: {
  overlapPercent: number;
  exclusiveToYou: number;
  sharedCount: number;
  exclusiveToThem: number;
  competitorName: string;
}) {
  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 300 160" className="w-full max-w-[340px]" role="img" aria-label="Suprapunere playlist">
        <circle cx="110" cy="80" r="62" fill="rgba(255,75,69,0.18)" stroke="#FF4B45" strokeWidth="1.5" />
        <circle cx="190" cy="80" r="62" fill="rgba(56,189,248,0.14)" stroke="#38BDF8" strokeWidth="1.5" />
        <text x="80" y="84" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="monospace">
          {formatNumber(exclusiveToYou)}
        </text>
        <text x="150" y="84" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="monospace">
          {formatNumber(sharedCount)}
        </text>
        <text x="220" y="84" textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700" fontFamily="monospace">
          {formatNumber(exclusiveToThem)}
        </text>
        <text x="80" y="160" textAnchor="middle" fill="#a1a1aa" fontSize="10">
          doar la tine
        </text>
        <text x="150" y="18" textAnchor="middle" fill="#a1a1aa" fontSize="10">
          comune
        </text>
        <text x="220" y="160" textAnchor="middle" fill="#a1a1aa" fontSize="10">
          doar la {competitorName.length > 18 ? "competitor" : competitorName}
        </text>
      </svg>
      <div className="mt-2 text-sm text-zinc-300">
        Suprapunere playlist:{" "}
        <span className="font-mono font-bold text-white">
          {overlapPercent.toLocaleString("ro-RO")}%
        </span>
      </div>
    </div>
  );
}

// ─── Horizontal share bar (station breakdown / affinity) ────────────────

export function ShareBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-brand-500" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
