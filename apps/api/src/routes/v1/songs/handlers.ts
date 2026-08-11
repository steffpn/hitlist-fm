import type { FastifyReply, FastifyRequest } from "fastify";
import { queryEventSummary } from "../exports/query.js";
import { startOfDay, startOfMonth, startOfWeek } from "../../../lib/period.js";
import type { SongsQuery } from "./schema.js";

/**
 * GET /songs — one songs list that means the right thing for whoever is asking.
 *
 * Every role wants "the songs", but a different set of them: an artist's own
 * monitored tracks, a label's whole roster, everything a station aired. Rather
 * than three near-identical screens, this reuses the role-scoped filter the
 * exports already apply, so the tab adapts instead of branching.
 *
 * Ordered by plays, with the per-station split each row was missing.
 */
export async function listSongs(
  request: FastifyRequest<{ Querystring: SongsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { period = "week", q, stationId, limit = 200 } = request.query;

  const now = new Date();
  const start =
    period === "day"
      ? startOfDay(now)
      : period === "month"
        ? startOfMonth(now)
        : startOfWeek(now);

  const summary = await queryEventSummary(
    {
      q,
      stationId,
      startDate: start.toISOString(),
      endDate: now.toISOString(),
    },
    request.currentUser,
  );

  return reply.send({
    period,
    periodStart: start.toISOString(),
    totalPlays: summary.totalPlays,
    uniqueSongs: summary.uniqueSongs,
    stations: summary.stations,
    songs: summary.songs.slice(0, limit).map((song) => ({
      isrc: song.isrc,
      songTitle: song.songTitle,
      artistName: song.artistName,
      plays: song.plays,
      stationCount: song.byStation.length,
      byStation: song.byStation,
    })),
    // Made explicit so a client can say "showing the top N" rather than
    // silently presenting a truncated list as if it were everything.
    truncated: summary.songs.length > limit,
  });
}
