import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma.js";
import type { ArtistsSummaryQuery } from "./schema.js";

const PERIOD_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
};

/**
 * GET /artists/summary?period=day|week|month&limit=50
 *
 * Global artist aggregation computed in Postgres — replaces the client-side
 * hack (iOS/Android) that aggregated artists from at most 250 airplay events.
 * Single GROUP BY over airplay_events in the requested rolling window,
 * served by the (artist_name, started_at) index. Partial plays (teasers /
 * jingles under 30s) are excluded.
 */
export async function getArtistsSummary(
  request: FastifyRequest<{ Querystring: ArtistsSummaryQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const period = request.query.period ?? "week";
  const limit = request.query.limit ?? 50;
  const days = PERIOD_DAYS[period] ?? 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<
    Array<{
      artist_name: string;
      play_count: bigint | number;
      song_count: bigint | number;
      station_count: bigint | number;
      last_play_at: Date;
    }>
  >`
    SELECT
      artist_name,
      COUNT(*)::int AS play_count,
      COUNT(DISTINCT isrc)::int AS song_count,
      COUNT(DISTINCT station_id)::int AS station_count,
      MAX(started_at) AS last_play_at
    FROM airplay_events
    WHERE started_at >= ${since}
      AND partial_play = false
    GROUP BY artist_name
    ORDER BY play_count DESC
    LIMIT ${limit}
  `;

  return reply.send(
    rows.map((r) => ({
      artistName: r.artist_name,
      playCount: Number(r.play_count),
      songCount: Number(r.song_count),
      stationCount: Number(r.station_count),
      lastPlayAt:
        r.last_play_at instanceof Date
          ? r.last_play_at.toISOString()
          : r.last_play_at,
    })),
  );
}
