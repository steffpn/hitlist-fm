import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import { userHasFeature } from "../../../middleware/require-feature.js";
import { addLocalDays, startOfDay } from "../../../lib/period.js";
import type {
  PeriodQuery,
  TopSongsQuery,
  StationIdQuery,
  CompetitorIdParams,
} from "./schema.js";

/**
 * Premium feature gating the per-station "competitor intelligence" analytics
 * (new-songs / exclusive-songs — same family as the overlap endpoint, which is
 * already gated on this key). Under the current plan seed every premium STATION
 * tier grants all station analytics features, so this key is equivalent to the
 * other station-analytics keys for gating purposes.
 */
const COMPETITOR_INTEL_FEATURE = "analytics.competitor_intel";

/**
 * Enforce the competitor-intelligence premium gate, mirroring
 * requireFeature("analytics.competitor_intel"): ADMINs and "view as role"
 * impersonation (realUser is ADMIN) are exempt. Returns true if the request may
 * proceed; otherwise sends a 403 and returns false.
 */
async function ensureCompetitorIntel(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<boolean> {
  if (request.realUser?.role === "ADMIN") return true;
  const { id, role } = request.currentUser;
  if (await userHasFeature(id, role, COMPETITOR_INTEL_FEATURE)) return true;
  reply.code(403).send({
    error: "Premium feature",
    message: "Upgrade your plan to access this feature",
    featureKey: COMPETITOR_INTEL_FEATURE,
  });
  return false;
}

/**
 * Ownership/scope check for a targeted station: the user may only query a
 * station they OWN (STATION scope) or WATCH (competitor). ADMINs and "view as
 * role" impersonation are exempt. Returns true if allowed; otherwise sends a
 * 403 and returns false.
 */
async function ensureStationInScope(
  request: FastifyRequest,
  reply: FastifyReply,
  stationId: number,
): Promise<boolean> {
  if (request.realUser?.role === "ADMIN") return true;
  if (getOwnStationIds(request).includes(stationId)) return true;
  const watched = await prisma.watchedStation.findFirst({
    where: { userId: request.currentUser.id, stationId },
    select: { id: true },
  });
  if (watched) return true;
  reply.code(403).send({ error: "Station is not in your scope" });
  return false;
}

/**
 * Derive a date range from the period string, or from explicit start/end dates.
 */
function getDateRange(query: {
  period?: string;
  startDate?: string;
  endDate?: string;
}): { start: Date; end: Date } {
  // Day boundaries are Europe/Bucharest, not the server's clock (UTC on Railway):
  // otherwise every window silently started at 03:00 local and dropped the plays
  // from the first hours of the day.
  if (query.startDate) {
    const start = startOfDay(new Date(query.startDate));
    // Inclusive end — the last instant of the local end day, or now for an open range.
    const end = query.endDate
      ? new Date(addLocalDays(startOfDay(new Date(query.endDate)), 1).getTime() - 1)
      : new Date();
    return { start, end };
  }

  const end = new Date();
  const today = startOfDay(end);
  // "day" is the current local day, not a rolling 24h window — it is labelled
  // "Today" in every client, and it used to reach back to yesterday 00:00.
  // "week"/"month" stay rolling windows anchored on local midnight.
  if (query.period === "week") return { start: addLocalDays(today, -7), end };
  if (query.period === "month") return { start: addLocalDays(today, -30), end };
  return { start: today, end };
}

/**
 * Extract own station IDs from the current user's scopes.
 */
function getOwnStationIds(request: FastifyRequest): number[] {
  return request.currentUser.scopes
    .filter((s) => s.entityType === "STATION")
    .map((s) => s.entityId);
}

/**
 * GET /station/overview
 *
 * Total plays, unique songs, unique artists for the user's own station(s)
 * within the requested period.
 */
export async function getStationOverview(
  request: FastifyRequest<{ Querystring: PeriodQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const ownStationIds = getOwnStationIds(request);
  if (ownStationIds.length === 0) {
    return reply.send({
      totalPlays: 0,
      uniqueSongs: 0,
      uniqueArtists: 0,
      stationNames: [],
    });
  }

  const { start, end } = getDateRange(request.query);

  const [stats] = await prisma.$queryRaw<
    Array<{
      plays: bigint | number;
      unique_songs: bigint | number;
      unique_artists: bigint | number;
    }>
  >`
    SELECT
      COUNT(*)::int AS plays,
      COUNT(DISTINCT isrc)::int AS unique_songs,
      COUNT(DISTINCT artist_name)::int AS unique_artists
    FROM airplay_events
    WHERE station_id IN (${Prisma.join(ownStationIds)})
      AND started_at >= ${start}
      AND started_at <= ${end}
      AND partial_play = false
  `;

  const stations = await prisma.station.findMany({
    where: { id: { in: ownStationIds } },
    select: { name: true },
  });

  return reply.send({
    totalPlays: Number(stats?.plays ?? 0),
    uniqueSongs: Number(stats?.unique_songs ?? 0),
    uniqueArtists: Number(stats?.unique_artists ?? 0),
    stationNames: stations.map((s) => s.name),
  });
}

/**
 * GET /station/top-songs
 *
 * Ranked songs by play count on the user's own station(s).
 */
export async function getStationTopSongs(
  request: FastifyRequest<{ Querystring: TopSongsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const ownStationIds = getOwnStationIds(request);
  if (ownStationIds.length === 0) {
    return reply.send([]);
  }

  const { start, end } = getDateRange(request.query);
  const limit = request.query.limit ?? 20;

  const rows = await prisma.$queryRaw<
    Array<{
      song_title: string;
      artist_name: string;
      isrc: string | null;
      play_count: bigint | number;
    }>
  >`
    SELECT
      song_title,
      artist_name,
      isrc,
      COUNT(*)::int AS play_count
    FROM airplay_events
    WHERE station_id IN (${Prisma.join(ownStationIds)})
      AND started_at >= ${start}
      AND started_at <= ${end}
      AND partial_play = false
    GROUP BY song_title, artist_name, isrc
    ORDER BY play_count DESC
    LIMIT ${limit}
  `;

  const result = rows.map((r, i) => ({
    rank: i + 1,
    songTitle: r.song_title,
    artistName: r.artist_name,
    isrc: r.isrc,
    playCount: Number(r.play_count),
  }));

  return reply.send(result);
}

/**
 * GET /station/new-songs?stationId=X
 *
 * Songs whose first-ever appearance on the given station was within the period.
 * stationId can be the user's own or a competitor station.
 */
export async function getNewSongs(
  request: FastifyRequest<{ Querystring: StationIdQuery }>,
  reply: FastifyReply,
): Promise<void> {
  // Premium feature gate (skipped historically — this was a paywall bypass).
  if (!(await ensureCompetitorIntel(request, reply))) return;

  const ownStationIds = getOwnStationIds(request);
  const stationId = request.query.stationId ?? ownStationIds[0];

  if (!stationId) {
    return reply.code(400).send({ error: "No stationId provided and no own station found" });
  }

  // Ownership/scope: only the user's own or watched stations (prevents reading
  // an arbitrary station's data by passing its id).
  if (!(await ensureStationInScope(request, reply, stationId))) return;

  const { start, end } = getDateRange(request.query);

  const rows = await prisma.$queryRaw<
    Array<{
      song_title: string;
      artist_name: string;
      isrc: string | null;
      first_played: Date;
    }>
  >`
    SELECT
      ae.song_title,
      ae.artist_name,
      ae.isrc,
      MIN(ae.started_at) AS first_played
    FROM airplay_events ae
    WHERE ae.station_id = ${stationId}
      AND ae.partial_play = false
    GROUP BY ae.song_title, ae.artist_name, ae.isrc
    HAVING MIN(ae.started_at) >= ${start}
      AND MIN(ae.started_at) <= ${end}
    ORDER BY first_played DESC
  `;

  const result = rows.map((r) => ({
    songTitle: r.song_title,
    artistName: r.artist_name,
    isrc: r.isrc,
    firstPlayedAt:
      r.first_played instanceof Date
        ? r.first_played.toISOString()
        : String(r.first_played),
  }));

  return reply.send(result);
}

/**
 * GET /station/exclusive-songs?stationId=X
 *
 * Songs played on stationId but NOT on any other monitored station in the period.
 */
export async function getExclusiveSongs(
  request: FastifyRequest<{ Querystring: StationIdQuery }>,
  reply: FastifyReply,
): Promise<void> {
  // Premium feature gate (skipped historically — this was a paywall bypass).
  if (!(await ensureCompetitorIntel(request, reply))) return;

  const ownStationIds = getOwnStationIds(request);
  const stationId = request.query.stationId ?? ownStationIds[0];

  if (!stationId) {
    return reply.code(400).send({ error: "No stationId provided and no own station found" });
  }

  // Ownership/scope: only the user's own or watched stations (prevents reading
  // an arbitrary station's data by passing its id).
  if (!(await ensureStationInScope(request, reply, stationId))) return;

  const { start, end } = getDateRange(request.query);

  const rows = await prisma.$queryRaw<
    Array<{
      song_title: string;
      artist_name: string;
      isrc: string | null;
      play_count: bigint | number;
    }>
  >`
    SELECT
      ae.song_title,
      ae.artist_name,
      ae.isrc,
      COUNT(*)::int AS play_count
    FROM airplay_events ae
    WHERE ae.station_id = ${stationId}
      AND ae.started_at >= ${start}
      AND ae.started_at <= ${end}
      AND ae.partial_play = false
      AND NOT EXISTS (
        SELECT 1 FROM airplay_events ae2
        WHERE ae2.isrc = ae.isrc
          AND ae2.isrc IS NOT NULL
          AND ae2.station_id != ${stationId}
          AND ae2.started_at >= ${start}
          AND ae2.started_at <= ${end}
          AND ae2.partial_play = false
      )
    GROUP BY ae.song_title, ae.artist_name, ae.isrc
    ORDER BY play_count DESC
    LIMIT 50
  `;

  const result = rows.map((r) => ({
    songTitle: r.song_title,
    artistName: r.artist_name,
    isrc: r.isrc,
    playCount: Number(r.play_count),
  }));

  return reply.send(result);
}

/**
 * GET /station/overlap/:competitorId
 *
 * Jaccard similarity between own station(s) and a competitor station.
 * Returns overlap percentage and shared songs list.
 */
export async function getPlaylistOverlap(
  request: FastifyRequest<{
    Params: CompetitorIdParams;
    Querystring: PeriodQuery;
  }>,
  reply: FastifyReply,
): Promise<void> {
  // Premium gate (same family as new-songs/exclusive-songs) + IDOR guard:
  // the competitor must be a station the user actually watches.
  if (!(await ensureCompetitorIntel(request, reply))) return;
  const competitorId = Number(request.params.competitorId);
  if (!(await ensureStationInScope(request, reply, competitorId))) return;

  const ownStationIds = getOwnStationIds(request);

  if (ownStationIds.length === 0) {
    return reply.send({
      overlapPercent: 0,
      sharedCount: 0,
      exclusiveToYou: 0,
      exclusiveToThem: 0,
      sharedSongs: [],
    });
  }

  const { start, end } = getDateRange(request.query);

  // Get ISRCs for own stations
  const ownIsrcs = await prisma.$queryRaw<Array<{ isrc: string }>>`
    SELECT DISTINCT isrc
    FROM airplay_events
    WHERE station_id IN (${Prisma.join(ownStationIds)})
      AND started_at >= ${start}
      AND started_at <= ${end}
      AND isrc IS NOT NULL
      AND partial_play = false
  `;

  // Get ISRCs for competitor station
  const competitorIsrcs = await prisma.$queryRaw<Array<{ isrc: string }>>`
    SELECT DISTINCT isrc
    FROM airplay_events
    WHERE station_id = ${competitorId}
      AND started_at >= ${start}
      AND started_at <= ${end}
      AND isrc IS NOT NULL
      AND partial_play = false
  `;

  const ownSet = new Set(ownIsrcs.map((r) => r.isrc));
  const competitorSet = new Set(competitorIsrcs.map((r) => r.isrc));

  const intersection = new Set([...ownSet].filter((x) => competitorSet.has(x)));
  const union = new Set([...ownSet, ...competitorSet]);

  const overlapPercent =
    union.size > 0
      ? Math.round((intersection.size / union.size) * 10000) / 100
      : 0;

  const sharedIsrcs = [...intersection];
  const exclusiveToYou = ownSet.size - intersection.size;
  const exclusiveToThem = competitorSet.size - intersection.size;

  // Get shared songs details (top 20 by combined plays)
  let sharedSongs: Array<{
    songTitle: string;
    artistName: string;
    yourPlays: number;
    theirPlays: number;
  }> = [];

  if (sharedIsrcs.length > 0) {
    const sharedRows = await prisma.$queryRaw<
      Array<{
        song_title: string;
        artist_name: string;
        your_plays: bigint | number;
        their_plays: bigint | number;
      }>
    >`
      SELECT
        song_title,
        artist_name,
        SUM(CASE WHEN station_id IN (${Prisma.join(ownStationIds)}) THEN 1 ELSE 0 END)::int AS your_plays,
        SUM(CASE WHEN station_id = ${competitorId} THEN 1 ELSE 0 END)::int AS their_plays
      FROM airplay_events
      WHERE isrc IN (${Prisma.join(sharedIsrcs)})
        AND (station_id IN (${Prisma.join(ownStationIds)}) OR station_id = ${competitorId})
        AND started_at >= ${start}
        AND started_at <= ${end}
        AND partial_play = false
      GROUP BY song_title, artist_name
      ORDER BY (SUM(CASE WHEN station_id IN (${Prisma.join(ownStationIds)}) THEN 1 ELSE 0 END)
              + SUM(CASE WHEN station_id = ${competitorId} THEN 1 ELSE 0 END)) DESC
      LIMIT 20
    `;

    sharedSongs = sharedRows.map((r) => ({
      songTitle: r.song_title,
      artistName: r.artist_name,
      yourPlays: Number(r.your_plays),
      theirPlays: Number(r.their_plays),
    }));
  }

  return reply.send({
    overlapPercent,
    sharedCount: intersection.size,
    exclusiveToYou,
    exclusiveToThem,
    sharedSongs,
  });
}

/**
 * GET /station/genre-distribution
 *
 * Distribution of record labels (as a genre proxy) on the user's own station(s).
 */
export async function getGenreDistribution(
  request: FastifyRequest<{ Querystring: PeriodQuery }>,
  reply: FastifyReply,
): Promise<void> {
  // Premium gate: genre/label distribution is a paid station-analytics feature.
  if (
    request.realUser?.role !== "ADMIN" &&
    !(await userHasFeature(
      request.currentUser.id,
      request.currentUser.role,
      "analytics.genre_distribution",
    ))
  ) {
    return reply.code(403).send({
      error: "Premium feature",
      message: "Upgrade your plan to access this feature",
      featureKey: "analytics.genre_distribution",
    });
  }

  const ownStationIds = getOwnStationIds(request);
  if (ownStationIds.length === 0) {
    return reply.send([]);
  }

  const { start, end } = getDateRange(request.query);

  const rows = await prisma.$queryRaw<
    Array<{ label: string; play_count: bigint | number }>
  >`
    SELECT
      label,
      COUNT(*)::int AS play_count
    FROM airplay_events
    WHERE station_id IN (${Prisma.join(ownStationIds)})
      AND started_at >= ${start}
      AND started_at <= ${end}
      AND label IS NOT NULL
      AND partial_play = false
    GROUP BY label
    ORDER BY play_count DESC
  `;

  const totalPlays = rows.reduce((sum, r) => sum + Number(r.play_count), 0);

  const result = rows.map((r) => ({
    label: r.label,
    playCount: Number(r.play_count),
    percentage:
      totalPlays > 0
        ? Math.round((Number(r.play_count) / totalPlays) * 10000) / 100
        : 0,
  }));

  return reply.send(result);
}

/**
 * GET /station/rotation
 *
 * Rotation analysis: unique songs per hour, average rotation,
 * and over-rotated songs (> mean + 2*stddev).
 */
export async function getRotationAnalysis(
  request: FastifyRequest<{ Querystring: PeriodQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const ownStationIds = getOwnStationIds(request);
  if (ownStationIds.length === 0) {
    return reply.send({
      uniqueSongsPerHour: [],
      averageRotation: 0,
      overRotatedSongs: [],
    });
  }

  const { start, end } = getDateRange(request.query);

  // Unique songs per hour of day
  const hourlyRows = await prisma.$queryRaw<
    Array<{ hour: number; count: bigint | number }>
  >`
    SELECT
      EXTRACT(hour FROM started_at)::int AS hour,
      COUNT(DISTINCT isrc)::int AS count
    FROM airplay_events
    WHERE station_id IN (${Prisma.join(ownStationIds)})
      AND started_at >= ${start}
      AND started_at <= ${end}
      AND isrc IS NOT NULL
      AND partial_play = false
    GROUP BY EXTRACT(hour FROM started_at)
    ORDER BY hour ASC
  `;

  // Per-song play counts for rotation stats
  const songCounts = await prisma.$queryRaw<
    Array<{
      song_title: string;
      artist_name: string;
      isrc: string | null;
      play_count: bigint | number;
    }>
  >`
    SELECT
      song_title,
      artist_name,
      isrc,
      COUNT(*)::int AS play_count
    FROM airplay_events
    WHERE station_id IN (${Prisma.join(ownStationIds)})
      AND started_at >= ${start}
      AND started_at <= ${end}
      AND partial_play = false
    GROUP BY song_title, artist_name, isrc
  `;

  const counts = songCounts.map((r) => Number(r.play_count));
  const n = counts.length;
  const mean = n > 0 ? counts.reduce((a, b) => a + b, 0) / n : 0;
  const variance =
    n > 0 ? counts.reduce((sum, c) => sum + (c - mean) ** 2, 0) / n : 0;
  const stddev = Math.sqrt(variance);
  const threshold = mean + 2 * stddev;

  const overRotated = songCounts
    .filter((r) => Number(r.play_count) > threshold)
    .sort((a, b) => Number(b.play_count) - Number(a.play_count))
    .map((r) => ({
      songTitle: r.song_title,
      artistName: r.artist_name,
      playCount: Number(r.play_count),
      expectedMax: Math.round(threshold),
    }));

  return reply.send({
    uniqueSongsPerHour: hourlyRows.map((r) => ({
      hour: Number(r.hour),
      count: Number(r.count),
    })),
    averageRotation: Math.round(mean * 100) / 100,
    overRotatedSongs: overRotated,
  });
}

/**
 * GET /station/discovery-score
 *
 * What percentage of this station's recent airplay consists of
 * "new songs" (ISRCs first seen across ALL stations in the last 30 days).
 */
export async function getDiscoveryScore(
  request: FastifyRequest<{ Querystring: PeriodQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const ownStationIds = getOwnStationIds(request);
  if (ownStationIds.length === 0) {
    return reply.send({
      score: 0,
      newSongsCount: 0,
      totalSongsCount: 0,
      newSongsPlays: 0,
      totalPlays: 0,
    });
  }

  const { start, end } = getDateRange(request.query);

  // Step 1: Find ISRCs first seen across ALL stations in the last 30 days
  const thirtyDaysAgo = addLocalDays(startOfDay(), -30);

  const newIsrcRows = await prisma.$queryRaw<Array<{ isrc: string }>>`
    SELECT isrc
    FROM airplay_events
    WHERE isrc IS NOT NULL
      AND partial_play = false
    GROUP BY isrc
    HAVING MIN(started_at) >= ${thirtyDaysAgo}
  `;

  const newIsrcs = new Set(newIsrcRows.map((r) => r.isrc));

  // Step 2: Get play counts on own station(s) within the period
  const playRows = await prisma.$queryRaw<
    Array<{ isrc: string | null; play_count: bigint | number }>
  >`
    SELECT
      isrc,
      COUNT(*)::int AS play_count
    FROM airplay_events
    WHERE station_id IN (${Prisma.join(ownStationIds)})
      AND started_at >= ${start}
      AND started_at <= ${end}
      AND partial_play = false
    GROUP BY isrc
  `;

  let totalPlays = 0;
  let newSongsPlays = 0;
  let totalSongsCount = 0;
  let newSongsCount = 0;

  for (const row of playRows) {
    const count = Number(row.play_count);
    totalPlays += count;
    totalSongsCount++;

    if (row.isrc && newIsrcs.has(row.isrc)) {
      newSongsPlays += count;
      newSongsCount++;
    }
  }

  const score =
    totalPlays > 0
      ? Math.round((newSongsPlays / totalPlays) * 10000) / 100
      : 0;

  return reply.send({
    score,
    newSongsCount,
    totalSongsCount,
    newSongsPlays,
    totalPlays,
  });
}
