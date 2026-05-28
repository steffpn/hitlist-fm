"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/cn";

interface Station {
  id: number;
  name: string;
  stationType: string;
  acrcloudStreamId: string | null;
  country: string | null;
  status: string;
  lastHeartbeat: string | null;
}

interface AirplayEvent {
  id: number;
  stationId: number;
  startedAt: string;
  songTitle: string;
  artistName: string;
  confidence: number;
  station: { name: string };
}

interface DashboardTotals {
  playCount: number;
  uniqueSongs: number;
  uniqueArtists: number;
}

export default function OverviewPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [recentEvents, setRecentEvents] = useState<AirplayEvent[]>([]);
  const [dayTotals, setDayTotals] = useState<DashboardTotals | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = getToken();
    if (!token) return;

    Promise.all([
      apiFetch<Station[]>("/stations", { token }),
      apiFetch<{ data: AirplayEvent[] }>("/airplay-events?limit=10", { token }),
      apiFetch<{ totals: DashboardTotals }>("/dashboard/summary?period=day", { token }).catch(() => ({ totals: null })),
    ])
      .then(([s, e, d]) => {
        setStations(s);
        setRecentEvents(e.data);
        setDayTotals(d?.totals ?? null);
      })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-zinc-500 text-sm">Loading…</div>;
  }
  if (error) {
    return <div className="text-red-400 text-sm">{error}</div>;
  }

  const active = stations.filter((s) => s.status === "ACTIVE" || s.status === "active").length;
  const inactive = stations.length - active;
  const missingStreamId = stations.filter((s) => !s.acrcloudStreamId).length;
  const stale = stations.filter((s) => isStale(s.lastHeartbeat)).length;

  return (
    <div className="max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-zinc-500 mt-1">Live state of detection pipeline.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <Stat label="Stations active" value={active} sub={`${stations.length} total`} tone="green" />
        <Stat label="Inactive" value={inactive} tone={inactive ? "red" : "neutral"} />
        <Stat label="Missing ACR stream ID" value={missingStreamId} tone={missingStreamId ? "amber" : "neutral"} />
        <Stat label="Stale heartbeat (>15m)" value={stale} tone={stale ? "amber" : "neutral"} />
      </div>

      {dayTotals && (
        <div className="grid grid-cols-3 gap-4 mb-10">
          <Stat label="Plays last 24h" value={dayTotals.playCount.toLocaleString()} tone="neutral" />
          <Stat label="Unique songs" value={dayTotals.uniqueSongs.toLocaleString()} tone="neutral" />
          <Stat label="Unique artists" value={dayTotals.uniqueArtists.toLocaleString()} tone="neutral" />
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Stations" link={{ href: "/stations", label: "Manage →" }}>
          {stations.length === 0 ? (
            <p className="text-sm text-zinc-500">No stations configured.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {stations.slice(0, 8).map((s) => (
                <li key={s.id} className="flex items-center justify-between py-2 text-sm">
                  <Link href={`/stations`} className="text-white hover:text-zinc-300">{s.name}</Link>
                  <span className="flex items-center gap-2">
                    {!s.acrcloudStreamId && <Pill tone="amber">no stream id</Pill>}
                    {isStale(s.lastHeartbeat) && <Pill tone="amber">stale</Pill>}
                    <Pill tone={s.status.toLowerCase() === "active" ? "green" : "red"}>
                      {s.status.toLowerCase()}
                    </Pill>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Latest detections" link={{ href: "/detections", label: "View all →" }}>
          {recentEvents.length === 0 ? (
            <p className="text-sm text-zinc-500">No recent detections.</p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {recentEvents.map((e) => (
                <li key={e.id} className="py-2 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-white truncate">{e.songTitle}</div>
                      <div className="text-zinc-500 text-xs truncate">{e.artistName} · {e.station.name}</div>
                    </div>
                    <div className="text-xs text-zinc-600 shrink-0">{timeAgo(e.startedAt)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: number | string; sub?: string; tone: "green" | "amber" | "red" | "neutral" }) {
  const toneClasses = {
    green: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-red-400",
    neutral: "text-white",
  }[tone];

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">{label}</div>
      <div className={cn("text-3xl font-bold", toneClasses)}>{value}</div>
      {sub && <div className="text-xs text-zinc-600 mt-1">{sub}</div>}
    </div>
  );
}

function Card({ title, link, children }: { title: string; link?: { href: string; label: string }; children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider">{title}</h2>
        {link && (
          <Link href={link.href} className="text-xs text-zinc-400 hover:text-white">
            {link.label}
          </Link>
        )}
      </div>
      {children}
    </div>
  );
}

function Pill({ tone, children }: { tone: "green" | "amber" | "red"; children: React.ReactNode }) {
  const cls = {
    green: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    amber: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    red: "bg-red-400/10 text-red-400 border-red-400/20",
  }[tone];
  return (
    <span className={cn("inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider", cls)}>
      {children}
    </span>
  );
}

function isStale(iso: string | null): boolean {
  if (!iso) return true;
  const ageMs = Date.now() - new Date(iso).getTime();
  return ageMs > 15 * 60 * 1000;
}

function timeAgo(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ageMs / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
