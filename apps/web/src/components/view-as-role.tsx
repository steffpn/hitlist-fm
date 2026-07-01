"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import {
  clearImpersonation,
  setImpersonation,
  type ImpersonationState,
} from "@/lib/impersonation";
import { cn } from "@/lib/cn";

// GET /admin/impersonation/options
interface ImpersonationOptions {
  artists: Array<{ name: string; plays: number }>;
  stations: Array<{ id: number; name: string }>;
}

// POST /admin/impersonation/configure
interface ConfigureResult {
  userId: number;
  role: "ARTIST" | "LABEL" | "STATION";
  displayName: string;
}

const ROLE_META: Record<
  "ARTIST" | "STATION" | "LABEL",
  { title: string; subtitle: string }
> = {
  ARTIST: { title: "Artist", subtitle: "See a specific artist's airplay" },
  STATION: { title: "Station", subtitle: "Simulate one of the stations" },
  LABEL: { title: "Label", subtitle: "Pick a roster of artists" },
};

const ROLE_LABELS_RO: Record<string, string> = {
  ARTIST: "artist",
  LABEL: "label",
  STATION: "stație",
};

/**
 * Admin header dropdown: pick a role + entity, the API provisions a hidden
 * persona (POST /admin/impersonation/configure) and the client impersonates
 * it via X-Impersonate-User-Id on every request.
 */
