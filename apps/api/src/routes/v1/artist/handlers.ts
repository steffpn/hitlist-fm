import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import {
  getEffectivePlan,
  nextUpgradeTier,
  quotaExceededBody,
} from "../../../lib/entitlements.js";
import type {
  SongIdParams,
  AddMonitoredSongBody,
  SongAnalyticsQuery,
} from "./schema.js";
import type { BrowseTracksQuery, ShareOfAirplayQuery } from "./schema.js";
import {
  addLocalDays,
  periodWindow,
  startOfDay,
  startOfWeek,
} from "../../../lib/period.js";

// --- Date helpers ---
//
// These delegate to the Europe/Bucharest helpers in lib/period.ts. They used to
// do naive local-time arithmetic, which broke twice over: the server runs in UTC
// (so "today" started at 03:00 Bucharest), and `getDate() - getDay() + 1` lands
// on *tomorrow* every Sunday, because getDay() returns 0 there — which is why the
// dashboard showed "0 plays this week" next to a non-zero "plays today".

function getStartOfWeek(): Date {
  return startOfWeek();
}

function getStartOfLastWeek(): Date {
  return addLocalDays(startOfWeek(), -7);
}

function getEndOfLastWeek(): Date {
  return new Date(startOfWeek().getTime() - 1);
}

function getStartOfToday(): Date {
  return startOfDay();
}

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function computeTrend(
  thisWeek: number,
  lastWeek: number,
): { direction: "up" | "down" | "flat"; percentChange: number } {
  if (lastWeek === 0 && thisWeek === 0) {
    return { direction: "flat", percentChange: 0 };
  }
  if (lastWeek === 0) {
    return { direction: "up", percentChange: 100 };
  }
  const percentChange = Math.round(
    ((thisWeek - lastWeek) / lastWeek) * 100,
  );
  const direction =
    percentChange > 0 ? "up" : percentChange < 0 ? "down" : "flat";
  return { direction, percentChange: Math.abs(percentChange) };
}

// --- Helper to verify song ownership ---

async function getOwnedSong(userId: number, songId: number, userRole?: string) {
  const song = await prisma.monitoredSong.findUnique({
    where: { id: songId },
  });
  if (!song) return null;

  // Direct ownership (artist owns the song)
  if (song.userId === userId) return song;

  // Label ownership (song is linked via label_monitored_songs)
  if (userRole === "LABEL" || userRole === "ADMIN") {
    const labelLink = await prisma.labelMonitoredSong.findFirst({
      where: {
        monitoredSongId: songId,
        labelArtist: { labelUserId: userId },
      },
    });
    if (labelLink) return song;
  }

  // Admin can access any song
  if (userRole === "ADMIN") return song;

  return null;
}

// --- Handlers ---

/**
 * GET /artist/songs - List all monitored songs for the current artist.
 */
export async function getArtistSongs(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;

  const songs = await prisma.monitoredSong.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const startOfWeek = getStartOfWeek();
  const startOfLastWeek = getStartOfLastWeek();
  const endOfLastWeek = getEndOfLastWeek();

  const results = await Promise.all(
    songs.map(async (song) => {
      if (song.status !== "active") {
        return {
          id: song.id,
          songTitle: song.songTitle,
          artistName: song.artistName,
          isrc: song.isrc,
          status: song.status,
          activatedAt: song.activatedAt,
          totalPlays: 0,
          stationCount: 0,
          trend: { direction: "flat" as const, percentChange: 0 },
        };
      }

      const totals: Array<{ plays: bigint; stations: bigint }> =
        await prisma.$queryRaw`
          SELECT COUNT(*)::bigint AS plays, COUNT(DISTINCT station_id)::bigint AS stations
          FROM airplay_events
          WHERE isrc = ${song.isrc} AND started_at >= ${song.activatedAt}
            AND partial_play = false
        `;

      const thisWeekRows: Array<{ count: bigint }> =
        await prisma.$queryRaw`
          SELECT COUNT(*)::bigint AS count
          FROM airplay_events
          WHERE isrc = ${song.isrc}
            AND started_at >= ${startOfWeek > song.activatedAt ? startOfWeek : song.activatedAt}
            AND started_at <= NOW()
            AND partial_play = false
        `;

      const lastWeekRows: Array<{ count: bigint }> =
        await prisma.$queryRaw`
          SELECT COUNT(*)::bigint AS count
          FROM airplay_events
          WHERE isrc = ${song.isrc}
            AND started_at >= ${startOfLastWeek > song.activatedAt ? startOfLastWeek : song.activatedAt}
            AND started_at <= ${endOfLastWeek}
            AND started_at >= ${song.activatedAt}
            AND partial_play = false
        `;

      const thisWeekCount = Number(thisWeekRows[0]?.count ?? 0);
      const lastWeekCount = Number(lastWeekRows[0]?.count ?? 0);
      const trend = computeTrend(thisWeekCount, lastWeekCount);

      return {
        id: song.id,
        songTitle: song.songTitle,
        artistName: song.artistName,
        isrc: song.isrc,
        status: song.status,
        activatedAt: song.activatedAt,
        totalPlays: Number(totals[0]?.plays ?? 0),
        stationCount: Number(totals[0]?.stations ?? 0),
        trend,
      };
    }),
  );

  return reply.send(results);
}

