"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatNumber, formatDayLabel } from "@/lib/format";
import {
  ArtworkThumb,
  Card,
  ErrorNotice,
  PageHeader,
  PeriodPicker,
  Skeleton,
  Stat,
} from "@/components/portal/ui";
import { BarSeries, MultiLineChart, ShareBar } from "@/components/portal/charts";
import { PremiumGate, useGated } from "@/components/portal/premium-gate";
import { ShareOfAirplaySection } from "@/components/portal/share-of-airplay";

// ─── API shapes ─────────────────────────────────────────────────────────

interface LabelArtist {
  id: number;
  artistName: string;
  pictureUrl: string | null;
  songCount: number;
}

interface ComparisonResponse {
  artists: Array<{
    artistName: string;
    dailyPlays: Array<{ date: string; count: number }>;
  }>;
}

interface AffinityRow {
  stationId: number;
  stationName: string;
  logoUrl: string | null;
  labelPlays: number;
  totalStationPlays: number;
  affinityPercent: number;
}

interface CatalogSong {
  id: number;
  songTitle: string;
  artistName: string;
  isrc: string;
  totalPlays: number;
}

interface ReleaseTracker {
  song: { title: string; artist: string; isrc: string; activatedAt: string };
  dailyPlays: Array<{ date: string; count: number }>;
  totalFirstWeek: number;
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function LabelInsightsPage() {
  return (
    <div className="max-w-6xl">
      <PageHeader
        title="Insights"
        description="Comparații între artiști, afinitatea stațiilor și evoluția lansărilor."
      />

      <div className="space-y-6">
        <ComparisonSection />
        <div className="grid lg:grid-cols-2 gap-6">
          <AffinitySection />
          <ShareOfAirplaySection />
        </div>
        <ReleaseTrackerSection />
      </div>
    </div>
  );
}

// ─── Artist comparison ──────────────────────────────────────────────────

function ComparisonSection() {
  const [artists, setArtists] = useState<LabelArtist[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [period, setPeriod] = useState<"week" | "month">("week");
  const [artistsError, setArtistsError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<LabelArtist[]>("/label/artists")
      .then((data) => {
        setArtists(data);
        setSelected(data.slice(0, 3).map((a) => a.id));
      })
      .catch((err) =>
        setArtistsError(err instanceof Error ? err.message : "Nu am putut încărca artiștii"),
      );
  }, []);

  const comparison = useGated<ComparisonResponse | null>(async () => {
    if (selected.length === 0) return null;
    return apiFetch<ComparisonResponse>(
      `/label/comparison?artistIds=${selected.join(",")}&period=${period}`,
    );
  }, [selected.join(","), period]);

  function toggleArtist(id: number) {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }

  return (
    <Card
      title="Comparație artiști"
      action={
        <PeriodPicker
          value={period}
          onChange={setPeriod}
          options={[
            { value: "week", label: "7 zile" },
            { value: "month", label: "30 zile" },
          ]}
        />
      }
    >
      {artistsError ? (
        <p className="text-sm text-zinc-500">{artistsError}</p>
      ) : artists.length === 0 ? (
        <p className="text-sm text-zinc-500 py-3">
          Adaugă artiști în roster ca să-i poți compara.
        </p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mb-4">
            {artists.map((a) => {
              const active = selected.includes(a.id);
              return (
                <button
                  key={a.id}
                  onClick={() => toggleArtist(a.id)}
                  className={cn(
                    "px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors",
                    active
                      ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                      : "text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500",
                  )}
                >
                  {a.artistName}
                </button>
              );
            })}
          </div>
          {selected.length === 0 ? (
            <p className="text-sm text-zinc-500 py-3">Alege cel puțin un artist.</p>
          ) : comparison.loading ? (
            <Skeleton rows={4} />
          ) : comparison.error ? (
            <ErrorNotice message={comparison.error} onRetry={comparison.reload} />
          ) : comparison.data ? (
            <MultiLineChart
              series={comparison.data.artists.map((a) => ({
                name: a.artistName,
                points: a.dailyPlays.map((d) => ({
                  date: formatDayLabel(d.date),
                  count: d.count,
                })),
              }))}
            />
          ) : null}
        </>
      )}
    </Card>
  );
}

// ─── Station affinity ───────────────────────────────────────────────────

function AffinitySection() {
  const affinity = useGated<AffinityRow[]>(() => apiFetch("/label/station-affinity"), []);

  return (
    <Card title="Afinitatea stațiilor">
      {affinity.loading ? (
        <Skeleton rows={4} />
      ) : affinity.error ? (
        <ErrorNotice message={affinity.error} onRetry={affinity.reload} />
      ) : !affinity.data || affinity.data.length === 0 ? (
        <p className="text-sm text-zinc-500 py-3">
          Fără date încă — apar când piesele monitorizate încep să fie difuzate.
        </p>
      ) : (
        <ul className="space-y-2.5">
          {affinity.data.slice(0, 10).map((row) => (
            <li key={row.stationId} className="flex items-center gap-3 text-sm">
              <ArtworkThumb url={row.logoUrl} size="sm" rounded="rounded-full" />
              <div className="min-w-0 flex-1">
                <div className="text-white truncate">{row.stationName}</div>
                <div className="text-xs text-zinc-500">
                  {formatNumber(row.labelPlays)} difuzări ale catalogului
                </div>
              </div>
              <div className="w-24 hidden sm:block">
                <ShareBar value={row.affinityPercent} max={affinity.data![0].affinityPercent} />
              </div>
              <span className="font-mono text-zinc-300 w-16 text-right">
                {row.affinityPercent.toLocaleString("ro-RO")}%
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

// ─── Release tracker (premium) ──────────────────────────────────────────

function ReleaseTrackerSection() {
  const [songs, setSongs] = useState<CatalogSong[]>([]);
  const [songId, setSongId] = useState<number | null>(null);
  const [songsError, setSongsError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ catalogSongs: CatalogSong[] }>("/label/dashboard")
      .then((d) => {
        setSongs(d.catalogSongs);
        setSongId(d.catalogSongs[0]?.id ?? null);
      })
      .catch((err) =>
        setSongsError(err instanceof Error ? err.message : "Nu am putut încărca catalogul"),
      );
  }, []);

  const tracker = useGated<ReleaseTracker | null>(async () => {
    if (songId === null) return null;
    return apiFetch<ReleaseTracker>(`/label/releases/${songId}/tracker`);
  }, [songId]);

  return (
    <Card
      title="Release tracker — primele 14 zile"
      action={
        songs.length > 0 ? (
          <select
            value={songId ?? ""}
            onChange={(e) => setSongId(Number(e.target.value))}
            className="px-3 py-1.5 bg-zinc-950 border border-zinc-800 rounded-lg text-xs text-white max-w-[240px]"
          >
            {songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.artistName} — {s.songTitle}
              </option>
            ))}
          </select>
        ) : undefined
      }
    >
      {songsError ? (
        <p className="text-sm text-zinc-500">{songsError}</p>
      ) : songs.length === 0 ? (
        <p className="text-sm text-zinc-500 py-3">
          Activează monitorizarea unor piese ca să urmărești lansările.
        </p>
      ) : (
        <PremiumGate
          state={tracker}
          lockTitle="Release tracker-ul e Premium"
          lockMessage="Urmărește difuzările unei lansări zi cu zi în primele 14 zile de la activare."
        >
          {(data) =>
            data === null ? null : (
              <div className="grid md:grid-cols-[220px_1fr] gap-6 items-start">
                <div className="space-y-4">
                  <Stat
                    label="Difuzări în prima săptămână"
                    value={formatNumber(data.totalFirstWeek)}
                    tone="brand"
                  />
                  <div className="text-xs text-zinc-500">
                    {data.song.artist} — „{data.song.title}”, activată pe{" "}
                    {new Date(data.song.activatedAt).toLocaleDateString("ro-RO")}
                  </div>
                </div>
                <BarSeries
                  points={data.dailyPlays.map((d) => ({
                    label: formatDayLabel(d.date),
                    value: d.count,
                  }))}
                  emptyLabel="Nicio difuzare detectată în fereastra de lansare."
                />
              </div>
            )
          }
        </PremiumGate>
      )}
    </Card>
  );
}
