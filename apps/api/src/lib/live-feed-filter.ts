/**
 * Server-side event filtering for the live feed SSE route.
 *
 * Determines whether a detection event should be delivered to a specific
 * user based on their role and scopes.
 */

import { prisma } from "./prisma.js";
import type { LiveDetectionEvent } from "./pubsub.js";
import type { CurrentUser } from "../middleware/authenticate.js";

/** How long a user's monitored-ISRC set is cached before being reloaded. */
const ISRC_CACHE_TTL_MS = 60_000;

interface IsrcCacheEntry {
  /** Promise so concurrent events during a cache miss share one DB query. */
  isrcs: Promise<Set<string>>;
  expiresAt: number;
}

/**
 * In-memory cache: userId -> monitored ISRC set (with TTL, lazily invalidated).
 *
 * shouldDeliverToUser runs per-event in the SSE hot path, so ARTIST/LABEL
 * ISRC lookups must not hit the DB per event. On a miss we load once and
 * cache the promise for ISRC_CACHE_TTL_MS; expired entries for other users
 * are swept opportunistically on each miss (misses are at most one per user
 * per TTL window, so the sweep is cheap).
 */
const isrcCache = new Map<number, IsrcCacheEntry>();

/**
 * Load the set of ISRCs the user is allowed to see.
 * Mirrors the scope filtering in airplay-events listEvents:
 * - ARTIST: active MonitoredSong rows for the user
 * - LABEL: LabelMonitoredSong rows across the label's artists
 */
async function loadMonitoredIsrcs(user: CurrentUser): Promise<Set<string>> {
  if (user.role === "ARTIST") {
    const monitored = await prisma.monitoredSong.findMany({
      where: { userId: user.id, status: "active" },
      select: { isrc: true },
    });
    return new Set(monitored.map((m) => m.isrc));
  }

  // LABEL
  const labelSongs = await prisma.labelMonitoredSong.findMany({
    where: { labelArtist: { labelUserId: user.id } },
    include: { monitoredSong: { select: { isrc: true } } },
  });
  return new Set(labelSongs.map((ls) => ls.monitoredSong.isrc));
}

function getMonitoredIsrcs(user: CurrentUser): Promise<Set<string>> {
  const now = Date.now();
  const cached = isrcCache.get(user.id);
  if (cached && cached.expiresAt > now) {
    return cached.isrcs;
  }

  // Opportunistic sweep of expired entries (runs only on cache misses)
  for (const [userId, entry] of isrcCache) {
    if (entry.expiresAt <= now) {
      isrcCache.delete(userId);
    }
  }

  const isrcs = loadMonitoredIsrcs(user).catch((err) => {
    // Drop the entry so the next event retries instead of caching the failure
    isrcCache.delete(user.id);
    throw err;
  });
  isrcCache.set(user.id, { isrcs, expiresAt: now + ISRC_CACHE_TTL_MS });
  return isrcs;
}

/**
 * Check if a live detection event should be delivered to the given user.
 *
 * Filtering rules:
 * - ADMIN: receives all events
 * - STATION: receives events from stations in their scopes
 * - ARTIST/LABEL: receives only events whose ISRC is in their monitored
 *   songs (MonitoredSong for ARTIST, LabelMonitoredSong for LABEL).
 *   ISRC sets are cached in-memory per user (TTL 60s) — no DB query
 *   per event.
 */
export async function shouldDeliverToUser(
  event: LiveDetectionEvent,
  user: CurrentUser,
): Promise<boolean> {
  // ADMIN sees everything
  if (user.role === "ADMIN") return true;

  // STATION sees only events from stations in their scopes
  if (user.role === "STATION") {
    const stationIds = user.scopes
      .filter((s) => s.entityType === "STATION")
      .map((s) => s.entityId);
    return stationIds.includes(event.stationId);
  }

  // ARTIST / LABEL: only events matching their monitored song ISRCs
  if (user.role === "ARTIST" || user.role === "LABEL") {
    if (!event.isrc) return false;
    try {
      const isrcs = await getMonitoredIsrcs(user);
      return isrcs.has(event.isrc);
    } catch {
      // Fail closed on lookup errors
      return false;
    }
  }

  // Unknown role: fail closed
  return false;
}
