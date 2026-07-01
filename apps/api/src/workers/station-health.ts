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

async function checkStationHealth(): Promise<void> {
  const stations = await prisma.station.findMany({
    where: { status: { in: ["ACTIVE", "DEGRADED"] } },
    select: { id: true, name: true, status: true, createdAt: true },
  });
  if (stations.length === 0) return;

  const ids = stations.map((s) => s.id);

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