/**
 * POST /artist/songs - Add a new monitored song.
 */
export async function addArtistSong(
  request: FastifyRequest<{ Body: AddMonitoredSongBody }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;
  const { songTitle, artistName, isrc } = request.body;

  // Artists can only monitor their own songs (case-insensitive)
  if (artistName.toLowerCase() !== request.currentUser.name.toLowerCase()) {
    return reply.status(403).send({
      error: "Artists can only monitor their own songs",
    });
  }

  // Quota from the user's effective plan (capped tiers — no unlimited).
  // Admin impersonation ("view as role") is exempt from plan limits.
  if (request.realUser?.role !== "ADMIN") {
    const plan = await getEffectivePlan(userId, request.currentUser.role);
    const limit = plan.maxMonitoredSongs;
    const activeCount = await prisma.monitoredSong.count({
      where: { userId, status: "active" },
    });
    if (activeCount >= limit) {
      return reply
        .status(403)
        .send(
          quotaExceededBody(
            "songs.monitor",
            limit,
            activeCount,
            nextUpgradeTier(request.currentUser.role, plan.slug),
          ),
        );
    }
  }

  try {
    const song = await prisma.monitoredSong.create({
      data: {
        userId,
        songTitle,
        artistName,
        isrc,
        activatedAt: new Date(),
        status: "active",
      },
    });

    return reply.status(201).send(song);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return reply.status(409).send({
        error: "You are already monitoring a song with this ISRC",
      });
    }
    throw error;
  }
}

/**
 * GET /artist/songs/:id/analytics - Daily play analytics for a song.
 */
