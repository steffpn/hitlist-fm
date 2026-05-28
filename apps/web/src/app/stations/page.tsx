"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { cn } from "@/lib/cn";

interface Station {
  id: number;
  name: string;
  streamUrl: string;
  stationType: string;
  acrcloudStreamId: string | null;
  country: string | null;
  status: string;
  lastHeartbeat: string | null;
  restartCount: number;
}

interface AirplayEvent {
  id: number;
  stationId: number;
  startedAt: string;
}

type SortKey = "name" | "status" | "lastHeartbeat";

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [lastPlay, setLastPlay] = useState<Map<number, string>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draftStreamId, setDraftStreamId] = useState("");
  const [saving, setSaving] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [filter, setFilter] = useState("");

  const load = useCallback(async () => {
    const token = getToken();
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [s, e] = await Promise.all([
        apiFetch<Station[]>("/stations", { token }),
        apiFetch<{ data: AirplayEvent[] }>("/airplay-events?limit=100", { token }),
      ]);
      setStations(s);
      const latest = new Map<number, string>();
      for (const ev of e.data) {
        if (!latest.has(ev.stationId)) latest.set(ev.stationId, ev.startedAt);
      }
      setLastPlay(latest);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function saveStreamId(id: number) {
    const token = getToken();
    if (!token) return;
    setSaving(true);
    try {
      await apiFetch(`/stations/${id}`, {
        method: "PATCH",
        token,
        body: JSON.stringify({ acrcloudStreamId: draftStreamId.trim() }),
      });
      setStations((prev) =>
        prev.map((s) => (s.id === id ? { ...s, acrcloudStreamId: draftStreamId.trim() } : s)),
      );
      setEditingId(null);
      setDraftStreamId("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Update failed");
    } finally {
      setSaving(false);
    }
  }

  async function deactivate(id: number) {
    const token = getToken();
    if (!token) return;
    if (!confirm("Deactivate this station?")) return;
    try {
      await apiFetch(`/stations/${id}`, { method: "DELETE", token });
      setStations((prev) => prev.map((s) => (s.id === id ? { ...s, status: "INACTIVE" } : s)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Deactivate failed");
    }
  }

  if (loading) return <div className="text-zinc-500 text-sm">Loading…</div>;
  if (error) return <div className="text-red-400 text-sm">{error}</div>;

  const filtered = stations
    .filter((s) =>
      filter
        ? `${s.name} ${s.acrcloudStreamId ?? ""} ${s.country ?? ""}`
            .toLowerCase()
            .includes(filter.toLowerCase())
        : true,
    )
    .sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "status") return (a.status > b.status ? 1 : -1);
      if (sortKey === "lastHeartbeat") {
        const aH = a.lastHeartbeat ? new Date(a.lastHeartbeat).getTime() : 0;
        const bH = b.lastHeartbeat ? new Date(b.lastHeartbeat).getTime() : 0;
        return bH - aH;
      }
      return 0;
    });

  const active = stations.filter((s) => s.status.toLowerCase() === "active").length;
  const missingId = stations.filter((s) => !s.acrcloudStreamId).length;

  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Stations</h1>
          <p className="text-sm text-zinc-500 mt-1">
            {stations.length} total · {active} active · {missingId} missing ACR stream ID
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="search"
            placeholder="Search name / stream id / country"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600 w-72"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="name">Sort: name</option>
            <option value="status">Sort: status</option>
            <option value="lastHeartbeat">Sort: heartbeat</option>
          </select>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950/60">
              <tr className="text-zinc-400">
                <Th>Station</Th>
                <Th>Type</Th>
                <Th>Country</Th>
                <Th>ACRCloud stream ID</Th>
                <Th>Status</Th>
                <Th>Last heartbeat</Th>
                <Th>Last play</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{s.name}</div>
                    <div className="text-[11px] text-zinc-600 truncate max-w-xs">{s.streamUrl}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 uppercase text-xs">{s.stationType}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{s.country ?? "—"}</td>
                  <td className="px-4 py-3">
                    {editingId === s.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={draftStreamId}
                          onChange={(e) => setDraftStreamId(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") saveStreamId(s.id);
                            if (e.key === "Escape") {
                              setEditingId(null);
                              setDraftStreamId("");
                            }
                          }}
                          className="px-2 py-1 bg-zinc-950 border border-zinc-700 rounded text-xs font-mono text-white w-40"
                        />
                        <button
                          onClick={() => saveStreamId(s.id)}
                          disabled={saving || !draftStreamId.trim()}
                          className="text-xs px-2 py-1 rounded bg-white text-zinc-900 font-medium disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setDraftStreamId("");
                          }}
                          className="text-xs text-zinc-500 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => {
                          setEditingId(s.id);
                          setDraftStreamId(s.acrcloudStreamId ?? "");
                        }}
                        className="text-xs font-mono text-zinc-300 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded px-2 py-1 transition-colors"
                      >
                        {s.acrcloudStreamId || <span className="text-amber-400">unset — set ID</span>}
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {formatHeartbeat(s.lastHeartbeat)}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-500">
                    {lastPlay.has(s.id) ? timeAgo(lastPlay.get(s.id)!) : <span className="text-zinc-700">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {s.status.toLowerCase() === "active" && (
                      <button
                        onClick={() => deactivate(s.id)}
                        className="text-xs text-zinc-500 hover:text-red-400 transition-colors"
                      >
                        Deactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-zinc-600 text-sm">No stations match.</div>
        )}
      </div>
    </div>
  );
}

function Th({ children, align }: { children: React.ReactNode; align?: "right" }) {
  return (
    <th className={cn("text-left px-4 py-3 text-xs font-medium uppercase tracking-wider", align === "right" && "text-right")}>
      {children}
    </th>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = status.toLowerCase();
  const tone =
    s === "active"
      ? "bg-emerald-400/10 text-emerald-400 border-emerald-400/20"
      : s === "inactive"
      ? "bg-zinc-400/10 text-zinc-400 border-zinc-400/20"
      : "bg-amber-400/10 text-amber-400 border-amber-400/20";
  return (
    <span className={cn("inline-block text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider", tone)}>
      {s}
    </span>
  );
}

function formatHeartbeat(iso: string | null): React.ReactNode {
  if (!iso) return <span className="text-zinc-700">never</span>;
  const ageMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ageMs / 60000);
  if (min > 15) return <span className="text-amber-400">{min}m ago</span>;
  return <span>{min < 1 ? "just now" : `${min}m ago`}</span>;
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
