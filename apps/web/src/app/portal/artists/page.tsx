"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, isPremiumError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNumber } from "@/lib/format";
import { ConfirmDialog } from "@/components/confirm-dialog";
import {
  ArtworkThumb,
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Pill,
  Skeleton,
  Toggle,
} from "@/components/portal/ui";
import { PremiumLockCard } from "@/components/portal/premium-gate";

// ─── API shapes ─────────────────────────────────────────────────────────

interface LabelArtist {
  id: number;
  artistName: string;
  artistUserId: number | null;
  pictureUrl: string | null;
  songCount: number;
  totalPlays: number;
  topSong: string | null;
  addedAt: string;
}

interface BrowseArtist {
  deezerId: number;
  name: string;
  pictureUrl: string;
  fanCount: number;
  albumCount: number;
}

interface ArtistSong {
  id: number;
  songTitle: string;
  artistName: string;
  isrc: string;
  isMonitored: boolean;
  totalPlays: number;
  stationCount: number;
  activatedAt: string | null;
}

interface DeezerTrack {
  deezerTrackId: number;
  title: string;
  duration: number;
  isrc: string | null;
  albumTitle: string | null;
  albumCoverUrl: string | null;
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function LabelArtistsPage() {
  const [artists, setArtists] = useState<LabelArtist[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<LabelArtist | null>(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<LabelArtist[]>("/label/artists");
      setArtists(data);
      setSelectedId((prev) => prev ?? data[0]?.id ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut încărca roster-ul");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDelete() {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await apiFetch(`/label/artists/${pendingDelete.id}`, { method: "DELETE" });
      if (selectedId === pendingDelete.id) setSelectedId(null);
      setPendingDelete(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ștergerea a eșuat");
      setPendingDelete(null);
    } finally {
      setDeleting(false);
    }
  }

  const selected = artists.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Artiști"
        description="Roster-ul casei tale de discuri și piesele monitorizate."
        actions={
          <button
            onClick={() => setShowAdd((v) => !v)}
            className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {showAdd ? "Închide" : "+ Adaugă artist"}
          </button>
        }
      />

      {error && (
        <div className="mb-4">
          <ErrorNotice message={error} onRetry={load} />
        </div>
      )}

      {showAdd && (
        <AddArtistPanel
          existingNames={new Set(artists.map((a) => a.artistName.toLowerCase()))}
          onAdded={() => {
            setShowAdd(false);
            load();
          }}
        />
      )}

      {loading ? (
        <Skeleton rows={4} />
      ) : artists.length === 0 && !showAdd ? (
        <EmptyState
          title="Roster-ul e gol"
          message="Adaugă primul artist — îi găsim automat poza și piesele, iar tu alegi ce monitorizăm la radio."
          cta={{ label: "Adaugă un artist", onClick: () => setShowAdd(true) }}
        />
      ) : (
        artists.length > 0 && (
          <>
            {/* Roster cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {artists.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setSelectedId(a.id)}
                  className={cn(
                    "text-left bg-zinc-900 border rounded-xl p-4 transition-colors",
                    selectedId === a.id
                      ? "border-brand-500/50 bg-brand-500/[0.04]"
                      : "border-zinc-800 hover:border-zinc-700",
                  )}
                >
                  <div className="flex items-center gap-3">
                    {a.pictureUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={a.pictureUrl}
                        alt=""
                        loading="lazy"
                        className="w-12 h-12 rounded-full object-cover border border-zinc-800 shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-zinc-800/60 border border-zinc-800 flex items-center justify-center text-zinc-500 text-sm font-bold shrink-0">
                        {a.artistName.slice(0, 2).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="text-white font-semibold truncate">{a.artistName}</div>
                      <div className="text-xs text-zinc-500">
                        {a.songCount} piese · {formatNumber(a.totalPlays)} difuzări
                      </div>
                      {a.topSong && (
                        <div className="text-xs text-zinc-500 truncate">top: {a.topSong}</div>
                      )}
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPendingDelete(a);
                      }}
                      title="Scoate artistul din roster"
                      className="text-zinc-600 hover:text-brand-400 transition-colors p-1 shrink-0"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        className="w-4 h-4"
                      >
                        <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                      </svg>
                    </button>
                  </div>
                </button>
              ))}
            </div>

            {/* Selected artist songs */}
            {selected && <ArtistSongsPanel key={selected.id} artist={selected} onChanged={load} />}
          </>
        )
      )}

      <ConfirmDialog
        open={pendingDelete !== null}
        title="Scoți artistul din roster?"
        message={
          pendingDelete ? (
            <>
              <span className="text-white font-medium">{pendingDelete.artistName}</span> și
              legăturile cu piesele monitorizate vor fi șterse din roster-ul tău.
            </>
          ) : (
            ""
          )
        }
        confirmLabel="Scoate"
        cancelLabel="Renunță"
        danger
        loading={deleting}
        onConfirm={handleDelete}
        onCancel={() => setPendingDelete(null)}
      />
    </div>
  );
}

// ─── Add artist (Deezer search with photos) ─────────────────────────────

function AddArtistPanel({
  existingNames,
  onAdded,
}: {
  existingNames: Set<string>;
  onAdded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<BrowseArtist[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const [premiumLimit, setPremiumLimit] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const data = await apiFetch<BrowseArtist[]>(
          `/label/browse-artists?q=${encodeURIComponent(query.trim())}`,
        );
        setResults(data);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  async function addArtist(name: string) {
    setAdding(name);
    setAddError(null);
    try {
      await apiFetch("/label/artists", {
        method: "POST",
        body: JSON.stringify({ artistName: name }),
      });
      onAdded();
    } catch (err) {
      if (isPremiumError(err)) {
        setPremiumLimit(true);
      } else {
        setAddError(err instanceof Error ? err.message : "Nu am putut adăuga artistul");
      }
    } finally {
      setAdding(null);
    }
  }

  if (premiumLimit) {
    return (
      <div className="mb-6">
        <PremiumLockCard
          title="Ai atins limita planului gratuit"
          message="Planul gratuit permite până la 3 artiști în roster. Fă upgrade ca să monitorizezi oricâți artiști vrei."
        />
      </div>
    );
  }

  return (
    <Card title="Adaugă un artist" className="mb-6">
      {addError && (
        <div className="mb-3">
          <ErrorNotice message={addError} />
        </div>
      )}
      <input
        type="search"
        autoFocus
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Caută artistul după nume…"
        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white placeholder:text-zinc-500 focus:outline-none focus:border-brand-500/60"
      />
      {searching ? (
        <div className="mt-3">
          <Skeleton rows={3} />
        </div>
      ) : results.length > 0 ? (
        <ul className="mt-3 divide-y divide-zinc-800/60 max-h-80 overflow-y-auto">
          {results.map((a) => {
            const already = existingNames.has(a.name.toLowerCase());
            return (
              <li key={a.deezerId} className="py-2 flex items-center gap-3">
                {a.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.pictureUrl}
                    alt=""
                    loading="lazy"
                    className="w-10 h-10 rounded-full object-cover border border-zinc-800 shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-zinc-800/60 border border-zinc-800 shrink-0" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-sm text-white truncate">{a.name}</div>
                  <div className="text-xs text-zinc-500">
                    {formatNumber(a.fanCount)} fani · {a.albumCount} albume
                  </div>
                </div>
                {already ? (
                  <Pill tone="neutral">deja în roster</Pill>
                ) : (
                  <button
                    disabled={adding !== null}
                    onClick={() => addArtist(a.name)}
                    className="px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-40 shrink-0"
                  >
                    {adding === a.name ? "Se adaugă…" : "Adaugă"}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      ) : query.trim().length >= 2 ? (
        <div className="mt-4 text-sm text-zinc-500">
          Nimic găsit.{" "}
          <button
            onClick={() => addArtist(query.trim())}
            className="text-brand-400 hover:underline"
          >
            Adaugă „{query.trim()}” manual
          </button>
        </div>
      ) : null}
    </Card>
  );
}

// ─── Selected artist: songs + monitoring toggles ────────────────────────

function ArtistSongsPanel({
  artist,
  onChanged,
}: {
  artist: LabelArtist;
  onChanged: () => void;
}) {
  const [songs, setSongs] = useState<ArtistSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingIsrc, setTogglingIsrc] = useState<string | null>(null);

  // Deezer track browser
  const [showBrowse, setShowBrowse] = useState(false);
  const [tracks, setTracks] = useState<DeezerTrack[] | null>(null);
  const [tracksLoading, setTracksLoading] = useState(false);
  const [tracksError, setTracksError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch<ArtistSong[]>(`/label/artists/${artist.id}/songs`);
      setSongs(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut încărca piesele");
    } finally {
      setLoading(false);
    }
  }, [artist.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle(song: { songTitle: string; artistName: string; isrc: string }, enabled: boolean) {
    setTogglingIsrc(song.isrc);
    setError(null);
    try {
      await apiFetch(`/label/artists/${artist.id}/songs`, {
        method: "POST",
        body: JSON.stringify({ ...song, enabled }),
      });
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nu am putut schimba monitorizarea");
    } finally {
      setTogglingIsrc(null);
    }
  }

  async function openBrowse() {
    setShowBrowse((v) => !v);
    if (tracks !== null || tracksLoading) return;
    setTracksLoading(true);
    setTracksError(null);
    try {
      // Resolve the artist on Deezer by name, then pull their top tracks (with ISRC).
      const found = await apiFetch<BrowseArtist[]>(
        `/label/browse-artists?q=${encodeURIComponent(artist.artistName)}&limit=5`,
      );
      const match =
        found.find((f) => f.name.toLowerCase() === artist.artistName.toLowerCase()) ?? found[0];
      if (!match) {
        setTracksError("Nu am găsit artistul în catalogul Deezer.");
        return;
      }
      const t = await apiFetch<DeezerTrack[]>(`/label/browse-artists/${match.deezerId}/tracks`);
      setTracks(t.filter((x) => x.isrc !== null));
    } catch (err) {
      setTracksError(err instanceof Error ? err.message : "Nu am putut încărca piesele din catalog");
    } finally {
      setTracksLoading(false);
    }
  }

  const monitoredIsrcs = new Set(songs.filter((s) => s.isMonitored).map((s) => s.isrc));
  const knownIsrcs = new Set(songs.map((s) => s.isrc));

  return (
    <Card
      title={`Piesele lui ${artist.artistName}`}
      action={
        <button
          onClick={openBrowse}
          className="text-xs font-semibold text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg px-2.5 py-1 transition-colors"
        >
          {showBrowse ? "Ascunde catalogul" : "Caută piese în catalog"}
        </button>
      }
    >
      {error && (
        <div className="mb-3">
          <ErrorNotice message={error} />
        </div>
      )}

      {/* Deezer catalog browser */}
      {showBrowse && (
        <div className="mb-4 bg-zinc-950/60 border border-zinc-800/60 rounded-lg p-3">
          <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
            Top piese din catalogul Deezer
          </div>
          {tracksLoading ? (
            <Skeleton rows={3} />
          ) : tracksError ? (
            <p className="text-sm text-zinc-500">{tracksError}</p>
          ) : tracks && tracks.length > 0 ? (
            <ul className="divide-y divide-zinc-800/60 max-h-72 overflow-y-auto">
              {tracks.map((t) => {
                const monitored = t.isrc !== null && monitoredIsrcs.has(t.isrc);
                const known = t.isrc !== null && knownIsrcs.has(t.isrc);
                return (
                  <li key={t.deezerTrackId} className="py-2 flex items-center gap-3">
                    <ArtworkThumb url={t.albumCoverUrl} size="sm" />
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-white truncate">{t.title}</div>
                      <div className="text-xs text-zinc-500 truncate">
                        {t.albumTitle ?? ""} · <span className="font-mono">{t.isrc}</span>
                      </div>
                    </div>
                    {monitored ? (
                      <Pill tone="green">monitorizată</Pill>
                    ) : (
                      <button
                        disabled={togglingIsrc !== null || !t.isrc}
                        onClick={() =>
                          t.isrc &&
                          toggle(
                            {
                              songTitle: t.title,
                              artistName: artist.artistName,
                              isrc: t.isrc,
                            },
                            true,
                          )
                        }
                        className="px-3 py-1.5 text-xs font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors disabled:opacity-40 shrink-0"
                      >
                        {togglingIsrc === t.isrc
                          ? "Se activează…"
                          : known
                            ? "Monitorizează"
                            : "+ Monitorizează"}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-zinc-500">Niciun rezultat cu ISRC utilizabil.</p>
          )}
        </div>
      )}

      {/* Existing monitored songs with toggles */}
      {loading ? (
        <Skeleton rows={3} />
      ) : songs.length === 0 ? (
        <p className="text-sm text-zinc-500 py-3">
          Nicio piesă cunoscută pentru acest artist. Folosește „Caută piese în catalog” ca să
          activezi monitorizarea primelor piese.
        </p>
      ) : (
        <ul className="divide-y divide-zinc-800/60">
          {songs.map((s) => (
            <li key={s.id} className="py-2.5 flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <div className="text-sm text-white truncate">{s.songTitle}</div>
                <div className="text-xs text-zinc-500">
                  <span className="font-mono">{s.isrc}</span>
                  {s.isMonitored &&
                    ` · ${formatNumber(s.totalPlays)} difuzări pe ${s.stationCount} stații`}
                </div>
              </div>
              <span className="text-[10px] uppercase tracking-wider text-zinc-500 hidden sm:inline">
                {s.isMonitored ? "monitorizată" : "oprită"}
              </span>
              <Toggle
                checked={s.isMonitored}
                disabled={togglingIsrc !== null}
                onChange={(v) =>
                  toggle(
                    { songTitle: s.songTitle, artistName: s.artistName, isrc: s.isrc },
                    v,
                  )
                }
                label={`Monitorizare ${s.songTitle}`}
              />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