export async function getSongAnalytics(
  request: FastifyRequest<{
    Params: SongIdParams;
    Querystring: SongAnalyticsQuery;
  }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;
  const { id } = request.params;

  const song = await getOwnedSong(userId, id, request.currentUser.role);
  if (!song) {
    return reply.status(404).send({ error: "Song not found" });
  }

  const dailyPlays: Array<{ date: Date; count: bigint }> =
    await prisma.$queryRaw`
      SELECT DATE_TRUNC('day', started_at) AS date, COUNT(*)::bigint AS count
      FROM airplay_events
      WHERE isrc = ${song.isrc} AND started_at >= ${song.activatedAt}
        AND partial_play = false
      GROUP BY DATE_TRUNC('day', started_at)
      ORDER BY date ASC
    `;

  const totals: Array<{ plays: bigint; stations: bigint }> =
    await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS plays, COUNT(DISTINCT station_id)::bigint AS stations
      FROM airplay_events
      WHERE isrc = ${song.isrc} AND started_at >= ${song.activatedAt}
        AND partial_play = false
    `;

  return reply.send({
    song: {
      id: song.id,
      songTitle: song.songTitle,
      artistName: song.artistName,
      isrc: song.isrc,
      activatedAt: song.activatedAt,
    },
    dailyPlays: dailyPlays.map((row) => ({
      date: row.date instanceof Date ? row.date.toISOString().split("T")[0] : String(row.date),
      count: Number(row.count),
    })),
    totalPlays: Number(totals[0]?.plays ?? 0),
    stationCount: Number(totals[0]?.stations ?? 0),
  });
}

/**
 * GET /artist/songs/:id/station-breakdown - Play counts grouped by station.
 */
export async function getStationBreakdown(
  request: FastifyRequest<{ Params: SongIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;
  const { id } = request.params;

  const song = await getOwnedSong(userId, id, request.currentUser.role);
  if (!song) {
    return reply.status(404).send({ error: "Song not found" });
  }

  const rows: Array<{
    station_id: number;
    station_name: string;
    logo_url: string | null;
    play_count: bigint;
  }> = await prisma.$queryRaw`
    SELECT
      ae.station_id,
      s.name AS station_name,
      s.logo_url,
      COUNT(*)::bigint AS play_count
    FROM airplay_events ae
    JOIN stations s ON s.id = ae.station_id
    WHERE ae.isrc = ${song.isrc} AND ae.started_at >= ${song.activatedAt}
      AND ae.partial_play = false
    GROUP BY ae.station_id, s.name, s.logo_url
    ORDER BY play_count DESC
  `;

  return reply.send(
    rows.map((row) => ({
      stationId: Number(row.station_id),
      stationName: row.station_name,
      logoUrl: row.logo_url,
      playCount: Number(row.play_count),
    })),
  );
}

/**
 * GET /artist/songs/:id/hourly-heatmap - 7x24 matrix of play counts.
 */
export async function getHourlyHeatmap(
  request: FastifyRequest<{ Params: SongIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;
  const { id } = request.params;

  const song = await getOwnedSong(userId, id, request.currentUser.role);
  if (!song) {
    return reply.status(404).send({ error: "Song not found" });
  }

  const rows: Array<{
    day_of_week: number;
    hour: number;
    plays: number;
  }> = await prisma.$queryRaw`
    SELECT
      EXTRACT(dow FROM started_at)::int AS day_of_week,
      EXTRACT(hour FROM started_at)::int AS hour,
      COUNT(*)::int AS plays
    FROM airplay_events
    WHERE isrc = ${song.isrc} AND started_at >= ${song.activatedAt}
      AND partial_play = false
    GROUP BY day_of_week, hour
    ORDER BY day_of_week, hour
  `;

  // Build 7x24 matrix (0=Sunday .. 6=Saturday, 0-23 hours)
  const matrix: number[][] = Array.from({ length: 7 }, () =>
    Array.from({ length: 24 }, () => 0),
  );

  let maxValue = 0;
  for (const row of rows) {
    matrix[row.day_of_week][row.hour] = row.plays;
    if (row.plays > maxValue) {
      maxValue = row.plays;
    }
  }

  return reply.send({ matrix, maxValue });
}

/**
 * GET /artist/songs/:id/peak-hours - Top 5 busiest hour slots.
 */
export async function getPeakHours(
  request: FastifyRequest<{ Params: SongIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;
  const { id } = request.params;

  const song = await getOwnedSong(userId, id, request.currentUser.role);
  if (!song) {
    return reply.status(404).send({ error: "Song not found" });
  }

  const rows: Array<{
    day_of_week: number;
    hour: number;
    plays: number;
  }> = await prisma.$queryRaw`
    SELECT
      EXTRACT(dow FROM started_at)::int AS day_of_week,
      EXTRACT(hour FROM started_at)::int AS hour,
      COUNT(*)::int AS plays
    FROM airplay_events
    WHERE isrc = ${song.isrc} AND started_at >= ${song.activatedAt}
      AND partial_play = false
    GROUP BY day_of_week, hour
    ORDER BY plays DESC
    LIMIT 5
  `;

  return reply.send(
    rows.map((row) => ({
      dayOfWeek: row.day_of_week,
      hour: row.hour,
      plays: row.plays,
      label: `${DAY_NAMES[row.day_of_week]} ${String(row.hour).padStart(2, "0")}:00`,
    })),
  );
}

/**
 * GET /artist/songs/:id/trend - This week vs last week comparison.
 */
export async function getSongTrend(
  request: FastifyRequest<{ Params: SongIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;
  const { id } = request.params;

  const song = await getOwnedSong(userId, id, request.currentUser.role);
  if (!song) {
    return reply.status(404).send({ error: "Song not found" });
  }

  const startOfWeek = getStartOfWeek();
  const startOfLastWeek = getStartOfLastWeek();
  const endOfLastWeek = getEndOfLastWeek();
  const now = new Date();

  // Ensure we never query before activatedAt
  const thisWeekStart =
    startOfWeek > song.activatedAt ? startOfWeek : song.activatedAt;
  const lastWeekStart =
    startOfLastWeek > song.activatedAt ? startOfLastWeek : song.activatedAt;

  const thisWeekRows: Array<{ count: bigint }> = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint AS count
    FROM airplay_events
    WHERE isrc = ${song.isrc}
      AND started_at >= ${thisWeekStart}
      AND started_at <= ${now}
      AND partial_play = false
  `;

  const lastWeekRows: Array<{ count: bigint }> = await prisma.$queryRaw`
    SELECT COUNT(*)::bigint AS count
    FROM airplay_events
    WHERE isrc = ${song.isrc}
      AND started_at >= ${lastWeekStart}
      AND started_at <= ${endOfLastWeek}
      AND started_at >= ${song.activatedAt}
      AND partial_play = false
  `;

  const thisWeek = Number(thisWeekRows[0]?.count ?? 0);
  const lastWeek = Number(lastWeekRows[0]?.count ?? 0);
  const { direction, percentChange } = computeTrend(thisWeek, lastWeek);

  return reply.send({
    thisWeek,
    lastWeek,
    percentChange,
    direction,
  });
}

