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
    if (isrcs.length > 0) {
      where.isrc = { in: isrcs };
    } else {
      // No monitored songs -> no rows (never the whole market)
      return { events: [], exceeded: false };
    }
  } else if (currentUser.role === "LABEL") {
    // Labels export events for their managed artists' monitored songs
    const labelSongs = await prisma.labelMonitoredSong.findMany({
      where: { labelArtist: { labelUserId: currentUser.id } },
      include: { monitoredSong: { select: { isrc: true } } },
    });
    const isrcs = labelSongs.map((ls) => ls.monitoredSong.isrc);
    if (isrcs.length > 0) {
      where.isrc = { in: isrcs };
    } else {
      // No monitored songs -> no rows (never the whole market)
      return { events: [], exceeded: false };
    }
  }
  // ADMIN: no additional scope filter

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
