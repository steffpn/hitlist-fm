/**
 * Daily & Weekly Stats Report worker — the single consolidated report system.
 *
 * Generates role-aware reports (ARTIST / LABEL / STATION) computed on the
 * user's own data (monitored ISRCs, roster ISRCs, or scoped stations).
 * Premium users get detailed, data-backed insights; free users get generic hints.
 *
 * Schedules (per-user, via UserSettings):
 * - Daily report: every day at the user's configured hour
 *   (UserSettings.dailyReportTime + dailyReportTimezone), gated on
 *   UserSettings.dailyReportEnabled.
 * - Weekly report: Mondays at the same configured hour, aggregated over the
 *   last 7 days vs the previous 7 days, gated on UserSettings.weeklyReportEnabled.
 *
 * Reports are persisted in DailyReport (reportType: "daily" | "weekly") and
 * delivered via the unified push lib (APNs + FCM). Push data.type uses
 * "daily_digest" / "weekly_digest" — the values the iOS app deep-links on
 * (opens DigestDetailView -> GET /notifications/digest/:date).
 *
 * The worker runs hourly and checks which users are due.
 */

import { Worker, Queue } from "bullmq";
import { createRedisConnection } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { sendPush } from "../lib/push.js";
import { validSubscriptionWhere } from "../lib/entitlements.js";
import pino from "pino";
import { startOfDay } from "../lib/period.js";

const logger = pino({ name: "daily-report-worker" });
const QUEUE_NAME = "daily-report";

// ─── Tip Templates ─────────────────────────────────────────────────

const ARTIST_FREE_TIPS = [
  "Keep pushing! Consistency is key for radio play.",
  "Your music is out there — stay active on socials to keep the momentum.",
  "Consider reaching out to playlist curators to boost visibility.",
  "Engage your fans — they're your best promo team.",
  "Good things take time. Keep releasing and stay patient.",
  "Radio loves consistency — think about your next single already.",
];

const ARTIST_PREMIUM_TIPS = {
  rising: [
    "Your song {song} gained {delta} plays on {station} — it's picking up. Push promo on this station's social handles.",
    "Peak hour for {song} was {peakHour} — consider scheduling your social posts around that time.",
    "{song} is up {percent}% vs the previous day. This is the moment to pitch it to more stations.",
    "Your airplay on {station} spiked — reach out to their music director and thank them. Relationships matter.",
  ],
  steady: [
    "{song} is holding steady at {plays} plays/day on {station}. Solid rotation — keep the promo going.",
    "Your plays are consistent. Consider a remix or acoustic version to re-ignite interest.",
    "{station} plays your music mostly at {peakHour}. Their audience is listening — make sure your socials are active at that time.",
  ],
  declining: [
    "{song} dropped {delta} plays on {station}. Time to refresh your promo strategy.",
    "Plays are cooling off. Consider a new single to bring attention back to your catalog.",
    "Your rotation on {station} is slowing. A feature or collab could give it a second wind.",
  ],
  celebration: [
    "{song} reached {plays} plays yesterday — its best day yet. Keep the promo momentum going.",
    "{plays} plays yesterday across all stations — a new daily high for your catalog.",
  ],
};

const LABEL_FREE_TIPS = [
  "Check in on your artists' social media presence — it drives radio play.",
  "Keep monitoring which stations are most receptive to your catalog.",
  "A strong release schedule keeps your label top-of-mind for radio programmers.",
];

const LABEL_PREMIUM_TIPS = {
  rising: [
    "{artist}'s {song} gained {delta} plays vs the previous day — consider increasing their promo budget.",
    "{artist} is getting traction on {station}. Time to push more singles from this artist.",
  ],
  steady: [
    "{artist}'s {song} is holding steady at {plays} plays/day. Keep the current rotation strategy going.",
  ],
  declining: [
    "{artist}'s airplay dropped {percent}%. Schedule a check-in about their promo strategy.",
    "Consider refreshing {artist}'s pitch to stations — the current single may need a boost.",
  ],
};

const STATION_FREE_TIPS = [
  "Keep your playlist fresh — listeners notice when you rotate new music.",
  "Check what your competitors are playing that you're not.",
  "Your listeners' attention span is gold — curate wisely.",
];