/**
 * GET /artist/dashboard - Overview dashboard for the artist.
 */
export async function getArtistDashboard(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;

  const songs = await prisma.monitoredSong.findMany({
    where: { userId, status: "active" },
  });

  if (songs.length === 0) {
    return reply.send({
      totalPlaysToday: 0,
      totalPlaysWeek: 0,
      mostPlayedSong: null,
      weeklyDigest: [],
    });
  }

  const startOfToday = getStartOfToday();
  const startOfWeek = getStartOfWeek();
  const now = new Date();

  let totalPlaysToday = 0;
  let totalPlaysWeek = 0;
  let mostPlayedSong: {
    title: string;
    artist: string;
    plays: number;
  } | null = null;

  for (const song of songs) {
    const todayStart =
      startOfToday > song.activatedAt ? startOfToday : song.activatedAt;
    const weekStart =
      startOfWeek > song.activatedAt ? startOfWeek : song.activatedAt;

    const todayRows: Array<{ count: bigint }> = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS count
      FROM airplay_events
      WHERE isrc = ${song.isrc}
        AND started_at >= ${todayStart}
        AND started_at <= ${now}
        AND partial_play = false
    `;

    const weekRows: Array<{ count: bigint }> = await prisma.$queryRaw`
      SELECT COUNT(*)::bigint AS count
      FROM airplay_events
      WHERE isrc = ${song.isrc}
        AND started_at >= ${weekStart}
        AND started_at <= ${now}
        AND partial_play = false
    `;

    const todayCount = Number(todayRows[0]?.count ?? 0);
    const weekCount = Number(weekRows[0]?.count ?? 0);

    totalPlaysToday += todayCount;
    totalPlaysWeek += weekCount;

    if (!mostPlayedSong || weekCount > mostPlayedSong.plays) {
      mostPlayedSong = {
        title: song.songTitle,
        artist: song.artistName,
        plays: weekCount,
      };
    }
  }

  return reply.send({
    totalPlaysToday,
    totalPlaysWeek,
    mostPlayedSong,
  });
}

/**
 * GET /artist/weekly-digest - Per-song weekly comparison with new stations.
 */
export async function getWeeklyDigest(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;

  const songs = await prisma.monitoredSong.findMany({
    where: { userId, status: "active" },
  });

  const startOfWeek = getStartOfWeek();
  const startOfLastWeek = getStartOfLastWeek();
  const endOfLastWeek = getEndOfLastWeek();
  const now = new Date();

  const digest = await Promise.all(
    songs.map(async (song) => {
      const thisWeekStart =
        startOfWeek > song.activatedAt ? startOfWeek : song.activatedAt;
      const lastWeekStart =
        startOfLastWeek > song.activatedAt
          ? startOfLastWeek
          : song.activatedAt;

      const thisWeekRows: Array<{ count: bigint }> =
        await prisma.$queryRaw`
          SELECT COUNT(*)::bigint AS count
          FROM airplay_events
          WHERE isrc = ${song.isrc}
            AND started_at >= ${thisWeekStart}
            AND started_at <= ${now}
            AND partial_play = false
        `;

      const lastWeekRows: Array<{ count: bigint }> =
        await prisma.$queryRaw`
          SELECT COUNT(*)::bigint AS count
          FROM airplay_events
          WHERE isrc = ${song.isrc}
            AND started_at >= ${lastWeekStart}
            AND started_at <= ${endOfLastWeek}
            AND started_at >= ${song.activatedAt}
            AND partial_play = false
        `;

      const playsThisWeek = Number(thisWeekRows[0]?.count ?? 0);
      const playsLastWeek = Number(lastWeekRows[0]?.count ?? 0);
      const { direction, percentChange } = computeTrend(
        playsThisWeek,
        playsLastWeek,
      );

      // New stations: stations where first detection of this ISRC was this week
      const newStationRows: Array<{ name: string }> =
        await prisma.$queryRaw`
          SELECT s.name
          FROM airplay_events ae
          JOIN stations s ON s.id = ae.station_id
          WHERE ae.isrc = ${song.isrc}
            AND ae.started_at >= ${song.activatedAt}
            AND ae.partial_play = false
          GROUP BY s.id, s.name
          HAVING MIN(ae.started_at) >= ${startOfWeek}
        `;

      return {
        songTitle: song.songTitle,
        artistName: song.artistName,
        isrc: song.isrc,
        playsThisWeek,
        playsLastWeek,
        percentChange,
        direction,
        newStations: newStationRows.map((r) => r.name),
      };
    }),
  );

  return reply.send({ songs: digest });
}

/**
 * GET /artist/browse-tracks?q=numele piesei
 * Catalog search for artist onboarding — same Deezer mechanism as the label
 * browse endpoints (search + per-track ISRC lookup, since Deezer's search
 * payload doesn't include ISRC). Only tracks with a non-null ISRC are returned.
 */
export async function browseTracks(
  request: FastifyRequest<{ Querystring: BrowseTracksQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { q } = request.query;

  if (!q || q.trim().length === 0) {
    return reply.send([]);
  }

  try {
    const params = new URLSearchParams({
      q: q.trim(),
      limit: "25",
    });

    const response = await fetch(
      `https://api.deezer.com/search/track?${params}`,
    );

    if (!response.ok) {
      return reply.status(502).send({ error: "Deezer API error" });
    }

    const data = (await response.json()) as {
      data?: Array<{
        id: number;
        title: string;
        artist?: { name?: string };
        album?: { cover_medium?: string };
      }>;
    };

    // Fetch ISRC per track (Deezer search endpoint doesn't include it)
    const tracks = await Promise.all(
      (data.data || []).slice(0, 25).map(async (t) => {
        let isrc: string | null = null;
        try {
          const trackResponse = await fetch(
            `https://api.deezer.com/track/${t.id}`,
          );
          if (trackResponse.ok) {
            const trackData = (await trackResponse.json()) as {
              isrc?: string;
            };
            isrc = trackData.isrc || null;
          }
        } catch {
          // Best effort
        }

        return {
          title: t.title,
          artist: t.artist?.name ?? "",
          isrc,
          coverUrl: t.album?.cover_medium ?? null,
          deezerTrackId: t.id,
        };
      }),
    );

    // Only tracks with a usable ISRC are actionable for monitoring
    return reply.send(tracks.filter((t) => t.isrc !== null));
  } catch {
    return reply.status(502).send({ error: "Failed to search tracks" });
  }
}

