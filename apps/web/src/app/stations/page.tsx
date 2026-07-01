"use client";

import { useCallback, useEffect, useState, FormEvent } from "react";
import { apiFetch } from "@/lib/api";
import { ConfirmDialog } from "@/components/confirm-dialog";
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
  // Most recent ACRCloud callback (Detection / NoMatchCallback), from the API.
  lastAcrCallbackAt: string | null;
  restartCount: number;
}

type SortKey = "name" | "status" | "lastHeartbeat" | "lastAcrCallbackAt";

const ACR_STALE_MS = 20 * 60 * 1000; // red threshold: no callback in >20 min

export default function StationsPage() {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [filter, setFilter] = useState("");

  const [modal, setModal] = useState<
    | { mode: "create" }
    | { mode: "edit"; station: Station }
    | { mode: "bulk" }
    | null
  >(null);
  const [confirmDeactivate, setConfirmDeactivate] = useState<Station | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await apiFetch<Station[]>("/stations");
      setStations(s);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function deactivate(station: Station) {
    setActionLoading(true);
    try {
      await apiFetch(`/stations/${station.id}`, { method: "DELETE" });
      setStations((prev) =>
        prev.map((s) => (s.id === station.id ? { ...s, status: "INACTIVE" } : s)),
      );
      setConfirmDeactivate(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Deactivate failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function reactivate(station: Station) {
    try {
      await apiFetch(`/stations/${station.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: "ACTIVE" }),
      });
      setStations((prev) =>
        prev.map((s) => (s.id === station.id ? { ...s, status: "ACTIVE" } : s)),
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Reactivate failed");
    }
  }

  if (loading) return <div className="text-zinc-500 text-sm">Loading…</div>;
  if (error) return <div className="text-brand-400 text-sm">{error}</div>;

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
      if (sortKey === "status") return a.status > b.status ? 1 : -1;
      if (sortKey === "lastHeartbeat") {
        return ts(b.lastHeartbeat) - ts(a.lastHeartbeat);
      }
      if (sortKey === "lastAcrCallbackAt") {
        return ts(b.lastAcrCallbackAt) - ts(a.lastAcrCallbackAt);
      }
      return 0;
    });

  const active = stations.filter((s) => s.status.toLowerCase() === "active").length;
  const missingId = stations.filter((s) => !s.acrcloudStreamId).length;
  const silent = stations.filter(
    (s) => s.status.toLowerCase() === "active" && isAcrStale(s.lastAcrCallbackAt),
  ).length;

  return (
    <div>
      <div className="flex items-end justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">Stations</h1>
          <p className="text-sm text-zinc-400 mt-1">
            {stations.length} total · {active} active · {missingId} missing ACR stream ID ·{" "}
            <span className={silent ? "text-brand-400" : ""}>{silent} silent &gt;20m</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <input
            type="search"
            placeholder="Search name / stream id / country"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/60 w-64"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="px-3 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-sm text-white"
          >
            <option value="name">Sort: name</option>
            <option value="status">Sort: status</option>
            <option value="lastHeartbeat">Sort: heartbeat</option>
            <option value="lastAcrCallbackAt">Sort: ACR callback</option>
          </select>
          <button
            onClick={() => setModal({ mode: "bulk" })}
            className="px-3 py-2 text-sm text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors"
          >
            Import CSV
          </button>
          <button
            onClick={() => setModal({ mode: "create" })}
            className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-semibold hover:bg-brand-500 transition-colors"
          >
            + Add station
          </button>
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
                <Th>Last ACR callback</Th>
                <Th align="right">Actions</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id} className="border-t border-zinc-800/60 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-3">
                    <div className="text-white font-medium">{s.name}</div>
                    <div className="text-[11px] text-zinc-500 truncate max-w-xs">{s.streamUrl}</div>
                  </td>
                  <td className="px-4 py-3 text-zinc-400 uppercase text-xs">{s.stationType}</td>
                  <td className="px-4 py-3 text-zinc-400 text-xs">{s.country ?? "—"}</td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-300">
                    {s.acrcloudStreamId || <span className="text-amber-400">unset</span>}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill status={s.status} />
                  </td>
                  <td className="px-4 py-3 text-xs font-mono text-zinc-400">
                    {formatHeartbeat(s.lastHeartbeat)}
                  </td>
                  <td className="px-4 py-3 text-xs font-mono">
                    <AcrCallback iso={s.lastAcrCallbackAt} active={s.status.toLowerCase() === "active"} />
                  </td>
                  <td className="px-4 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setModal({ mode: "edit", station: s })}
                      className="text-xs text-zinc-400 hover:text-white transition-colors mr-3"
                    >
                      Edit
                    </button>
                    {s.status.toLowerCase() === "active" ? (
                      <button
                        onClick={() => setConfirmDeactivate(s)}
                        className="text-xs text-zinc-500 hover:text-brand-400 transition-colors"
                      >
                        Deactivate
                      </button>
                    ) : (
                      <button
                        onClick={() => reactivate(s)}
                        className="text-xs text-emerald-400/80 hover:text-emerald-300 transition-colors"
                      >
                        Reactivate
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="py-16 text-center text-zinc-500 text-sm">No stations match.</div>
        )}
      </div>

      {modal?.mode === "create" && (
        <StationModal
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.mode === "edit" && (
        <StationModal
          station={modal.station}
          onClose={() => setModal(null)}
          onSaved={() => {
            setModal(null);
            load();
          }}
        />
      )}
      {modal?.mode === "bulk" && (
        <BulkImportModal
          onClose={() => setModal(null)}
          onImported={() => {
            setModal(null);
            load();
          }}
        />
      )}

      <ConfirmDialog
        open={confirmDeactivate !== null}
        title="Deactivate station"
        message={
          confirmDeactivate ? (
            <>
              <span className="text-white font-medium">{confirmDeactivate.name}</span> will stop
              being monitored. You can reactivate it later.
            </>
          ) : ""
        }
        confirmLabel="Deactivate"
        danger
        loading={actionLoading}
        onConfirm={() => confirmDeactivate && deactivate(confirmDeactivate)}
        onCancel={() => setConfirmDeactivate(null)}
      />
    </div>
  );
}

// ─── Add / Edit modal ───────────────────────────────────────────────────

function StationModal({
  station,
  onClose,
  onSaved,
}: {
  station?: Station;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!station;
  const [name, setName] = useState(station?.name ?? "");
  const [streamUrl, setStreamUrl] = useState(station?.streamUrl ?? "");
  const [stationType, setStationType] = useState(station?.stationType ?? "radio");
  const [country, setCountry] = useState(station?.country ?? "RO");
  const [acrcloudStreamId, setAcrcloudStreamId] = useState(station?.acrcloudStreamId ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (isEdit) {
        // PATCH /stations/:id — full edit (country is create-only in the API)
        await apiFetch(`/stations/${station.id}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            streamUrl: streamUrl.trim(),
            stationType,
            acrcloudStreamId: acrcloudStreamId.trim(),
          }),
        });
      } else {
        await apiFetch("/stations", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            streamUrl: streamUrl.trim(),
            stationType,
            country: country.trim() || "RO",
            acrcloudStreamId: acrcloudStreamId.trim(),
          }),
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSubmitting(false);
    }
  }

  const valid = name.trim() && streamUrl.trim() && acrcloudStreamId.trim();

  return (
    <Modal title={isEdit ? `Edit ${station.name}` : "Add station"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Name">
          <input
            type="text"
            required
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputCls}
            placeholder="Kiss FM Bucharest"
          />
        </Field>
        <Field label="Stream URL">
          <input
            type="url"
            required
            value={streamUrl}
            onChange={(e) => setStreamUrl(e.target.value)}
            className={cn(inputCls, "font-mono text-xs")}
            placeholder="https://live.kissfm.ro/kissfm.aac"
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <select
              value={stationType}
              onChange={(e) => setStationType(e.target.value)}
              className={inputCls}
            >
              <option value="radio">radio</option>
              <option value="tv">tv</option>
            </select>
          </Field>
          <Field label="Country" hint={isEdit ? "Set at creation — not editable." : undefined}>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value.toUpperCase())}
              maxLength={2}
              disabled={isEdit}
              className={cn(inputCls, "uppercase", isEdit && "opacity-50 cursor-not-allowed")}
              placeholder="RO"
            />
          </Field>
        </div>
        <Field label="ACRCloud stream ID">
          <input
            type="text"
            required
            value={acrcloudStreamId}
            onChange={(e) => setAcrcloudStreamId(e.target.value)}
            className={cn(inputCls, "font-mono")}
            placeholder="s-XXXXXXX"
          />
        </Field>

        {error && (
          <div className="text-sm text-brand-400 bg-brand-400/10 border border-brand-400/20 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <div className="flex gap-2 mt-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting || !valid}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
              submitting || !valid
                ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                : "bg-brand-600 text-white hover:bg-brand-500",
            )}
          >
            {submitting ? "Saving…" : isEdit ? "Save changes" : "Create station"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

// ─── Bulk import modal ──────────────────────────────────────────────────

interface BulkRow {
  name: string;
  streamUrl: string;
  stationType: "radio" | "tv";
  country: string;
  acrcloudStreamId: string;
}

function parseBulkCsv(text: string): { rows: BulkRow[]; errors: string[] } {
  const rows: BulkRow[] = [];
  const errors: string[] = [];
  const lines = text.split(/\r?\n/);

  lines.forEach((rawLine, idx) => {
    const line = rawLine.trim();
    if (!line) return;
    // Skip a pasted header row.
    if (idx === 0 && /^name\s*,/i.test(line)) return;

    const parts = line.split(",").map((p) => p.trim());
    if (parts.length < 5) {
      errors.push(`Line ${idx + 1}: expected 5 columns (name,streamUrl,type,country,acrStreamId)`);
      return;
    }
    const [name, streamUrl, type, country, acrStreamId] = parts;
    if (!name || !streamUrl || !acrStreamId) {
      errors.push(`Line ${idx + 1}: name, streamUrl and acrStreamId are required`);
      return;
    }
    const stationType = type.toLowerCase();
    if (stationType !== "radio" && stationType !== "tv") {
      errors.push(`Line ${idx + 1}: type must be "radio" or "tv" (got "${type}")`);
      return;
    }
    rows.push({
      name,
      streamUrl,
      stationType,
      country: country ? country.toUpperCase() : "RO",
      acrcloudStreamId: acrStreamId,
    });
  });

  return { rows, errors };
}

function BulkImportModal({
  onClose,
  onImported,
}: {
  onClose: () => void;
  onImported: () => void;
}) {
  const [text, setText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const { rows, errors } = parseBulkCsv(text);

  async function handleImport() {
    setApiError(null);
    setSubmitting(true);
    try {
      await apiFetch("/stations/bulk", {
        method: "POST",
        body: JSON.stringify(rows),
      });
      onImported();
    } catch (err) {
      setApiError(err instanceof Error ? err.message : "Import failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Bulk import stations" onClose={onClose} wide>
      <p className="text-xs text-zinc-500 mb-3">
        Paste CSV — one station per line:{" "}
        <code className="font-mono text-zinc-400">name,streamUrl,type,country,acrStreamId</code>{" "}
        (type = radio | tv, country empty → RO).
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={10}
        autoFocus
        spellCheck={false}
        placeholder={`Kiss FM Bucharest,https://live.kissfm.ro/kissfm.aac,radio,RO,s-1234\nVirgin Radio,https://astreaming.virginradio.ro/virgin.aac,radio,RO,s-5678`}
        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-xs font-mono text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/60 resize-y"
      />

      {errors.length > 0 && (
        <div className="mt-3 text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded-lg px-3 py-2 max-h-28 overflow-y-auto">
          {errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      )}
      {apiError && (
        <div className="mt-3 text-sm text-brand-400 bg-brand-400/10 border border-brand-400/20 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}

      <div className="flex items-center justify-between mt-4">
        <span className="text-xs text-zinc-500">
          {rows.length} valid station{rows.length === 1 ? "" : "s"}
          {errors.length > 0 && ` · ${errors.length} error${errors.length === 1 ? "" : "s"}`}
        </span>
        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={submitting || rows.length === 0 || errors.length > 0}
            className={cn(
              "px-4 py-2 text-sm font-semibold rounded-lg transition-colors",
              submitting || rows.length === 0 || errors.length > 0
                ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                : "bg-brand-600 text-white hover:bg-brand-500",
            )}
          >
            {submitting ? "Importing…" : `Import ${rows.length || ""}`}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Shared bits ────────────────────────────────────────────────────────

const inputCls =
  "w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-brand-500/60";

function Modal({
  title,
  wide,
  onClose,
  children,
}: {
  title: string;
  wide?: boolean;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          "bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full shadow-2xl",
          wide ? "max-w-2xl" : "max-w-md",
        )}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">{title}</h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white text-xl leading-none">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium uppercase tracking-wider text-zinc-500 mb-1.5">{label}</span>
      {children}
      {hint && <span className="block text-[11px] text-zinc-500 mt-1">{hint}</span>}
    </label>
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

function AcrCallback({ iso, active }: { iso: string | null; active: boolean }) {
  if (!iso) {
    return <span className={active ? "text-brand-400" : "text-zinc-700"}>never</span>;
  }
  const stale = isAcrStale(iso);
  return (
    <span className={stale ? "text-brand-400 font-semibold" : "text-zinc-400"}>
      {timeAgo(iso)}
    </span>
  );
}

function ts(iso: string | null): number {
  return iso ? new Date(iso).getTime() : 0;
}

function isAcrStale(iso: string | null): boolean {
  if (!iso) return true;
  return Date.now() - new Date(iso).getTime() > ACR_STALE_MS;
}

function formatHeartbeat(iso: string | null): React.ReactNode {
  if (!iso) return <span className="text-zinc-700">never</span>;
  const ageMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(ageMs / 60000);
  if (min > 15) return <span className="text-amber-400">{timeAgo(iso)}</span>;
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