// Only templates whose placeholders are backed by real computed data.
const STATION_PREMIUM_TIPS = {
  insight: [
    "You played {uniqueSongs} unique songs yesterday.",
    "Your discovery score is {discoveryScore}% (unique songs relative to total plays).",
  ],
};

// ─── Report Generation ─────────────────────────────────────────────

interface ArtistReportData {
  totalPlays: number;
  yesterdayPlays: number;
  dayBeforePlays: number;
  topSong: { title: string; plays: number; station: string; peakHour: string; delta: number } | null;
  // Day-over-day change (yesterday vs the day before).
  // JSON key kept as-is for client compatibility (iOS decodes weekOverWeekPercent).
  weekOverWeekPercent: number;
}

interface LabelReportData {
  totalArtists: number;
  totalPlays: number;
  topArtist: { name: string; song: string; plays: number; delta: number; station: string } | null;
  decliningArtist: { name: string; percent: number } | null;
}

interface StationReportData {
  totalPlays: number;
  uniqueSongs: number;
  discoveryScore: number;
}

interface ArtistWeeklyReportData {
  totalPlays: number;
  prevWeekPlays: number;
  weekOverWeekPercent: number;
  topSong: { title: string; plays: number; station: string } | null;
  topStation: { name: string; plays: number } | null;
  newStationsCount: number;
}

interface LabelWeeklyReportData {
  totalArtists: number;
  totalPlays: number;
  prevWeekPlays: number;
  weekOverWeekPercent: number;
  topArtist: { name: string; song: string; plays: number } | null;
  topStation: { name: string; plays: number } | null;
}

interface StationWeeklyReportData {
  totalPlays: number;
  prevWeekPlays: number;
  weekOverWeekPercent: number;
  uniqueSongs: number;
  discoveryScore: number;
}

interface GeneratedReport {
  content: unknown;
  tips: string[];
  title: string;
  body: string;
}

