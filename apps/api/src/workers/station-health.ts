/**
 * Station Health worker.
 *
 * Every 5 minutes, checks each ACTIVE station's most recent ACRCloud callback:
 * max(Detection.detectedAt, NoMatchCallback.callbackAt). The local recorder
 * feeding lastHeartbeat can be perfectly healthy while ACRCloud detection is
 * dead - this worker catches exactly that case.
 *
 * Transitions (the status transition itself is the push dedup - a station
 * that stays DEGRADED is not re-notified on every run):
 * - ACTIVE + last callback older than 20 min  -> DEGRADED + admin push (once)
 * - DEGRADED + fresh callback seen again      -> ACTIVE   + admin push (once)
 *
 * ERROR stations (stream down entirely, owned by the StreamManager circuit
 * breaker) and INACTIVE stations are ignored here.
 *
 * Coverage transparency (additive, does not change the transitions above):
 * the worker also maintains MonitoringGap rows. A gap opens when a station
 * leaves ACTIVE (DEGRADED -> reason "acr_silent", opened at the last known
 * callback so the silent stretch is counted; ERROR -> reason "stream_error")
 * and closes when the station is ACTIVE again — including recoveries done
 * elsewhere (circuit breaker / admin), since every run reconciles open gaps
 * against the station's current status.
 */

import { Worker, Queue } from "bullmq";
import pino from "pino";
import { createRedisConnection } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { notifyAdmins } from "../services/supervisor/admin-notify.js";

const logger = pino({ name: "station-health-worker" });
const QUEUE_NAME = "station-health";

/** A station is considered degraded when no ACR callback arrived for this long. */
const STALE_CALLBACK_MS = 20 * 60 * 1000;

// ─── Monitoring gap bookkeeping (coverage transparency) ────────────

type GapReason = "stream_error" | "acr_silent";

async function ensureOpenGap(
  stationId: number,
  openGapByStation: Map<number, { id: number; reason: string }>,
  reason: GapReason,
  startedAt: Date,
): Promise<void> {
  if (openGapByStation.has(stationId)) return;
  const gap = await prisma.monitoringGap.create({
    data: { stationId, startedAt, reason },
  });
  openGapByStation.set(stationId, { id: gap.id, reason });
  logger.info({ stationId, reason, startedAt }, "Monitoring gap opened");
}

async function closeOpenGap(
  stationId: number,
  openGapByStation: Map<number, { id: number; reason: string }>,
  endedAt: Date,
): Promise<void> {
  const open = openGapByStation.get(stationId);
  if (!open) return;
  await prisma.monitoringGap.updateMany({
    where: { stationId, endedAt: null },
    data: { endedAt },
  });
  openGapByStation.delete(stationId);
  logger.info({ stationId, reason: open.reason, endedAt }, "Monitoring gap closed");
}

