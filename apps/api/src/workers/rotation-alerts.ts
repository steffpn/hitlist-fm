/**
 * Rotation Alerts worker — "new song in rotation at a competitor".
 *
 * Daily at 08:00 Europe/Bucharest, for every STATION user with watched
 * stations: finds ISRCs that appeared on a watched station for the FIRST time
 * in the last 24h (no earlier AirplayEvent with that isrc on that station)
 * AND got >= MIN_ROTATION_PLAYS full plays in that window (actual rotation,
 * not a one-off spin). Sends ONE aggregated push per user, e.g.
 * "3 piese noi în rotație la Radio ZU", with data {type:"rotation_alert"}.
 *
 * Honors UserSettings.rotationAlertsEnabled (default true — missing settings
 * row means enabled).
 *
 * Notes:
 * - The >= 2 plays count uses full plays only (partial_play = false).
 * - The "never played before" check considers ANY earlier event on that
 *   station (partial included) so a teaser yesterday + rotation today does
 *   not re-alert as "new".
 */

import { Worker, Queue } from "bullmq";
import pino from "pino";
import { Prisma } from "../../generated/prisma/client.js";
import { createRedisConnection } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { sendPush } from "../lib/push.js";

const logger = pino({ name: "rotation-alerts-worker" });
const QUEUE_NAME = "rotation-alerts";

/** Minimum full plays in the 24h window for a song to count as "in rotation". */
export const MIN_ROTATION_PLAYS = 2;

const WINDOW_MS = 24 * 60 * 60 * 1000;

interface NewRotationRow {
  station_id: number;
  new_songs: bigint | number;
}

export async function processRotationAlerts(now: Date = new Date()): Promise<void> {
  const since = new Date(now.getTime() - WINDOW_MS);

  // STATION users that watch at least one competitor station.
  const users = await prisma.user.findMany({
    where: {
      role: "STATION",
      isActive: true,
      watchedStations: { some: {} },
    },
    include: {
      watchedStations: {
        include: { station: { select: { id: true, name: true } } },
      },
      deviceTokens: true,
      settings: true,
    },
  });
  if (users.length === 0) return;

  const watchedIds = [
    ...new Set(users.flatMap((u) => u.watchedStations.map((ws) => ws.stationId))),
  ];
  if (watchedIds.length === 0) return;

  // One aggregate query for all watched stations: songs whose FIRST event on
  // the station is inside the last 24h and that reached rotation threshold.
  const rows = await prisma.$queryRaw<NewRotationRow[]>(
    Prisma.sql`
      WITH recent AS (
        SELECT station_id, isrc, COUNT(*)::bigint AS plays
        FROM airplay_events
        WHERE station_id IN (${Prisma.join(watchedIds)})
          AND partial_play = false
          AND isrc IS NOT NULL
          AND started_at >= ${since}
        GROUP BY station_id, isrc
        HAVING COUNT(*) >= ${MIN_ROTATION_PLAYS}
      )
      SELECT r.station_id, COUNT(*)::bigint AS new_songs
      FROM recent r
      WHERE NOT EXISTS (
        SELECT 1 FROM airplay_events e
        WHERE e.station_id = r.station_id
          AND e.isrc = r.isrc
          AND e.started_at < ${since}
      )
      GROUP BY r.station_id
    `,
  );

  const newSongsByStation = new Map<number, number>();
  for (const row of rows) {
    newSongsByStation.set(row.station_id, Number(row.new_songs));
  }
  if (newSongsByStation.size === 0) {
    logger.info("No new rotations at watched stations");
    return;
  }

  for (const user of users) {
    if (user.settings && user.settings.rotationAlertsEnabled === false) continue;
    if (user.deviceTokens.length === 0) continue;

    const hits = user.watchedStations
      .map((ws) => ({
        name: ws.station.name,
        count: newSongsByStation.get(ws.stationId) ?? 0,
      }))
      .filter((h) => h.count > 0);
    if (hits.length === 0) continue;

    const totalSongs = hits.reduce((sum, h) => sum + h.count, 0);
    const songsWord = totalSongs === 1 ? "piesă nouă" : "piese noi";
    const body =
      hits.length === 1
        ? `${totalSongs} ${songsWord} în rotație la ${hits[0].name}`
        : `${totalSongs} ${songsWord} în rotație la concurență (${hits
            .map((h) => h.name)
            .join(", ")})`;

    const payload = {
      title: "Rotații noi la concurență",
      body,
      data: { type: "rotation_alert" },
    };

    for (const dt of user.deviceTokens) {
      await sendPush(dt, payload);
    }

    logger.info(
      { userId: user.id, stations: hits.length, songs: totalSongs },
      "Rotation alert sent",
    );
  }
}

// ─── Worker Lifecycle ──────────────────────────────────────────────

export async function startRotationAlertsWorker(): Promise<{
  queue: Queue;
  worker: Worker;
}> {
  const queue = new Queue(QUEUE_NAME, {
    connection: createRedisConnection(),
  });

  // Run daily at 08:00 Europe/Bucharest
  await queue.upsertJobScheduler(
    "rotation-alerts-scheduler",
    { pattern: "0 8 * * *", tz: "Europe/Bucharest" },
    { name: "rotation-alerts", data: {} },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "rotation-alerts") {
        logger.info("Running rotation alerts processing");
        await processRotationAlerts();
        logger.info("Rotation alerts processing complete");
      }
    },
    { connection: createRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Rotation alerts job failed");
  });

  logger.info("Rotation alerts worker started (daily 08:00 Europe/Bucharest)");

  return { queue, worker };
}
