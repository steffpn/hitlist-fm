/**
 * Public "hitlist.fm Airplay Top" chart.
 *
 * Aggregated from airplay_events (partial_play = false, ISRC present — the
 * chart is keyed by ISRC, so events without one are excluded; monitored
 * catalog always carries ISRCs). No auth; rate-limited per IP at the plugin.
 *
 * Periods (Europe/Bucharest local time):
 * - week  = running ISO week (Monday 00:00 -> now); delta vs the previous
 *   full Monday–Sunday week.
 * - month = running calendar month; delta vs the previous full month.
 *
 * peakPosition: the best (lowest) known position. Computing a true all-time
 * peak would require ranking every historical week, which is expensive, so —
 * as documented in the product spec — it is approximated cheaply for the
 * week period only as min(current position, previous week position) and
 * omitted (null) for the month period.
 *
 * Caching: full JSON response cached in Redis for 15 minutes, keyed by
 * period+limit.
 */

import type { FastifyReply, FastifyRequest } from "fastify";
import { Prisma } from "../../../../generated/prisma/client.js";
import { prisma } from "../../../lib/prisma.js";
import { redis } from "../../../lib/redis.js";
import { periodWindow, startOfWeek, addLocalDays, CHART_TZ } from "../../../lib/period.js";
import type { AirplayChartQuery, SongIsrcParams } from "./schema.js";

const CACHE_TTL_SECONDS = 15 * 60;

/** How deep we rank the previous period when computing deltas. A song outside
 * the previous top-500 is treated as new — a fine trade-off vs an unbounded scan. */
const PREV_RANK_DEPTH = 500;

interface ChartRow {
  isrc: string;
  plays: bigint | number;
  station_count: bigint | number;
  song_title: string;
  artist_name: string;
  artwork_url: string | null;
}

export interface ChartEntryDto {
  rank: number;
  songTitle: string;
  artistName: string;
  isrc: string;
  plays: number;
  stationCount: number;
  artworkUrl: string | null;
  /** previous position - current position (positive = climbed); null when new. */
  delta: number | null;
  /** Best known position (week period only — see module doc); null otherwise. */
  peakPosition: number | null;
  isNew: boolean;
}

function chartAggregationQuery(start: Date, end: Date, limit: number): Prisma.Sql {
  return Prisma.sql`
    SELECT
      isrc,
      COUNT(*)::bigint AS plays,
      COUNT(DISTINCT station_id)::bigint AS station_count,
      (array_agg(song_title ORDER BY started_at DESC))[1] AS song_title,
      (array_agg(artist_name ORDER BY started_at DESC))[1] AS artist_name,
      (array_agg(artwork_url ORDER BY started_at DESC) FILTER (WHERE artwork_url IS NOT NULL))[1] AS artwork_url
    FROM airplay_events
    WHERE partial_play = false
      AND isrc IS NOT NULL
      AND started_at >= ${start}
      AND started_at < ${end}
    GROUP BY isrc
    ORDER BY plays DESC, station_count DESC, isrc ASC
    LIMIT ${limit}
  `;
}

/**
 * GET /charts/airplay?period=week|month&limit=100 — public airplay chart.
 */
export async function getAirplayChart(
  request: FastifyRequest<{ Querystring: AirplayChartQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const period = request.query.period ?? "week";
  const limit = request.query.limit ?? 100;

  const cacheKey = `charts:airplay:${period}:${limit}`;
  try {
    const cached = await redis.get(cacheKey);
    if (cached) {
      return reply.header("x-cache", "hit").send(JSON.parse(cached));
    }
  } catch {
    // Cache read failures must never break the public endpoint.
  }

  const window = periodWindow(period);

  const [currentRows, prevRows] = await Promise.all([
    prisma.$queryRaw<ChartRow[]>(
      chartAggregationQuery(window.start, window.end, limit),
    ),
    prisma.$queryRaw<Array<{ isrc: string }>>(
      Prisma.sql`
        SELECT isrc
        FROM airplay_events
        WHERE partial_play = false
          AND isrc IS NOT NULL
          AND started_at >= ${window.prevStart}
          AND started_at < ${window.prevEnd}
        GROUP BY isrc
        ORDER BY COUNT(*) DESC, COUNT(DISTINCT station_id) DESC, isrc ASC
        LIMIT ${PREV_RANK_DEPTH}
      `,
    ),
  ]);

  const prevPositionByIsrc = new Map<string, number>();
  prevRows.forEach((row, i) => prevPositionByIsrc.set(row.isrc, i + 1));

  const entries: ChartEntryDto[] = currentRows.map((row, i) => {
    const rank = i + 1;
    const prevPosition = prevPositionByIsrc.get(row.isrc) ?? null;
    return {
      rank,
      songTitle: row.song_title,
      artistName: row.artist_name,
      isrc: row.isrc,
      plays: Number(row.plays),
      stationCount: Number(row.station_count),
      artworkUrl: row.artwork_url ?? null,
      delta: prevPosition === null ? null : prevPosition - rank,
      peakPosition:
        period === "week"
          ? Math.min(rank, prevPosition ?? rank)
          : null,
      isNew: prevPosition === null,
    };
  });

  const response = {
    period,
    periodStart: window.start.toISOString(),
    generatedAt: new Date().toISOString(),
    entries,
  };

  try {
    await redis.set(cacheKey, JSON.stringify(response), "EX", CACHE_TTL_SECONDS);
  } catch {
    // Cache write failures must never break the public endpoint.
  }

  return reply.header("x-cache", "miss").send(response);
}

interface WeeklyPositionRow {
  week_start: Date | string;
  plays: bigint | number;
  position: bigint | number;
}

/**
 * GET /charts/airplay/song/:isrc — the song's weekly chart positions over
 * the last 12 Bucharest ISO weeks (including the running week). Weeks where
 * the song had no full plays are omitted.
 */
export async function getSongChartHistory(
  request: FastifyRequest<{ Params: SongIsrcParams }>,
  reply: FastifyReply,
): Promise<void> {
  const { isrc } = request.params;

  const currentWeekStart = startOfWeek(new Date());
  const since = addLocalDays(currentWeekStart, -7 * 11); // 12 weeks incl. current

  const rows = await prisma.$queryRaw<WeeklyPositionRow[]>(
    Prisma.sql`
      WITH weekly AS (
        SELECT
          isrc,
          date_trunc('week', started_at AT TIME ZONE ${CHART_TZ}) AS week_start,
          COUNT(*)::bigint AS plays
        FROM airplay_events
        WHERE partial_play = false
          AND isrc IS NOT NULL
          AND started_at >= ${since}
        GROUP BY isrc, week_start
      ),
      ranked AS (
        SELECT
          isrc,
          week_start,
          plays,
          RANK() OVER (PARTITION BY week_start ORDER BY plays DESC) AS position
        FROM weekly
      )
      SELECT week_start, plays, position
      FROM ranked
      WHERE isrc = ${isrc}
      ORDER BY week_start ASC
    `,
  );

  return reply.send({
    isrc,
    weeks: rows.map((row) => ({
      // date_trunc over a local-time expression yields a local-date timestamp:
      // report just the calendar date of the Bucharest week's Monday.
      weekStart: new Date(row.week_start).toISOString().slice(0, 10),
      plays: Number(row.plays),
      position: Number(row.position),
    })),
  });
}
