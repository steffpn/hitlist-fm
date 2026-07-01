"use client";

import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Pill,
  Stat,
  StatSkeleton,
  Skeleton,
  TrendBadge,
} from "@/components/portal/ui";
import { useGated } from "@/components/portal/premium-gate";
import { ShareOfAirplaySection } from "@/components/portal/share-of-airplay";
import { RecentDetectionsCard } from "@/components/portal/recent-detections";

interface ArtistDashboard {
  totalPlaysToday: number;
  totalPlaysWeek: number;
  mostPlayedSong: { title: string; artist: string; plays: number } | null;
}

interface DigestSong {
  songTitle: string;
  artistName: string;
  isrc: string;
  playsThisWeek: number;
  playsLastWeek: number;
  percentChange: number;
  direction: "up" | "down" | "flat";
  newStations: string[];
}

interface MonitoredSong {
  id: number;
  status: string;
}

export function ArtistDashboardPage({ displayName }: { displayName: string }) {
  const dashboard = useGated<ArtistDashboard>(() => apiFetch("/artist/dashboard"), []);
  const digest = useGated<{ songs: DigestSong[] }>(() => apiFetch("/artist/weekly-digest"), []);
  const songs = useGated<MonitoredSong[]>(() => apiFetch("/artist/songs"), []);

  const hasSongs = (songs.data?.length ?? 0) > 0;

  return (
    <div className="max-w-6xl">
      <PageHeader
        title={displayName ? `Salut, ${displayName}!` : "Acasă"}
        description="Difuzările pieselor tale la radio, la zi."
      />

      {/* Onboarding empty state — no monitored songs yet */}
      {!songs.loading && !songs.error && !hasSongs ? (
        <EmptyState
          title="Adaugă prima ta piesă"
          message="Nu monitorizezi încă nicio piesă. Caut-o în catalog și începem să numărăm fiecare difuzare la radio."
          cta={{ label: "Adaugă o piesă", href: "/portal/songs" }}
        />
      ) : (
        <>
          {/* Top stats */}
          <div className="mb-6">
            {dashboard.loading ? (
              <StatSkeleton count={3} />
            ) : dashboard.error ? (
              <ErrorNotice message={dashboard.error} onRetry={dashboard.reload} />
            ) : dashboard.data ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Stat
                  label="Difuzări azi"
                  value={formatNumber(dashboard.data.totalPlaysToday)}
                  tone={dashboard.data.totalPlaysToday > 0 ? "brand" : "neutral"}
                />
                <Stat
                  label="Săptămâna asta"
                  value={formatNumber(dashboard.data.totalPlaysWeek)}
                />
                <Stat
                  label="Cea mai difuzată"
                  value={dashboard.data.mostPlayedSong?.title ?? "—"}
                  sub={
                    dashboard.data.mostPlayedSong
                      ? `${formatNumber(dashboard.data.mostPlayedSong.plays)} difuzări săpt. asta`
                      : "nicio difuzare săptămâna asta"
                  }
                />
              </div>
            ) : null}
          </div>

          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* Weekly digest */}
            <Card title="Rezumatul săptămânii">
              {digest.loading ? (
                <Skeleton rows={4} />
              ) : digest.error ? (
                <p className="text-sm text-zinc-500">{digest.error}</p>
              ) : !digest.data || digest.data.songs.length === 0 ? (
                <p className="text-sm text-zinc-500 py-4">
                  Adaugă piese ca să primești rezumatul săptămânal.
                </p>
              ) : (
                <ul className="divide-y divide-zinc-800/60">
                  {digest.data.songs.map((s) => (
                    <li key={s.isrc} className="py-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm text-white truncate">{s.songTitle}</div>
                          <div className="text-xs text-zinc-500">
                            {formatNumber(s.playsThisWeek)} difuzări (săpt. trecută:{" "}
                            {formatNumber(s.playsLastWeek)})
                          </div>
                        </div>
                        <TrendBadge direction={s.direction} percentChange={s.percentChange} />
                      </div>
                      {s.newStations.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                          {s.newStations.map((st) => (
                            <Pill key={st} tone="green" title="Stație nouă săptămâna asta">
                              + {st}
                            </Pill>
                          ))}
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Share of airplay (premium) */}
            <ShareOfAirplaySection />
          </div>

          {/* Latest detections + CSV export */}
          <RecentDetectionsCard />
        </>
      )}
    </div>
  );
}
