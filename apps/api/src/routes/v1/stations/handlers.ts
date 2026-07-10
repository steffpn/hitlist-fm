import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma.js";
import {
  CHANNELS,
  publishStationEvent,
  type StationEvent,
} from "../../../lib/pubsub.js";
import type { CurrentUser } from "../../../middleware/authenticate.js";
import type {
  StationCreateBody,
  StationBulkCreateBody,
  StationUpdateBody,
  StationParams,
  CoverageQuery,
} from "./schema.js";

/**
 * Operational secrets — the raw ingest `streamUrl` and the `acrcloudStreamId` —
 * must not leak to arbitrary authenticated users. They are visible only to
 * ADMINs and to the owner of that specific station (a STATION-scoped user).
 * Every other caller gets these fields stripped from the response.
 */
function canSeeStationSecrets(user: CurrentUser, stationId: number): boolean {
  if (user.role === "ADMIN") return true;
  return user.scopes.some(
    (s) => s.entityType === "STATION" && s.entityId === stationId,
  );
}

/** Remove operational-secret fields from a station-shaped object. */
function stripStationSecrets<
  T extends { streamUrl: unknown; acrcloudStreamId: unknown },
>(station: T): Omit<T, "streamUrl" | "acrcloudStreamId"> {
  const { streamUrl: _streamUrl, acrcloudStreamId: _acrcloudStreamId, ...safe } =
    station;
  return safe;
}

// --- Coverage helpers (monitoring gap math) ---

interface GapInterval {
  startedAt: Date;
  endedAt: Date | null;
}

/**
 * Percentage of the [windowStart, now] window NOT covered by monitoring gaps.
 * Gaps are clamped to the window and merged first, so overlapping/duplicate
 * gap rows never double-count downtime. Result rounded to 2 decimals.
 */
export function computeCoveragePercent(
  gaps: GapInterval[],
  windowStart: Date,
  now: Date,
): number {
  const windowMs = now.getTime() - windowStart.getTime();
  if (windowMs <= 0) return 100;

  // Clamp to window and drop empty intervals
  const clamped = gaps
    .map((g) => ({
      start: Math.max(g.startedAt.getTime(), windowStart.getTime()),
      end: Math.min(g.endedAt?.getTime() ?? now.getTime(), now.getTime()),
    }))
    .filter((g) => g.end > g.start)
    .sort((a, b) => a.start - b.start);

  // Merge overlapping intervals, sum downtime
  let downtimeMs = 0;
  let curStart = -1;
  let curEnd = -1;
  for (const g of clamped) {
    if (curEnd < 0) {
      curStart = g.start;
      curEnd = g.end;
    } else if (g.start <= curEnd) {
      curEnd = Math.max(curEnd, g.end);
    } else {
      downtimeMs += curEnd - curStart;
      curStart = g.start;
      curEnd = g.end;
    }
  }
  if (curEnd >= 0) downtimeMs += curEnd - curStart;

  const percent = (1 - downtimeMs / windowMs) * 100;
  return Math.round(Math.min(100, Math.max(0, percent)) * 100) / 100;
}

/**
 * POST /stations - Create a single station.
 * Sets status to ACTIVE and publishes station:added event.
 */
export async function createStation(
  request: FastifyRequest<{ Body: StationCreateBody }>,
  reply: FastifyReply,
): Promise<void> {
  const station = await prisma.station.create({
    data: {
      name: request.body.name,
      streamUrl: request.body.streamUrl,
      stationType: request.body.stationType,
      acrcloudStreamId: request.body.acrcloudStreamId,
      country: request.body.country ?? "RO",
      status: "ACTIVE",
    },
  });

  const event: StationEvent = {
    stationId: station.id,
    streamUrl: station.streamUrl,
    timestamp: new Date().toISOString(),
  };
  await publishStationEvent(CHANNELS.STATION_ADDED, event);

  return reply.status(201).send(station);
}

/**
 * POST /stations/bulk - Create multiple stations in a transaction.
 * Publishes station:added for each created station.
 */
export async function createStationsBulk(
  request: FastifyRequest<{ Body: StationBulkCreateBody }>,
  reply: FastifyReply,
): Promise<void> {
  const stations = await prisma.$transaction(
    request.body.map((s) =>
      prisma.station.create({
        data: {
          name: s.name,
          streamUrl: s.streamUrl,
          stationType: s.stationType,
          acrcloudStreamId: s.acrcloudStreamId,
          country: s.country ?? "RO",
          status: "ACTIVE",
        },
      }),
    ),
  );

  // Publish events for each created station
  for (const station of stations) {
    const event: StationEvent = {
      stationId: station.id,
      streamUrl: station.streamUrl,
      timestamp: new Date().toISOString(),
    };
    await publishStationEvent(CHANNELS.STATION_ADDED, event);
  }

  return reply.status(201).send(stations);
}

/**
 * GET /stations - List all stations with health fields.
 *
 * Adds lastAcrCallbackAt: the most recent ACRCloud callback per station
 * (max of Detection.detectedAt and NoMatchCallback.callbackAt), computed with
 * two grouped aggregate queries - no per-station N+1. All pre-existing fields
 * keep their exact shape for existing clients.
 *
 * Adds coveragePercent7d: monitoring coverage over the last 7 days from
 * MonitoringGap rows — one aggregate query for all stations (no N+1).
 */
