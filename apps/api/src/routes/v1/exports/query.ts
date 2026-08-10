import { prisma } from "../../../lib/prisma.js";
import type { CurrentUser } from "../../../middleware/authenticate.js";

interface FilterParams {
  q?: string;
  startDate?: string;
  endDate?: string;
  stationId?: number;
}

interface QueryOptions {
  maxRows?: number;
}

interface QueryResult {
  events: Array<Record<string, unknown>>;
  exceeded: boolean;
}

/**
 * Shared filtered query builder for airplay events.
 *
 * Extracted from listEvents handler -- applies search, date range,
 * station filter, and role-based scope filtering.
 *
 * Uses maxRows + 1 to detect overflow without fetching all data.
 */
export async function queryFilteredEvents(
  filters: FilterParams,
  currentUser: CurrentUser,
  options?: QueryOptions,
): Promise<QueryResult> {
  const where = await buildEventFilter(filters, currentUser);
  if (!where) return { events: [], exceeded: false };

  const maxRows = options?.maxRows;
  const take = maxRows ? maxRows + 1 : undefined;

  const events = await prisma.airplayEvent.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take,
    include: { station: { select: { name: true } } },
  });

  const exceeded = maxRows ? events.length > maxRows : false;
  const data = exceeded && maxRows ? events.slice(0, maxRows) : events;

  return { events: data, exceeded };
}

/**
 * Builds the shared where clause. Returns null when the caller's scope resolves
 * to "no rows at all" (an artist or label with nothing monitored) — the callers
 * must never fall back to the whole market in that case.
 */
async function buildEventFilter(
  filters: FilterParams,
  currentUser: CurrentUser,
): Promise<Record<string, unknown> | null> {
  const { q, startDate, endDate, stationId } = filters;

  // Build where clause
  const where: Record<string, unknown> = {};

  // Exports always exclude partial plays (< 30s teasers/jingles) — they are
  // not real airplay by industry standards (MediaForest ~30s threshold).
  where.partialPlay = false;

  // Search: OR across songTitle, artistName (contains), isrc (equals)
  if (q) {
    where.OR = [
      { songTitle: { contains: q, mode: "insensitive" } },
      { artistName: { contains: q, mode: "insensitive" } },
      { isrc: { equals: q, mode: "insensitive" } },
    ];
  }

  // Date range filter
  if (startDate || endDate) {
    const dateFilter: Record<string, Date> = {};
    if (startDate) dateFilter.gte = new Date(startDate);
    if (endDate) dateFilter.lte = new Date(endDate);
    where.startedAt = dateFilter;
  }

  // Station filter
  if (stationId) {
    where.stationId = stationId;
  }

  // Scope-based filtering (mirrors listEvents in airplay-events/handlers.ts)
  if (currentUser.role === "STATION") {
    const stationScopes = currentUser.scopes
      .filter((s) => s.entityType === "STATION")
      .map((s) => s.entityId);

    // Override any explicit stationId with scope constraint
    where.stationId = { in: stationScopes };
  } else if (currentUser.role === "ARTIST") {
    // Artists only export events matching their monitored song ISRCs
    const monitored = await prisma.monitoredSong.findMany({
      where: { userId: currentUser.id, status: "active" },
      select: { isrc: true },
    });
    const isrcs = monitored.map((m) => m.isrc);
    if (isrcs.length === 0) return null; // never fall back to the whole market
    where.isrc = { in: isrcs };
  } else if (currentUser.role === "LABEL") {
    // Labels export events for their managed artists' monitored songs
    const labelSongs = await prisma.labelMonitoredSong.findMany({
      where: { labelArtist: { labelUserId: currentUser.id } },
      include: { monitoredSong: { select: { isrc: true } } },
    });
    const isrcs = labelSongs.map((ls) => ls.monitoredSong.isrc);
    if (isrcs.length === 0) return null; // never fall back to the whole market
    where.isrc = { in: isrcs };
  }
  // ADMIN: no additional scope filter

  return where;
}

export interface SummarySong {
  songTitle: string;
  artistName: string;
  isrc: string | null;
  plays: number;
  /** Per-station breakdown, so a label can see where a song actually ran. */
  byStation: Array<{ name: string; plays: number }>;
}

export interface EventSummary {
  totalPlays: number;
  uniqueSongs: number;
  songs: SummarySong[];
  stations: Array<{ name: string; plays: number }>;
}

/**
 * Aggregated view of the same filtered set, computed in SQL.
 *
 * The PDF report is built from this instead of from raw rows: a month of two
 * stations is tens of thousands of detections but only a few hundred distinct
 * songs, so the report stays a readable handful of pages and needs no row cap.
 */
export async function queryEventSummary(
  filters: FilterParams,
  currentUser: CurrentUser,
): Promise<EventSummary> {
  const where = await buildEventFilter(filters, currentUser);
  if (!where) {
    return { totalPlays: 0, uniqueSongs: 0, songs: [], stations: [] };
  }

  // One group per (song, station); folded into per-song totals below. Bounded by
  // distinct songs × monitored stations, not by the number of detections.
  const grouped = await prisma.airplayEvent.groupBy({
    by: ["songTitle", "artistName", "isrc", "stationId"],
    where,
    _count: { _all: true },
  });

  const stationRows = await prisma.station.findMany({
    select: { id: true, name: true },
  });
  const stationName = new Map(stationRows.map((s) => [s.id, s.name]));

  const songs = new Map<string, SummarySong>();
  const stationTotals = new Map<string, number>();
  let totalPlays = 0;

  for (const row of grouped) {
    const plays = row._count._all;
    totalPlays += plays;

    const name = stationName.get(row.stationId) ?? "Unknown";
    stationTotals.set(name, (stationTotals.get(name) ?? 0) + plays);

    // ISRC is the identity when present; titles drift between callbacks.
    const key = row.isrc ?? `${row.artistName}|${row.songTitle}`;
    const song = songs.get(key);
    if (song) {
      song.plays += plays;
      song.byStation.push({ name, plays });
    } else {
      songs.set(key, {
        songTitle: row.songTitle,
        artistName: row.artistName,
        isrc: row.isrc,
        plays,
        byStation: [{ name, plays }],
      });
    }
  }

  const songList = [...songs.values()].sort((a, b) => b.plays - a.plays);
  for (const song of songList) song.byStation.sort((a, b) => b.plays - a.plays);

  return {
    totalPlays,
    uniqueSongs: songList.length,
    songs: songList,
    stations: [...stationTotals.entries()]
      .map(([name, plays]) => ({ name, plays }))
      .sort((a, b) => b.plays - a.plays),
  };
}