async function generateArtistReport(userId: number, isPremium: boolean): Promise<GeneratedReport> {
  // Get user's monitored songs (via ISRCs)
  const monitoredSongs = await prisma.monitoredSong.findMany({
    where: { userId, status: "active" },
  });
  const isrcs = monitoredSongs.map((s) => s.isrc);

  if (isrcs.length === 0) {
    return {
      content: { totalPlays: 0, yesterdayPlays: 0, dayBeforePlays: 0, topSong: null, weekOverWeekPercent: 0 },
      tips: [pickRandom(ARTIST_FREE_TIPS)],
      title: "Daily Report",
      body: "Add songs to monitor and we'll start tracking your airplay.",
    };
  }

  const [yesterdayRows, dayBeforeRows, topSongRows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '1 day'
        AND started_at < CURRENT_DATE
        AND isrc = ANY(${isrcs}::text[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '2 days'
        AND started_at < CURRENT_DATE - INTERVAL '1 day'
        AND isrc = ANY(${isrcs}::text[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ song_title: string; count: number; station_name: string; peak_hour: string }>>`
      SELECT ae.song_title, COUNT(*)::int AS count,
        (SELECT s.name FROM stations s
         JOIN airplay_events ae2 ON ae2.station_id = s.id
         WHERE ae2.isrc = ae.isrc
           AND ae2.started_at >= CURRENT_DATE - INTERVAL '1 day'
           AND ae2.started_at < CURRENT_DATE
           AND ae2.partial_play = false
         GROUP BY s.name ORDER BY COUNT(*) DESC LIMIT 1) AS station_name,
        EXTRACT(HOUR FROM ae.started_at)::text || ':00' AS peak_hour
      FROM airplay_events ae
      WHERE ae.started_at >= CURRENT_DATE - INTERVAL '1 day'
        AND ae.started_at < CURRENT_DATE
        AND ae.isrc = ANY(${isrcs}::text[])
        AND ae.partial_play = false
      GROUP BY ae.song_title, ae.isrc, peak_hour
      ORDER BY count DESC
      LIMIT 1
    `,
  ]);

  const yesterdayPlays = Number(yesterdayRows[0]?.count ?? 0);
  const dayBeforePlays = Number(dayBeforeRows[0]?.count ?? 0);
  const delta = yesterdayPlays - dayBeforePlays;
  const dayOverDayPercent = percentChange(yesterdayPlays, dayBeforePlays);

  const topSong = topSongRows.length > 0
    ? {
        title: topSongRows[0].song_title,
        plays: Number(topSongRows[0].count),
        station: topSongRows[0].station_name || "multiple stations",
        peakHour: topSongRows[0].peak_hour || "various",
        delta,
      }
    : null;

  const content: ArtistReportData = {
    totalPlays: yesterdayPlays,
    yesterdayPlays,
    dayBeforePlays,
    topSong,
    weekOverWeekPercent: dayOverDayPercent,
  };

  // Generate tips
  const tips: string[] = [];
  if (isPremium && topSong) {
    const trend = delta > 0 ? "rising" : delta < 0 ? "declining" : "steady";
    const templates = trend === "rising" && yesterdayPlays > dayBeforePlays * 1.5
      ? ARTIST_PREMIUM_TIPS.celebration
      : ARTIST_PREMIUM_TIPS[trend];
    const tip = pickRandom(templates)
      .replace(/\{song\}/g, topSong.title)
      .replace(/\{station\}/g, topSong.station)
      .replace(/\{delta\}/g, String(Math.abs(delta)))
      .replace(/\{plays\}/g, String(topSong.plays))
      .replace(/\{peakHour\}/g, topSong.peakHour)
      .replace(/\{percent\}/g, String(Math.abs(dayOverDayPercent)));
    tips.push(tip);
  } else {
    tips.push(pickRandom(ARTIST_FREE_TIPS));
  }

  // Build notification text
  let body: string;
  if (yesterdayPlays === 0) {
    body = "No plays detected yesterday.";
  } else if (delta > 0) {
    body = `${yesterdayPlays} plays yesterday (+${delta} vs the previous day).${topSong ? ` '${topSong.title}' led with ${topSong.plays} plays.` : ""}`;
  } else if (delta < 0) {
    body = `${yesterdayPlays} plays yesterday (${delta} vs the previous day). ${tips[0]}`;
  } else {
    body = `${yesterdayPlays} plays yesterday, unchanged from the previous day.${topSong ? ` '${topSong.title}' was your top track.` : ""}`;
  }

  return { content, tips, title: "Your Daily Airplay Report", body };
}

async function generateLabelReport(userId: number, isPremium: boolean): Promise<GeneratedReport> {
  const artists = await prisma.labelArtist.findMany({
    where: { labelUserId: userId },
    include: {
      monitoredSongs: { include: { monitoredSong: true } },
    },
  });

  if (artists.length === 0) {
    return {
      content: { totalArtists: 0, totalPlays: 0, topArtist: null, decliningArtist: null },
      tips: [pickRandom(LABEL_FREE_TIPS)],
      title: "Label Daily Report",
      body: "Add artists to your roster to start tracking their performance.",
    };
  }

  const allIsrcs = artists.flatMap((a) =>
    a.monitoredSongs.map((ms) => ms.monitoredSong.isrc),
  );

  const [totalRows, topArtistRows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '1 day'
        AND started_at < CURRENT_DATE
        AND isrc = ANY(${allIsrcs}::text[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ artist_name: string; song_title: string; count: number; station_name: string }>>`
      SELECT ae.artist_name, ae.song_title, COUNT(*)::int AS count,
        (SELECT s.name FROM stations s WHERE s.id = (
          SELECT ae2.station_id FROM airplay_events ae2
          WHERE ae2.artist_name = ae.artist_name
            AND ae2.started_at >= CURRENT_DATE - INTERVAL '1 day'
            AND ae2.started_at < CURRENT_DATE
            AND ae2.partial_play = false
          GROUP BY ae2.station_id ORDER BY COUNT(*) DESC LIMIT 1
        )) AS station_name
      FROM airplay_events ae
      WHERE ae.started_at >= CURRENT_DATE - INTERVAL '1 day'
        AND ae.started_at < CURRENT_DATE
        AND ae.isrc = ANY(${allIsrcs}::text[])
        AND ae.partial_play = false
      GROUP BY ae.artist_name, ae.song_title
      ORDER BY count DESC
      LIMIT 1
    `,
  ]);

  const totalPlays = Number(totalRows[0]?.count ?? 0);

  // Real day-over-day delta for the top artist's top song (yesterday vs the day before).
  let topArtistDayBefore = 0;
  if (topArtistRows.length > 0) {
    const dayBeforeRows = await prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '2 days'
        AND started_at < CURRENT_DATE - INTERVAL '1 day'
        AND isrc = ANY(${allIsrcs}::text[])
        AND artist_name = ${topArtistRows[0].artist_name}
        AND song_title = ${topArtistRows[0].song_title}
        AND partial_play = false
    `;
    topArtistDayBefore = Number(dayBeforeRows[0]?.count ?? 0);
  }

  const topArtist = topArtistRows.length > 0
    ? {
        name: topArtistRows[0].artist_name,
        song: topArtistRows[0].song_title,
        plays: Number(topArtistRows[0].count),
        delta: Number(topArtistRows[0].count) - topArtistDayBefore,
        station: topArtistRows[0].station_name || "multiple stations",
      }
    : null;

  const tips: string[] = [];
  if (isPremium && topArtist) {
    const declinePercent = Math.abs(percentChange(topArtist.plays, topArtistDayBefore));
    const templates = topArtist.delta > 0
      ? LABEL_PREMIUM_TIPS.rising
      : topArtist.delta < 0
        ? LABEL_PREMIUM_TIPS.declining
        : LABEL_PREMIUM_TIPS.steady;
    const tip = pickRandom(templates)
      .replace(/\{artist\}/g, topArtist.name)
      .replace(/\{song\}/g, topArtist.song)
      .replace(/\{delta\}/g, String(Math.abs(topArtist.delta)))
      .replace(/\{plays\}/g, String(topArtist.plays))
      .replace(/\{percent\}/g, String(declinePercent))
      .replace(/\{station\}/g, topArtist.station);
    tips.push(tip);
  } else {
    tips.push(pickRandom(LABEL_FREE_TIPS));
  }

  const body = totalPlays > 0
    ? `Your artists got ${totalPlays} plays yesterday.${topArtist ? ` ${topArtist.name} led with '${topArtist.song}' (${topArtist.plays} plays).` : ""}`
    : "No plays detected yesterday for your artists.";

  const content: LabelReportData = {
    totalArtists: artists.length,
    totalPlays,
    topArtist,
    decliningArtist: null,
  };

  return { content, tips, title: "Label Daily Report", body };
}

async function generateStationReport(userId: number, stationIds: number[], isPremium: boolean): Promise<GeneratedReport> {
  if (stationIds.length === 0) {
    return {
      content: { totalPlays: 0, uniqueSongs: 0, discoveryScore: 0 },
      tips: [pickRandom(STATION_FREE_TIPS)],
      title: "Station Daily Report",
      body: "No station data available. Check your station configuration.",
    };
  }

  const [playsRows, uniqueSongsRows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '1 day'
        AND started_at < CURRENT_DATE
        AND station_id = ANY(${stationIds}::int[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT isrc)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '1 day'
        AND started_at < CURRENT_DATE
        AND station_id = ANY(${stationIds}::int[])
        AND isrc IS NOT NULL
        AND partial_play = false
    `,
  ]);

  const totalPlays = Number(playsRows[0]?.count ?? 0);
  const uniqueSongs = Number(uniqueSongsRows[0]?.count ?? 0);
  const discoveryScore = totalPlays > 0 ? Math.round((uniqueSongs / totalPlays) * 100) : 0;

  const tips: string[] = [];
  if (isPremium) {
    const tip = pickRandom(STATION_PREMIUM_TIPS.insight)
      .replace(/\{uniqueSongs\}/g, String(uniqueSongs))
      .replace(/\{discoveryScore\}/g, String(discoveryScore));
    tips.push(tip);
  } else {
    tips.push(pickRandom(STATION_FREE_TIPS));
  }

  const body = `${totalPlays} plays yesterday with ${uniqueSongs} unique songs. ${tips[0]}`;

  const content: StationReportData = { totalPlays, uniqueSongs, discoveryScore };

  return { content, tips, title: "Station Daily Report", body };
}

// ─── Weekly Report Generation ──────────────────────────────────────
// Same per-role ISRC/scope logic as the daily reports, aggregated over the
// last 7 days vs the previous 7 days.

async function generateArtistWeeklyReport(userId: number, isPremium: boolean): Promise<GeneratedReport> {
  const monitoredSongs = await prisma.monitoredSong.findMany({
    where: { userId, status: "active" },
  });
  const isrcs = monitoredSongs.map((s) => s.isrc);

  if (isrcs.length === 0) {
    return {
      content: { totalPlays: 0, prevWeekPlays: 0, weekOverWeekPercent: 0, topSong: null, topStation: null, newStationsCount: 0 },
      tips: [pickRandom(ARTIST_FREE_TIPS)],
      title: "Your Weekly Airplay Report",
      body: "Add songs to monitor and we'll start tracking your airplay.",
    };
  }

  const [thisWeekRows, prevWeekRows, topSongRows, topStationRows, newStationsRows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND started_at < CURRENT_DATE
        AND isrc = ANY(${isrcs}::text[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '14 days'
        AND started_at < CURRENT_DATE - INTERVAL '7 days'
        AND isrc = ANY(${isrcs}::text[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ song_title: string; count: number }>>`
      SELECT song_title, COUNT(*)::int AS count
      FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND started_at < CURRENT_DATE
        AND isrc = ANY(${isrcs}::text[])
        AND partial_play = false
      GROUP BY song_title
      ORDER BY count DESC
      LIMIT 1
    `,
    prisma.$queryRaw<Array<{ station_name: string; count: number }>>`
      SELECT s.name AS station_name, COUNT(*)::int AS count
      FROM airplay_events ae
      JOIN stations s ON s.id = ae.station_id
      WHERE ae.started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND ae.started_at < CURRENT_DATE
        AND ae.isrc = ANY(${isrcs}::text[])
        AND ae.partial_play = false
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 1
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT station_id)::int AS count
      FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND started_at < CURRENT_DATE
        AND isrc = ANY(${isrcs}::text[])
        AND partial_play = false
        AND station_id NOT IN (
          SELECT DISTINCT station_id FROM airplay_events
          WHERE started_at >= CURRENT_DATE - INTERVAL '14 days'
            AND started_at < CURRENT_DATE - INTERVAL '7 days'
            AND isrc = ANY(${isrcs}::text[])
            AND partial_play = false
        )
    `,
  ]);

  const totalPlays = Number(thisWeekRows[0]?.count ?? 0);
  const prevWeekPlays = Number(prevWeekRows[0]?.count ?? 0);
  const weekOverWeekPercent = percentChange(totalPlays, prevWeekPlays);
  const topStation = topStationRows.length > 0
    ? { name: topStationRows[0].station_name, plays: Number(topStationRows[0].count) }
    : null;
  const topSong = topSongRows.length > 0
    ? {
        title: topSongRows[0].song_title,
        plays: Number(topSongRows[0].count),
        station: topStation?.name || "multiple stations",
      }
    : null;
  const newStationsCount = Number(newStationsRows[0]?.count ?? 0);

  const content: ArtistWeeklyReportData = {
    totalPlays,
    prevWeekPlays,
    weekOverWeekPercent,
    topSong,
    topStation,
    newStationsCount,
  };

  const tips: string[] = [];
  if (isPremium && totalPlays > 0) {
    if (weekOverWeekPercent > 0) {
      tips.push(`Airplay is up ${weekOverWeekPercent}% week-over-week.${topSong ? ` '${topSong.title}' led with ${topSong.plays} plays — consider pitching it to more stations.` : ""}`);
    } else if (weekOverWeekPercent < 0) {
      tips.push(`Airplay is down ${Math.abs(weekOverWeekPercent)}% week-over-week (${totalPlays} vs ${prevWeekPlays} plays). Review your promo plan for the coming week.`);
    } else {
      tips.push(`Airplay held steady week-over-week at ${totalPlays} plays.`);
    }
  } else {
    tips.push(pickRandom(ARTIST_FREE_TIPS));
  }

  let body: string;
  if (totalPlays === 0) {
    body = "No plays detected in the last 7 days.";
  } else {
    const sign = weekOverWeekPercent >= 0 ? "+" : "";
    body = `${totalPlays} plays this week (${sign}${weekOverWeekPercent}% vs last week).`;
    if (topSong) {
      body += ` '${topSong.title}' led with ${topSong.plays} plays.`;
    }
    if (newStationsCount > 0) {
      body += ` ${newStationsCount} new station${newStationsCount === 1 ? "" : "s"} played your music.`;
    }
  }

  return { content, tips, title: "Your Weekly Airplay Report", body };
}

async function generateLabelWeeklyReport(userId: number, isPremium: boolean): Promise<GeneratedReport> {
  const artists = await prisma.labelArtist.findMany({
    where: { labelUserId: userId },
    include: {
      monitoredSongs: { include: { monitoredSong: true } },
    },
  });

  if (artists.length === 0) {
    return {
      content: { totalArtists: 0, totalPlays: 0, prevWeekPlays: 0, weekOverWeekPercent: 0, topArtist: null, topStation: null },
      tips: [pickRandom(LABEL_FREE_TIPS)],
      title: "Label Weekly Report",
      body: "Add artists to your roster to start tracking their performance.",
    };
  }

  const allIsrcs = artists.flatMap((a) =>
    a.monitoredSongs.map((ms) => ms.monitoredSong.isrc),
  );

  const [thisWeekRows, prevWeekRows, topArtistRows, topStationRows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND started_at < CURRENT_DATE
        AND isrc = ANY(${allIsrcs}::text[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '14 days'
        AND started_at < CURRENT_DATE - INTERVAL '7 days'
        AND isrc = ANY(${allIsrcs}::text[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ artist_name: string; song_title: string; count: number }>>`
      SELECT artist_name, song_title, COUNT(*)::int AS count
      FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND started_at < CURRENT_DATE
        AND isrc = ANY(${allIsrcs}::text[])
        AND partial_play = false
      GROUP BY artist_name, song_title
      ORDER BY count DESC
      LIMIT 1
    `,
    prisma.$queryRaw<Array<{ station_name: string; count: number }>>`
      SELECT s.name AS station_name, COUNT(*)::int AS count
      FROM airplay_events ae
      JOIN stations s ON s.id = ae.station_id
      WHERE ae.started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND ae.started_at < CURRENT_DATE
        AND ae.isrc = ANY(${allIsrcs}::text[])
        AND ae.partial_play = false
      GROUP BY s.name
      ORDER BY count DESC
      LIMIT 1
    `,
  ]);

  const totalPlays = Number(thisWeekRows[0]?.count ?? 0);
  const prevWeekPlays = Number(prevWeekRows[0]?.count ?? 0);
  const weekOverWeekPercent = percentChange(totalPlays, prevWeekPlays);
  const topArtist = topArtistRows.length > 0
    ? {
        name: topArtistRows[0].artist_name,
        song: topArtistRows[0].song_title,
        plays: Number(topArtistRows[0].count),
      }
    : null;
  const topStation = topStationRows.length > 0
    ? { name: topStationRows[0].station_name, plays: Number(topStationRows[0].count) }
    : null;

  const content: LabelWeeklyReportData = {
    totalArtists: artists.length,
    totalPlays,
    prevWeekPlays,
    weekOverWeekPercent,
    topArtist,
    topStation,
  };

  const tips: string[] = [];
  if (isPremium && topArtist) {
    tips.push(`${topArtist.name} led your roster this week with '${topArtist.song}' (${topArtist.plays} plays).${topStation ? ` Most airplay came from ${topStation.name}.` : ""}`);
  } else {
    tips.push(pickRandom(LABEL_FREE_TIPS));
  }

  let body: string;
  if (totalPlays === 0) {
    body = "No plays detected in the last 7 days for your artists.";
  } else {
    const sign = weekOverWeekPercent >= 0 ? "+" : "";
    body = `Your artists got ${totalPlays} plays this week (${sign}${weekOverWeekPercent}% vs last week).`;
    if (topArtist) {
      body += ` ${topArtist.name} led with '${topArtist.song}' (${topArtist.plays} plays).`;
    }
  }

  return { content, tips, title: "Label Weekly Report", body };
}

async function generateStationWeeklyReport(userId: number, stationIds: number[], isPremium: boolean): Promise<GeneratedReport> {
  if (stationIds.length === 0) {
    return {
      content: { totalPlays: 0, prevWeekPlays: 0, weekOverWeekPercent: 0, uniqueSongs: 0, discoveryScore: 0 },
      tips: [pickRandom(STATION_FREE_TIPS)],
      title: "Station Weekly Report",
      body: "No station data available. Check your station configuration.",
    };
  }

  const [thisWeekRows, prevWeekRows, uniqueSongsRows] = await Promise.all([
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND started_at < CURRENT_DATE
        AND station_id = ANY(${stationIds}::int[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(*)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '14 days'
        AND started_at < CURRENT_DATE - INTERVAL '7 days'
        AND station_id = ANY(${stationIds}::int[])
        AND partial_play = false
    `,
    prisma.$queryRaw<Array<{ count: number }>>`
      SELECT COUNT(DISTINCT isrc)::int AS count FROM airplay_events
      WHERE started_at >= CURRENT_DATE - INTERVAL '7 days'
        AND started_at < CURRENT_DATE
        AND station_id = ANY(${stationIds}::int[])
        AND isrc IS NOT NULL
        AND partial_play = false
    `,
  ]);

  const totalPlays = Number(thisWeekRows[0]?.count ?? 0);
  const prevWeekPlays = Number(prevWeekRows[0]?.count ?? 0);
  const weekOverWeekPercent = percentChange(totalPlays, prevWeekPlays);
  const uniqueSongs = Number(uniqueSongsRows[0]?.count ?? 0);
  const discoveryScore = totalPlays > 0 ? Math.round((uniqueSongs / totalPlays) * 100) : 0;

  const content: StationWeeklyReportData = {
    totalPlays,
    prevWeekPlays,
    weekOverWeekPercent,
    uniqueSongs,
    discoveryScore,
  };

  const tips: string[] = [];
  if (isPremium) {
    tips.push(`You played ${uniqueSongs} unique songs this week. Discovery score: ${discoveryScore}% (unique songs relative to total plays).`);
  } else {
    tips.push(pickRandom(STATION_FREE_TIPS));
  }

  const sign = weekOverWeekPercent >= 0 ? "+" : "";
  const body = totalPlays > 0
    ? `${totalPlays} plays this week (${sign}${weekOverWeekPercent}% vs last week) with ${uniqueSongs} unique songs.`
    : "No plays detected in the last 7 days on your stations.";

  return { content, tips, title: "Station Weekly Report", body };
}

// ─── Helpers ───────────────────────────────────────────────────────

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function percentChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function getCurrentHourInTimezone(tz: string): string {
  const now = new Date();
  const formatter = new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: tz,
    hour12: false,
  });
  return formatter.format(now);
}

function getWeekdayInTimezone(tz: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    timeZone: tz,
  }).format(new Date());
}

// ─── Main Process ──────────────────────────────────────────────────

async function processDailyReports(): Promise<void> {
  // Get all active users with their settings
  const users = await prisma.user.findMany({
    where: { isActive: true },
    include: {
      settings: true,
      scopes: true,
      deviceTokens: true,
      // Entitlement expiry: only subscriptions still granting access (active, or
      // trialing within the trial). An expired trial must fall back to free.
      subscriptions: {
        where: validSubscriptionWhere(),
        include: { plan: true },
        orderBy: { createdAt: "desc" as const },
        take: 1,
      },
    },
  });

  for (const user of users) {
    try {
      if (user.role !== "ARTIST" && user.role !== "LABEL" && user.role !== "STATION") continue;

      const settings = user.settings;
      const dailyEnabled = settings?.dailyReportEnabled ?? true;
      const weeklyEnabled = settings?.weeklyReportEnabled ?? true;

      const tz = settings?.dailyReportTimezone || "Europe/Bucharest";
      const targetTime = settings?.dailyReportTime || "08:00";
      const currentTime = getCurrentHourInTimezone(tz);

      // Only process if current hour matches the user's configured hour
      // Compare HH:00 format (we run every hour)
      const currentHour = currentTime.split(":")[0];
      const targetHour = targetTime.split(":")[0];
      if (currentHour !== targetHour) continue;

      // Weekly reports go out on Mondays (in the user's timezone), at the same hour.
      const isMonday = getWeekdayInTimezone(tz) === "Mon";

      if (!dailyEnabled && !(isMonday && weeklyEnabled)) continue;

      const activeSub = user.subscriptions[0];
      const isPremium = !!activeSub && activeSub.plan?.tier !== "FREE";
      const stationIds = user.scopes
        .filter((s) => s.entityType === "STATION")
        .map((s) => s.entityId);

      // Bucharest midnight — the digest covers a local calendar day, and this
      // anchor is also the key `GET /reports/today` looks the row up by, so the
      // two must agree.
      const today = startOfDay();

      // ── Daily report ──
      if (dailyEnabled) {
        const existing = await prisma.dailyReport.findFirst({
          where: { userId: user.id, reportDate: today, reportType: "daily" },
        });

        if (!existing) {
          let report: GeneratedReport;
          switch (user.role) {
            case "LABEL":
              report = await generateLabelReport(user.id, isPremium);
              break;
            case "STATION":
              report = await generateStationReport(user.id, stationIds, isPremium);
              break;
            default:
              report = await generateArtistReport(user.id, isPremium);
              break;
          }

          await prisma.dailyReport.create({
            data: {
              userId: user.id,
              reportDate: today,
              reportType: "daily",
              content: report.content as object,
              tips: report.tips,
              isPremium,
              deliveredVia: ["push"], // TODO: add "email" when email is implemented
            },
          });

          // Send push notification (routes to APNs/FCM per device platform).
          // data.type "daily_digest" is what the iOS app deep-links on.
          for (const dt of user.deviceTokens) {
            await sendPush(dt, {
              title: report.title,
              body: report.body,
              data: {
                type: "daily_digest",
                date: today.toISOString().split("T")[0],
              },
            });
          }

          logger.info({ userId: user.id, role: user.role, isPremium }, "Daily report sent");
        }
      }

      // ── Weekly report (Mondays) ──
      if (isMonday && weeklyEnabled) {
        const existingWeekly = await prisma.dailyReport.findFirst({
          where: { userId: user.id, reportDate: today, reportType: "weekly" },
        });

        if (!existingWeekly) {
          let report: GeneratedReport;
          switch (user.role) {
            case "LABEL":
              report = await generateLabelWeeklyReport(user.id, isPremium);
              break;
            case "STATION":
              report = await generateStationWeeklyReport(user.id, stationIds, isPremium);
              break;
            default:
              report = await generateArtistWeeklyReport(user.id, isPremium);
              break;
          }

          await prisma.dailyReport.create({
            data: {
              userId: user.id,
              reportDate: today,
              reportType: "weekly",
              content: report.content as object,
              tips: report.tips,
              isPremium,
              deliveredVia: ["push"],
            },
          });

          for (const dt of user.deviceTokens) {
            await sendPush(dt, {
              title: report.title,
              body: report.body,
              data: {
                type: "weekly_digest",
                date: today.toISOString().split("T")[0],
              },
            });
          }

          logger.info({ userId: user.id, role: user.role, isPremium }, "Weekly report sent");
        }
      }
    } catch (err) {
      logger.error({ userId: user.id, err }, "Failed to generate report");
    }
  }
}

// ─── Worker Lifecycle ──────────────────────────────────────────────

export async function startDailyReportWorker(): Promise<{
  queue: Queue;
  worker: Worker;
}> {
  const queue = new Queue(QUEUE_NAME, {
    connection: createRedisConnection(),
  });

  // Run every hour to check per-user scheduled times
  await queue.upsertJobScheduler(
    "daily-report-scheduler",
    { pattern: "0 * * * *", tz: "UTC" },
    { name: "daily-report", data: {} },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "daily-report") {
        logger.info("Running daily report processing");
        await processDailyReports();
        logger.info("Daily report processing complete");
      }
    },
    { connection: createRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Daily report job failed");
  });

  logger.info("Daily report worker started (hourly check, per-user timezone; weekly reports on Mondays)");

  return { queue, worker };
}