export async function listStations(request: FastifyRequest): Promise<unknown> {
  const stations = await prisma.station.findMany({
    select: {
      id: true,
      name: true,
      streamUrl: true,
      stationType: true,
      acrcloudStreamId: true,
      country: true,
      status: true,
      lastHeartbeat: true,
      restartCount: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (stations.length === 0) return stations;

  const now = new Date();
  const coverageWindowStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const ids = stations.map((s) => s.id);
  const [detectionMax, noMatchMax, gapRows] = await Promise.all([
    prisma.detection.groupBy({
      by: ["stationId"],
      where: { stationId: { in: ids } },
      _max: { detectedAt: true },
    }),
    prisma.noMatchCallback.groupBy({
      by: ["stationId"],
      where: { stationId: { in: ids } },
      _max: { callbackAt: true },
    }),
    // All gaps overlapping the last 7 days, for every station, in one query
    prisma.monitoringGap.findMany({
      where: {
        stationId: { in: ids },
        startedAt: { lt: now },
        OR: [{ endedAt: null }, { endedAt: { gt: coverageWindowStart } }],
      },
      select: { stationId: true, startedAt: true, endedAt: true },
    }),
  ]);

  const gapsByStation = new Map<number, Array<{ startedAt: Date; endedAt: Date | null }>>();
  for (const gap of gapRows) {
    const list = gapsByStation.get(gap.stationId) ?? [];
    list.push({ startedAt: gap.startedAt, endedAt: gap.endedAt });
    gapsByStation.set(gap.stationId, list);
  }

  const lastAcrCallbackByStation = new Map<number, Date>();
  for (const row of detectionMax) {
    if (row._max.detectedAt) {
      lastAcrCallbackByStation.set(row.stationId, row._max.detectedAt);
    }
  }
  for (const row of noMatchMax) {
    const prev = lastAcrCallbackByStation.get(row.stationId);
    if (row._max.callbackAt && (!prev || row._max.callbackAt > prev)) {
      lastAcrCallbackByStation.set(row.stationId, row._max.callbackAt);
    }
  }

  return stations.map((s) => {
    const enriched = {
      ...s,
      lastAcrCallbackAt: lastAcrCallbackByStation.get(s.id) ?? null,
      coveragePercent7d: computeCoveragePercent(
        gapsByStation.get(s.id) ?? [],
        coverageWindowStart,
        now,
      ),
    };
    return canSeeStationSecrets(request.currentUser, s.id)
      ? enriched
      : stripStationSecrets(enriched);
  });
}

/**
 * GET /stations/:id - Get a single station by ID.
 */
export async function getStation(
  request: FastifyRequest<{ Params: StationParams }>,
  reply: FastifyReply,
): Promise<void> {
  const station = await prisma.station.findUnique({
    where: { id: request.params.id },
  });

  if (!station) {
    return reply.status(404).send({ error: "Station not found" });
  }

  if (canSeeStationSecrets(request.currentUser, station.id)) {
    return reply.send(station);
  }
  return reply.send(stripStationSecrets(station));
}

/**
 * GET /stations/:id/coverage?days=7 - Monitoring coverage transparency.
 *
 * Returns the percentage of the last N days during which the station was
 * actually monitored, plus the raw monitoring gaps overlapping the window
 * (as recorded by the station-health worker). Open gaps (endedAt null) count
 * as downtime up to "now".
 */
export async function getStationCoverage(
  request: FastifyRequest<{ Params: StationParams; Querystring: CoverageQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const station = await prisma.station.findUnique({
    where: { id: request.params.id },
    select: { id: true },
  });
  if (!station) {
    return reply.status(404).send({ error: "Station not found" });
  }

  const days = request.query.days ?? 7;
  const now = new Date();
  const windowStart = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

  const gaps = await prisma.monitoringGap.findMany({
    where: {
      stationId: station.id,
      startedAt: { lt: now },
      OR: [{ endedAt: null }, { endedAt: { gt: windowStart } }],
    },
    orderBy: { startedAt: "asc" },
    select: { startedAt: true, endedAt: true, reason: true },
  });

  return reply.send({
    stationId: station.id,
    days,
    coveragePercent: computeCoveragePercent(gaps, windowStart, now),
    gaps: gaps.map((g) => ({
      startedAt: g.startedAt,
      endedAt: g.endedAt,
      reason: g.reason,
    })),
  });
}

/**
 * PATCH /stations/:id - Update a station.
 * Publishes station:updated event with new streamUrl.
 */
export async function updateStation(
  request: FastifyRequest<{ Params: StationParams; Body: StationUpdateBody }>,
  reply: FastifyReply,
): Promise<void> {
  // Check existence first to return 404 properly
  const existing = await prisma.station.findUnique({
    where: { id: request.params.id },
  });

  if (!existing) {
    return reply.status(404).send({ error: "Station not found" });
  }

  const station = await prisma.station.update({
    where: { id: request.params.id },
    data: request.body,
  });

  const event: StationEvent = {
    stationId: station.id,
    streamUrl: station.streamUrl,
    timestamp: new Date().toISOString(),
  };
  await publishStationEvent(CHANNELS.STATION_UPDATED, event);

  return reply.send(station);
}

/**
 * DELETE /stations/:id - Soft delete by setting status to INACTIVE.
 * Publishes station:removed event.
 */
export async function deleteStation(
  request: FastifyRequest<{ Params: StationParams }>,
  reply: FastifyReply,
): Promise<void> {
  const existing = await prisma.station.findUnique({
    where: { id: request.params.id },
  });

  if (!existing) {
    return reply.status(404).send({ error: "Station not found" });
  }

  const station = await prisma.station.update({
    where: { id: request.params.id },
    data: { status: "INACTIVE" },
  });

  const event: StationEvent = {
    stationId: station.id,
    timestamp: new Date().toISOString(),
  };
  await publishStationEvent(CHANNELS.STATION_REMOVED, event);

  return reply.send(station);
}