export function ViewAsRoleMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ImpersonationOptions | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [role, setRole] = useState<"ARTIST" | "STATION" | "LABEL" | null>(null);
  const [labelArtists, setLabelArtists] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [configuring, setConfiguring] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function onClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  async function toggleOpen() {
    const next = !open;
    setOpen(next);
    if (next && !options) {
      setLoading(true);
      setError(null);
      try {
        const data = await apiFetch<ImpersonationOptions>(
          "/admin/impersonation/options",
        );
        setOptions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load options");
      } finally {
        setLoading(false);
      }
    }
    if (!next) {
      setRole(null);
      setLabelArtists(new Set());
      setSearch("");
    }
  }

  async function configure(body: {
    role: "ARTIST" | "STATION" | "LABEL";
    artistName?: string;
    stationId?: number;
    artistNames?: string[];
  }) {
    setConfiguring(true);
    setError(null);
    try {
      const res = await apiFetch<ConfigureResult>(
        "/admin/impersonation/configure",
        { method: "POST", body: JSON.stringify(body) },
      );
      setImpersonation({
        userId: res.userId,
        role: res.role,
        displayName: res.displayName,
      });
      setOpen(false);
      setRole(null);
      setLabelArtists(new Set());
      setSearch("");
      router.push("/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to configure");
    } finally {
      setConfiguring(false);
    }
  }

  const filteredArtists = (options?.artists ?? []).filter((a) =>
    search ? a.name.toLowerCase().includes(search.toLowerCase()) : true,
  );

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={toggleOpen}
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors",
          open
            ? "bg-brand-500/10 text-brand-400 border-brand-500/30"
            : "text-zinc-300 border-zinc-800 hover:border-zinc-600 hover:text-white",
        )}
      >
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
          <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        View as role
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl shadow-black/50 z-[60] overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {role === null
                ? "Choose a role — full access"
                : `View as ${ROLE_META[role].title.toLowerCase()}`}
            </span>
            {role !== null && (
              <button
                onClick={() => {
                  setRole(null);
                  setLabelArtists(new Set());
                  setSearch("");
                }}
                className="text-[11px] text-brand-400 hover:text-brand-300"
              >
                ← Change role
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="px-4 py-8 text-center text-sm text-zinc-500">Loading options…</div>
            ) : error ? (
              <div className="px-4 py-4 text-sm text-brand-400">{error}</div>
            ) : role === null ? (
              <div className="p-2">
                {(["ARTIST", "STATION", "LABEL"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setRole(r)}
                    className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-zinc-800/60 text-left transition-colors"
                  >
                    <span>
                      <span className="block text-sm font-semibold text-white">
                        {ROLE_META[r].title}
                      </span>
                      <span className="block text-[11px] text-zinc-500">
                        {ROLE_META[r].subtitle}
                      </span>
                    </span>
                    <span className="text-zinc-600">→</span>
                  </button>
                ))}
              </div>
            ) : role === "STATION" ? (
              <div className="p-2">
                {(options?.stations ?? []).map((s) => (
                  <button
                    key={s.id}
                    disabled={configuring}
                    onClick={() => configure({ role: "STATION", stationId: s.id })}
                    className="w-full px-3 py-2 rounded-lg hover:bg-zinc-800/60 text-left text-sm text-zinc-200 transition-colors disabled:opacity-50"
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            ) : (
              <div>
                <div className="p-2 pb-0">
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search artists"
                    className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/60"
                  />
                </div>
                {role === "LABEL" && labelArtists.size > 0 && (
                  <div className="p-2 pb-0">
                    <button
                      disabled={configuring}
                      onClick={() =>
                        configure({ role: "LABEL", artistNames: Array.from(labelArtists) })
                      }
                      className="w-full px-3 py-2 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold transition-colors disabled:opacity-50"
                    >
                      {configuring
                        ? "Setting up…"
                        : `View as label · ${labelArtists.size} artist${labelArtists.size === 1 ? "" : "s"}`}
                    </button>
                  </div>
                )}
                <div className="p-2">
                  {filteredArtists.map((a) => {
                    const selected = labelArtists.has(a.name);
                    return (
                      <button
                        key={a.name}
                        disabled={configuring}
                        onClick={() => {
                          if (role === "ARTIST") {
                            configure({ role: "ARTIST", artistName: a.name });
                          } else {
                            setLabelArtists((prev) => {
                              const next = new Set(prev);
                              if (next.has(a.name)) next.delete(a.name);
                              else next.add(a.name);
                              return next;
                            });
                          }
                        }}
                        className={cn(
                          "w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-colors disabled:opacity-50",
                          selected ? "bg-brand-500/10" : "hover:bg-zinc-800/60",
                        )}
                      >
                        <span>
                          <span className="block text-sm text-zinc-200">{a.name}</span>
                          <span className="block text-[11px] font-mono text-zinc-500">
                            {a.plays.toLocaleString()} plays
                          </span>
                        </span>
                        {role === "LABEL" && (
                          <span
                            className={cn(
                              "w-4 h-4 rounded-full border flex items-center justify-center text-[9px]",
                              selected
                                ? "bg-brand-500 border-brand-500 text-white"
                                : "border-zinc-700",
                            )}
                          >
                            {selected ? "✓" : ""}
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {filteredArtists.length === 0 && (
                    <div className="px-3 py-6 text-center text-sm text-zinc-500">
                      No artists match.
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          {configuring && role !== "LABEL" && (
            <div className="px-4 py-2 border-t border-zinc-800 text-[11px] text-zinc-500">
              Setting up persona…
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Persistent banner shown while an impersonation is active.
 * "Vezi ca {rol}: {nume} — Oprește"
 */
export function ImpersonationBanner({
  impersonation,
}: {
  impersonation: ImpersonationState;
}) {
  const router = useRouter();

  return (
    <div className="sticky top-0 z-50 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-4 py-2 flex items-center justify-center gap-3 text-sm">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-white opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-white" />
      </span>
      <span>
        Vezi ca <strong className="font-semibold">{ROLE_LABELS_RO[impersonation.role] ?? impersonation.role}</strong>
        {": "}
        <strong className="font-semibold">{impersonation.displayName}</strong>
      </span>
      <button
        onClick={() => {
          clearImpersonation();
          router.push("/");
        }}
        className="ml-2 px-3 py-0.5 rounded-full bg-white/15 hover:bg-white/25 border border-white/30 text-xs font-semibold transition-colors"
      >
        Oprește
      </button>
    </div>
  );
}
