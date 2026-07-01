"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateFull, formatNumber, timeAgo } from "@/lib/format";
import { usePortalRole } from "@/lib/use-portal-role";
import {
  Card,
  EmptyState,
  ErrorNotice,
  PageHeader,
  Pill,
  Skeleton,
} from "@/components/portal/ui";
import { useGated } from "@/components/portal/premium-gate";

// ─── API shapes (see apps/api/src/workers/daily-report.ts) ──────────────

interface DailyReport {
  id: number;
  reportDate: string;
  reportType: "daily" | "weekly" | string;
  content: Record<string, unknown>;
  tips: string[];
  isPremium: boolean;
  sentAt: string;
}

interface ChartAlert {
  id: number;
  songTitle: string;
  artistName: string;
  platform: string;
  country: string;
  chartName: string;
  position: number;
  alertType: string;
  message: string;
  isRead: boolean;
  sentAt: string;
}

// ─── Report content renderer ────────────────────────────────────────────

const STAT_LABELS: Record<string, string> = {
  totalPlays: "Difuzări",
  yesterdayPlays: "Ieri",
  dayBeforePlays: "Alaltăieri",
  prevWeekPlays: "Săpt. trecută",
  weekOverWeekPercent: "Variație %",
  uniqueSongs: "Piese unice",
  discoveryScore: "Scor discovery",
  totalArtists: "Artiști",
  newStationsCount: "Stații noi",
};