async function checkStationHealth(): Promise<void> {
  // ERROR stations are included only for monitoring-gap bookkeeping; the
  // health transitions below still only touch ACTIVE/DEGRADED stations.
  const stations = await prisma.station.findMany({
    where: { status: { in: ["ACTIVE", "DEGRADED", "ERROR"] } },
    select: { id: true, name: true, status: true, createdAt: true },
  });
  if (stations.length === 0) return;

  const ids = stations.map((s) => s.id);

  // Open gaps for all inspected stations in one query (at most one open gap
  // per station is ever created by this worker).
  const openGaps = await prisma.monitoringGap.findMany({
    where: { stationId: { in: ids }, endedAt: null },
    select: { id: true, stationId: true, reason: true },
  });
  const openGapByStation = new Map<number, { id: number; reason: string }>();
  for (const gap of openGaps) {
    openGapByStation.set(gap.stationId, { id: gap.id, reason: gap.reason });
  }

  // Last ACR callback per station via two grouped aggregates (no N+1).
  const [detectionMax, noMatchMax] = await Promise.all([
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
  ]);

  const lastCallbackByStation = new Map<number, Date>();
  for (const row of detectionMax) {
    if (row._max.detectedAt) {
      lastCallbackByStation.set(row.stationId, row._max.detectedAt);
    }
  }
  for (const row of noMatchMax) {
    const prev = lastCallbackByStation.get(row.stationId);
    if (row._max.callbackAt && (!prev || row._max.callbackAt > prev)) {
      lastCallbackByStation.set(row.stationId, row._max.callbackAt);
    }
  }

  const now = Date.now();

  for (const station of stations) {
    const lastCallback = lastCallbackByStation.get(station.id) ?? null;
    const isStale =
      !lastCallback || now - lastCallback.getTime() > STALE_CALLBACK_MS;

    // Status after this run's transition (used for gap reconciliation below).
    let effectiveStatus = station.status;

    if (station.status === "ACTIVE" && isStale) {
      // Grace period: a recently created station with no callbacks yet is
      // still warming up, not degraded.
      if (!lastCallback && now - station.createdAt.getTime() < STALE_CALLBACK_MS) {
        continue;
      }

      // Push dedup: the status guard in WHERE means only the run that flips
      // ACTIVE -> DEGRADED notifies. It also protects against races with the
      // circuit breaker (which may have set ERROR in the meantime).
      const res = await prisma.station.updateMany({
        where: { id: station.id, status: "ACTIVE" },
        data: { status: "DEGRADED" },
      });

      if (res.count > 0) {
        effectiveStatus = "DEGRADED";
        const minutes = lastCallback
          ? Math.round((now - lastCallback.getTime()) / 60_000)
          : null;
        logger.warn(
          { stationId: station.id, lastCallback },
          "Station DEGRADED - no recent ACRCloud callbacks",
        );
        await notifyAdmins({
          title: "Stație degradată",
          body:
            minutes !== null
              ? `Stația ${station.name} nu a mai primit callback-uri ACRCloud de ${minutes} minute (recorder-ul local merge)`
              : `Stația ${station.name} nu a primit niciun callback ACRCloud`,
          data: { type: "station_degraded", stationId: String(station.id) },
        });
      }
    } else if (station.status === "DEGRADED" && !isStale) {
      const res = await prisma.station.updateMany({
        where: { id: station.id, status: "DEGRADED" },
        data: { status: "ACTIVE" },
      });

      if (res.count > 0) {
        effectiveStatus = "ACTIVE";
        logger.info(
          { stationId: station.id, lastCallback },
          "Station recovered - ACRCloud callbacks resumed",
        );
        await notifyAdmins({
          title: "Stație recuperată",
          body: `Stația ${station.name} și-a revenit — callback-urile ACRCloud s-au reluat`,
          data: { type: "station_recovered", stationId: String(station.id) },
        });
      }
    }

    // ── Gap reconciliation (additive; never alters statuses/notifications).
    // DEGRADED: open an "acr_silent" gap anchored at the last known callback
    //   (the silence started then, not when we noticed it).
    // ERROR: open a "stream_error" gap (owned by the circuit breaker; we just
    //   record it) from this run's timestamp.
    // ACTIVE: close any open gap — also covers recoveries performed outside
    //   this worker (circuit breaker / admin flipping ERROR back to ACTIVE).
    if (effectiveStatus === "DEGRADED") {
      await ensureOpenGap(
        station.id,
        openGapByStation,
        "acr_silent",
        lastCallback ?? new Date(now),
      );
    } else if (effectiveStatus === "ERROR") {
      await ensureOpenGap(
        station.id,
        openGapByStation,
        "stream_error",
        new Date(now),
      );
    } else if (effectiveStatus === "ACTIVE") {
      await closeOpenGap(station.id, openGapByStation, new Date(now));
    }
  }
}

// ─── Worker Lifecycle ──────────────────────────────────────────────

export async function startStationHealthWorker(): Promise<{
  queue: Queue;
  worker: Worker;
}> {
  const queue = new Queue(QUEUE_NAME, {
    connection: createRedisConnection(),
  });

  // Run every 5 minutes
  await queue.upsertJobScheduler(
    "station-health-scheduler",
    { pattern: "*/5 * * * *", tz: "UTC" },
    { name: "station-health", data: {} },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "station-health") {
        logger.info("Running station health check");
        await checkStationHealth();
        logger.info("Station health check complete");
      }
    },
    { connection: createRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Station health job failed");
  });

  logger.info("Station health worker started (every 5 minutes)");

  return { queue, worker };
}