/**
 * DELETE /artist/songs/:id - Remove one of the artist's own monitored songs.
 * Strict ownership: only songs where userId = currentUser.id can be deleted.
 * LabelMonitoredSong link rows referencing this song are removed automatically
 * by Postgres (FK onDelete: Cascade in schema.prisma).
 */
export async function deleteArtistSong(
  request: FastifyRequest<{ Params: SongIdParams }>,
  reply: FastifyReply,
): Promise<void> {
  const userId = request.currentUser.id;
  const { id } = request.params;

  const song = await prisma.monitoredSong.findFirst({
    where: { id, userId },
  });

  if (!song) {
    return reply.status(404).send({ error: "Song not found" });
  }

  await prisma.monitoredSong.delete({ where: { id } });

  return reply.status(204).send();
}

/**
 * GET /artist/share-of-airplay?period=week|month — premium market-share view
 * (feature gate: "analytics.share_of_airplay", premium artist+label plans).
 *
 * Compares the user's monitored catalog (ARTIST/ADMIN: own MonitoredSongs;
 * LABEL: roster songs linked via LabelMonitoredSong) against the whole market
 * in the running Bucharest week/month. Partial plays are always excluded.
 *
 * rank = the position the user's aggregated catalog plays would occupy in the
 * per-artist-name play ranking for the period (1 + number of artists with
 * strictly more plays); null when the user had 0 plays in the period.
 * totalArtists = distinct artist names with at least one full play.
 */
