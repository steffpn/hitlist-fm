"use client";

import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Stat,
  StatSkeleton,
  Skeleton,
  TableShell,
  Th,
} from "@/components/portal/ui";
import { useGated } from "@/components/portal/premium-gate";
import { ShareOfAirplaySection } from "@/components/portal/share-of-airplay";
import { RecentDetectionsCard } from "@/components/portal/recent-detections";

interface LabelDashboard {
  totalPlays: number;
  artistSummaries: Array<{
    artistName: string;
    pictureUrl: string | null;
    songCount: number;
    totalPlays: number;
    topSong: string | null;
  }>;
  catalogSongs: Array<{
    id: number;
    songTitle: string;
    artistName: string;
    isrc: string;
    totalPlays: number;
    stationCount: number;
    activatedAt: string;
  }>;
}

export function LabelDashboardPage({ displayName }: { displayName: string }) {
  const dashboard = useGated<LabelDashboard>(() => apiFetch("/label/dashboard"), []);

  if (dashboard.loading) {
    return (
      <div className="max-w-6xl">
        <PageHeader title="Acasă" description="Vederea de ansamblu a casei tale de discuri." />
        <StatSkeleton count={3} />
        <div className="mt-6">
          <Skeleton rows={5} />
        </div>
      </div>
    );
  }

  if (dashboard.error) {
    return (
      <div className="max-w-6xl">
        <PageHeader title="Acasă" />
        <ErrorNotice message={dashboard.error} onRetry={dashboard.reload} />
      </div>
    );
  }

  const data = dashboard.data;
  if (!data) return null;

  if (data.artistSummaries.length === 0) {
    return (
      <div className="max-w-6xl">
        <PageHeader
          title={displayName ? `Salut, ${displayName}!` : "Acasă"}
          description="Vederea de ansamblu a casei tale de discuri."
        />
        <EmptyState
          title="Construiește-ți roster-ul"
          message="Adaugă primul artist ca să începem să monitorizăm difuzările întregului catalog."
          cta={{ label: "Adaugă un artist", href: "/portal/artists" }}
        />
      </div>
    );
  }

  const topArtist = [...data.artistSummaries].sort((a, b) => b.totalPlays - a.totalPlays)[0];

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={displayName ? `Salut, ${displayName}!` : "Acasă"}
        description="Vederea de ansamblu a casei tale de discuri."
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Difuzări total catalog" value={formatNumber(data.totalPlays)} tone="brand" />
        <Stat
          label="Artiști în roster"
          value={data.artistSummaries.length}
          sub={`${data.catalogSongs.length} piese monitorizate`}
        />
        <Stat
          label="Artistul de top"
          value={topArtist?.artistName ?? "—"}
          sub={topArtist ? `${formatNumber(topArtist.totalPlays)} difuzări` : undefined}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Roster summary */}
        <Card
          title="Roster"
          action={
            <Link href="/portal/artists" className="text-xs text-brand-400 hover:text-brand-300">
              Gestionează →
            </Link>
          }
        >
          <ul className="divide-y divide-zinc-800/60">
            {data.artistSummaries.map((a) => (
              <li key={a.artistName} className="py-2.5 flex items-center gap-3 text-sm">
                {a.pictureUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.pictureUrl}
                    alt=""
                    loading="lazy"
                    className="w-9 h-9 rounded-full object-cover border border-zinc-800 shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-zinc-800/60 border border-zinc-800 flex items-center justify-center text-zinc-500 text-xs font-bold shrink-0">
                    {a.artistName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-white truncate">{a.artistName}</div>
                  <div className="text-xs text-zinc-500 truncate">
                    {a.songCount} piese{a.topSong ? ` · top: ${a.topSong}` : ""}
                  </div>
                </div>
                <span className="font-mono text-zinc-300 shrink-0">
                  {formatNumber(a.totalPlays)}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Share of airplay (premium; roster-aware server-side) */}
        <ShareOfAirplaySection />
      </div>

      {/* Catalog top songs */}
      <div className="mb-6">
        <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
          Catalogul după difuzări
        </h2>
        <TableShell>
          <thead className="bg-zinc-950/60">
            <tr>
              <Th>Piesă</Th>
              <Th>Artist</Th>
              <Th align="right">Difuzări</Th>
              <Th align="right">Stații</Th>
            </tr>
          </thead>
          <tbody>
            {data.catalogSongs.slice(0, 10).map((s) => (
              <tr key={s.id} className="border-t border-zinc-800/60 hover:bg-zinc-800/20">
                <td className="px-4 py-3 text-white">{s.songTitle}</td>
                <td className="px-4 py-3 text-zinc-400">{s.artistName}</td>
                <td className="px-4 py-3 text-right font-mono text-white">
                  {formatNumber(s.totalPlays)}
                </td>
                <td className="px-4 py-3 text-right font-mono text-zinc-400">{s.stationCount}</td>
              </tr>
            ))}
            {data.catalogSongs.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-zinc-500 text-sm">
                  Activează monitorizarea pieselor din paginile artiștilor.
                </td>
              </tr>
            )}
          </tbody>
        </TableShell>
      </div>

      <RecentDetectionsCard />
    </div>
  );
}