function ReportStats({ content }: { content: Record<string, unknown> }) {
  const stats = Object.entries(content).filter(
    (entry): entry is [string, number] => typeof entry[1] === "number",
  );

  const topSong = content.topSong as
    | { title: string; plays: number; station?: string; peakHour?: string }
    | null
    | undefined;
  const topArtist = content.topArtist as
    | { name: string; song?: string; plays: number; station?: string }
    | null
    | undefined;
  const topStation = content.topStation as { name: string; plays: number } | null | undefined;
  const decliningArtist = content.decliningArtist as
    | { name: string; percent: number }
    | null
    | undefined;

  return (
    <div>
      {stats.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-3">
          {stats.map(([key, value]) => (
            <div key={key} className="bg-zinc-950/60 border border-zinc-800/60 rounded-lg p-3">
              <div className="text-[10px] uppercase tracking-wider text-zinc-500 mb-1">
                {STAT_LABELS[key] ?? key}
              </div>
              <div
                className={cn(
                  "text-lg font-bold font-mono",
                  key === "weekOverWeekPercent"
                    ? value > 0
                      ? "text-emerald-400"
                      : value < 0
                        ? "text-brand-400"
                        : "text-white"
                    : "text-white",
                )}
              >
                {key === "weekOverWeekPercent" && value > 0 ? "+" : ""}
                {formatNumber(value)}
                {key === "weekOverWeekPercent" || key === "discoveryScore" ? "%" : ""}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="space-y-1 text-sm text-zinc-300">
        {topSong && (
          <div>
            <span className="text-zinc-500">Piesa de top:</span>{" "}
            <span className="text-white font-medium">{topSong.title}</span> —{" "}
            {formatNumber(topSong.plays)} difuzări
            {topSong.station ? ` (cel mai des pe ${topSong.station})` : ""}
          </div>
        )}
        {topArtist && (
          <div>
            <span className="text-zinc-500">Artistul de top:</span>{" "}
            <span className="text-white font-medium">{topArtist.name}</span>
            {topArtist.song ? ` cu „${topArtist.song}”` : ""} — {formatNumber(topArtist.plays)}{" "}
            difuzări
          </div>
        )}
        {topStation && (
          <div>
            <span className="text-zinc-500">Stația de top:</span>{" "}
            <span className="text-white font-medium">{topStation.name}</span> —{" "}
            {formatNumber(topStation.plays)} difuzări
          </div>
        )}
        {decliningArtist && (
          <div className="text-amber-400">
            În scădere: {decliningArtist.name} ({decliningArtist.percent}%)
          </div>
        )}
      </div>
    </div>
  );
}

function ReportCard({ report, highlight }: { report: DailyReport; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "bg-zinc-900 border rounded-xl p-5",
        highlight ? "border-brand-500/30" : "border-zinc-800",
      )}
    >
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-white">
            {formatDateFull(report.reportDate)}
          </h3>
          <Pill tone={report.reportType === "weekly" ? "brand" : "neutral"}>
            {report.reportType === "weekly" ? "săptămânal" : "zilnic"}
          </Pill>
          {report.isPremium && <Pill tone="green">premium</Pill>}
        </div>
        <span className="text-xs font-mono text-zinc-500">{timeAgo(report.sentAt)}</span>
      </div>
      <ReportStats content={report.content} />
      {report.tips.length > 0 && (
        <div className="mt-3 pt-3 border-t border-zinc-800/60 space-y-1">
          {report.tips.map((tip, i) => (
            <p key={i} className="text-xs text-zinc-400 leading-relaxed">
              <span className="text-brand-400 font-semibold">Tip:</span> {tip}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const { role } = usePortalRole();

  const today = useGated<{ report: DailyReport | null; message: string | null }>(
    () => apiFetch("/reports/today"),
    [],
  );
  const reports = useGated<DailyReport[]>(() => apiFetch("/reports?limit=14"), []);
  const alerts = useGated<ChartAlert[]>(() => apiFetch("/chart-alerts?limit=20"), []);
  const [markingRead, setMarkingRead] = useState(false);

  async function markAllRead() {
    if (!alerts.data) return;
    const unread = alerts.data.filter((a) => !a.isRead).map((a) => a.id);
    if (unread.length === 0) return;
    setMarkingRead(true);
    try {
      await apiFetch("/chart-alerts/mark-read", {
        method: "POST",
        body: JSON.stringify({ alertIds: unread }),
      });
      alerts.reload();
    } catch {
      // non-critical
    } finally {
      setMarkingRead(false);
    }
  }

  const olderReports =
    reports.data?.filter((r) => r.id !== today.data?.report?.id) ?? [];

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Rapoarte"
        description="Rapoartele zilnice și săptămânale generate pentru contul tău."
      />

      {/* Today */}
      <div className="mb-6">
        {today.loading ? (
          <Skeleton rows={3} />
        ) : today.error ? (
          <ErrorNotice message={today.error} onRetry={today.reload} />
        ) : today.data?.report ? (
          <ReportCard report={today.data.report} highlight />
        ) : (
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-400">
            Raportul de azi nu a fost încă generat — apare automat la ora setată în{" "}
            <a href="/portal/settings" className="text-brand-400 hover:underline">
              setări
            </a>
            .
          </div>
        )}
      </div>

      {/* Chart alerts (artist + label) */}
      {role !== "STATION" && (
        <Card
          title="Alerte topuri"
          className="mb-6"
          action={
            alerts.data && alerts.data.some((a) => !a.isRead) ? (
              <button
                onClick={markAllRead}
                disabled={markingRead}
                className="text-xs font-semibold text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg px-2.5 py-1 transition-colors disabled:opacity-50"
              >
                {markingRead ? "Se marchează…" : "Marchează citite"}
              </button>
            ) : undefined
          }
        >
          {alerts.loading ? (
            <Skeleton rows={2} />
          ) : alerts.error ? (
            <p className="text-sm text-zinc-500">{alerts.error}</p>
          ) : !alerts.data || alerts.data.length === 0 ? (
            <p className="text-sm text-zinc-500 py-2">
              Nicio alertă încă — te anunțăm când piesele tale intră în topurile Shazam, Spotify
              sau Apple Music.
            </p>
          ) : (
            <ul className="divide-y divide-zinc-800/60">
              {alerts.data.map((a) => (
                <li key={a.id} className="py-2.5 flex items-start gap-3">
                  {!a.isRead && (
                    <span className="mt-1.5 w-2 h-2 rounded-full bg-brand-500 shrink-0" />
                  )}
                  <div className={cn("min-w-0 flex-1", a.isRead && "pl-5")}>
                    <div className="text-sm text-white">{a.message}</div>
                    <div className="text-xs text-zinc-500 mt-0.5">
                      {a.chartName} ({a.platform}, {a.country}) · locul {a.position} ·{" "}
                      {timeAgo(a.sentAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {/* History */}
      <h2 className="text-sm font-semibold text-white uppercase tracking-wider mb-3">
        Rapoarte anterioare
      </h2>
      {reports.loading ? (
        <Skeleton rows={4} />
      ) : reports.error ? (
        <ErrorNotice message={reports.error} onRetry={reports.reload} />
      ) : olderReports.length === 0 ? (
        <EmptyState
          title="Niciun raport încă"
          message="Rapoartele se generează automat în fiecare zi. Primul apare mâine dimineață — sau activează-le din setări."
          cta={{ label: "Vezi setările", href: "/portal/settings" }}
        />
      ) : (
        <div className="space-y-4">
          {olderReports.map((r) => (
            <ReportCard key={r.id} report={r} />
          ))}
        </div>
      )}
    </div>
  );
}