export async function getShareOfAirplay(
  request: FastifyRequest<{ Querystring: ShareOfAirplayQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.currentUser;
  const period = request.query.period ?? "week";
  const window = periodWindow(period);

  // The user's monitored ISRCs
  let isrcs: string[];
  if (user.role === "LABEL") {
    const links = await prisma.labelMonitoredSong.findMany({
      where: {
        labelArtist: { labelUserId: user.id },
        monitoredSong: { status: "active" },
      },
      include: { monitoredSong: { select: { isrc: true } } },
    });
    isrcs = [...new Set(links.map((l) => l.monitoredSong.isrc))];
  } else {
    const songs = await prisma.monitoredSong.findMany({
      where: { userId: user.id, status: "active" },
      select: { isrc: true },
    });
    isrcs = [...new Set(songs.map((s) => s.isrc))];
  }

  const playWindow = { gte: window.start, lt: window.end };

  const [yourPlays, marketPlays] = await Promise.all([
    isrcs.length === 0
      ? Promise.resolve(0)
      : prisma.airplayEvent.count({
          where: {
            isrc: { in: isrcs },
            partialPlay: false,
            startedAt: playWindow,
          },
        }),
    prisma.airplayEvent.count({
      where: { partialPlay: false, startedAt: playWindow },
    }),
  ]);

  const rankRows: Array<{ total_artists: bigint | number; artists_above: bigint | number }> =
    await prisma.$queryRaw`
      WITH artist_plays AS (
        SELECT artist_name, COUNT(*)::bigint AS plays
        FROM airplay_events
        WHERE partial_play = false
          AND started_at >= ${window.start}
          AND started_at < ${window.end}
        GROUP BY artist_name
      )
      SELECT
        COUNT(*)::bigint AS total_artists,
        (SELECT COUNT(*)::bigint FROM artist_plays WHERE plays > ${yourPlays}) AS artists_above
      FROM artist_plays
    `;

  const totalArtists = Number(rankRows[0]?.total_artists ?? 0);
  const artistsAbove = Number(rankRows[0]?.artists_above ?? 0);

  return reply.send({
    period,
    yourPlays,
    marketPlays,
    sharePercent:
      marketPlays > 0
        ? Math.round((yourPlays / marketPlays) * 10000) / 100
        : 0,
    rank: yourPlays > 0 ? artistsAbove + 1 : null,
    totalArtists,
  });
}
