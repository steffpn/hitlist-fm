/**
 * StreamManager - tracks all FFmpeg processes in a Map.
 *
 * Manages the lifecycle of stream recording processes: start, stop, restart.
 * Implements exponential backoff restart on failure and circuit-breaking
 * after 5 consecutive failures (station -> ERROR + admin push).
 *
 * A station only transitions ERROR -> ACTIVE in the DB after a healthy start
 * is confirmed (first valid segment written by the new process) - never as a
 * blind reset at boot.
 */

import type { ChildProcess } from "node:child_process";
import path from "node:path";
import pino from "pino";
import { spawnFFmpeg, DATA_DIR } from "./ffmpeg.js";
import { getLatestSegmentMtime } from "./watchdog.js";
import { notifyAdmins } from "./admin-notify.js";
import { prisma } from "../../lib/prisma.js";

const logger = pino({ name: "supervisor:stream-manager" });

const BASE_BACKOFF_MS = 10_000;
const MAX_RESTARTS = 5;

/** Minimum segment file size to count as a valid segment (matches watchdog). */
const MIN_SEGMENT_BYTES = 1024;
/** Delay between healthy-start confirmation checks. */
const HEALTH_CONFIRM_DELAY_MS = 15_000;
/** How many confirmation checks to attempt before giving up. */
const HEALTH_CONFIRM_MAX_ATTEMPTS = 4;

/**
 * Represents a tracked FFmpeg process for a single station.
 */
export interface StreamProcess {
  stationId: number;
  streamUrl: string;
  process: ChildProcess | null;
  pid: number | null;
  startedAt: Date;
  lastSegmentAt: Date;
  restartCount: number;
  status: "starting" | "recording" | "restarting" | "error";
  backoffTimer: ReturnType<typeof setTimeout> | null;
}

/**
 * Calculate exponential backoff delay.
 * Formula: 10000 * 2^(restartCount-1) => 10s, 20s, 40s, 80s, 160s
 */
function getBackoffDelay(restartCount: number): number {
  return BASE_BACKOFF_MS * Math.pow(2, restartCount - 1);
}

export class StreamManager {
  private streams = new Map<number, StreamProcess>();

  /**
   * Start recording a stream for a station.
   * Creates a StreamProcess entry, spawns FFmpeg, and attaches failure handlers.
   */
  async startStream(stationId: number, streamUrl: string): Promise<void> {
    const now = new Date();
    const entry: StreamProcess = {
      stationId,
      streamUrl,
      process: null,
      pid: null,
      startedAt: now,
      lastSegmentAt: now,
      restartCount: this.streams.get(stationId)?.restartCount ?? 0,
      status: "starting",
      backoffTimer: null,
    };

    this.streams.set(stationId, entry);

    try {
      const proc = await spawnFFmpeg(stationId, streamUrl);
      entry.process = proc;
      entry.pid = proc.pid ?? null;
      entry.status = "recording";

      // Attach close event handler for failure detection
      proc.on("close", (code, signal) => {
        logger.info(
          { stationId, code, signal },
          "FFmpeg process exited",
        );

        // Only handle as failure if stream is still tracked and not being stopped intentionally
        const current = this.streams.get(stationId);
        if (current && current.process === proc) {
          this.handleStreamFailure(stationId);
        }
      });

      // Do NOT mark the station ACTIVE yet: spawning FFmpeg succeeds even for
      // dead stream URLs. The station flips ERROR -> ACTIVE only after the
      // new process writes its first valid segment (confirmed below).
      this.scheduleHealthConfirmation(stationId, proc);

      logger.info({ stationId, pid: entry.pid }, "Stream started");
    } catch (err) {
      logger.error({ stationId, err }, "Failed to spawn FFmpeg");
      entry.status = "error";
    }
  }

  /**
   * Stop recording a stream. Kills the FFmpeg process and removes from tracking.
   */
  async stopStream(stationId: number): Promise<void> {
    const entry = this.streams.get(stationId);
    if (!entry) return;

    // Clear any pending backoff timer
    if (entry.backoffTimer) {
      clearTimeout(entry.backoffTimer);
      entry.backoffTimer = null;
    }

    // Kill the FFmpeg process
    if (entry.process) {
      entry.process.kill("SIGTERM");
    }

    this.streams.delete(stationId);
    logger.info({ stationId }, "Stream stopped");
  }

  /**
   * Restart a stream (explicit restart from API, not a failure).
   * Stops the current stream and starts a new one. Resets restartCount to 0.
   */
  async restartStream(stationId: number): Promise<void> {
    const entry = this.streams.get(stationId);
    if (!entry) return;

    const { streamUrl } = entry;
    await this.stopStream(stationId);
    await this.startStream(stationId, streamUrl);

    // Explicit restart resets the failure counter
    const newEntry = this.streams.get(stationId);
    if (newEntry) {
      newEntry.restartCount = 0;
    }
  }

  /**
   * Handle a stream failure (FFmpeg process exited unexpectedly).
   * Implements exponential backoff and circuit-breaking after MAX_RESTARTS.
   */
  private handleStreamFailure(stationId: number): void {
    const entry = this.streams.get(stationId);
    if (!entry) return;

    entry.restartCount += 1;
    entry.process = null;
    entry.pid = null;

    logger.warn(
      { stationId, restartCount: entry.restartCount },
      "Stream failure detected",
    );

    // Circuit breaker: after 5 failures, mark as error
    if (entry.restartCount >= MAX_RESTARTS) {
      entry.status = "error";
      entry.backoffTimer = null;

      void this.tripCircuitBreaker(stationId, entry.restartCount);

      logger.error(
        { stationId, restartCount: entry.restartCount },
        "Circuit breaker tripped - station marked as ERROR",
      );
      return;
    }

    // Schedule restart with exponential backoff
    entry.status = "restarting";
    const delay = getBackoffDelay(entry.restartCount);

    logger.info(
      { stationId, delay, restartCount: entry.restartCount },
      "Scheduling stream restart with backoff",
    );

    entry.backoffTimer = setTimeout(async () => {
      entry.backoffTimer = null;
      const current = this.streams.get(stationId);
      if (current && current.status === "restarting") {
        try {
          const proc = await spawnFFmpeg(stationId, entry.streamUrl);
          current.process = proc;
          current.pid = proc.pid ?? null;
          current.status = "recording";
          current.startedAt = new Date();

          proc.on("close", (code, signal) => {
            logger.info({ stationId, code, signal }, "FFmpeg process exited");
            const c = this.streams.get(stationId);
            if (c && c.process === proc) {
              this.handleStreamFailure(stationId);
            }
          });

          this.scheduleHealthConfirmation(stationId, proc);

          logger.info(
            { stationId, pid: current.pid },
            "Stream restarted after backoff",
          );
        } catch (err) {
          logger.error({ stationId, err }, "Failed to restart stream");
          this.handleStreamFailure(stationId);
        }
      }
    }, delay);
  }

  /**
   * Persist the circuit-breaker trip (station -> ERROR) and alert admins.
   *
   * Deduplication: the status guard in the WHERE clause means only the
   * transition into ERROR sends a push. If the station was already ERROR
   * (e.g. it tripped in a previous supervisor run and never recovered),
   * updateMany matches 0 rows and no push is sent.
   */
  private async tripCircuitBreaker(
    stationId: number,
    restartCount: number,
  ): Promise<void> {
    try {
      const res = await prisma.station.updateMany({
        where: { id: stationId, status: { not: "ERROR" } },
        data: { status: "ERROR", restartCount },
      });

      if (res.count === 0) {
        // Already ERROR - do not re-notify.
        return;
      }

      const station = await prisma.station.findUnique({
        where: { id: stationId },
        select: { name: true },
      });

      await notifyAdmins({
        title: "Stație căzută",
        body: `Stația ${station?.name ?? `#${stationId}`} a căzut (${MAX_RESTARTS} eșecuri consecutive)`,
        data: { type: "station_down", stationId: String(stationId) },
      });
    } catch (err) {
      logger.error(
        { stationId, err },
        "Failed to update station status to ERROR",
      );
    }
  }

  /**
   * Confirm a healthy stream start: once the newly spawned process writes its
   * first valid segment, flip the station ERROR -> ACTIVE in the DB.
   *
   * Checks up to HEALTH_CONFIRM_MAX_ATTEMPTS times, HEALTH_CONFIRM_DELAY_MS
   * apart, and aborts if the stream was stopped, replaced, or failed in the
   * meantime. Only the ERROR status is overwritten: ACTIVE needs no write,
   * DEGRADED is owned by the station-health worker (ACR callbacks, not the
   * local recorder), and INACTIVE stations should not be resurrected.
   */
  private scheduleHealthConfirmation(
    stationId: number,
    proc: ChildProcess,
  ): void {
    const spawnedAt = Date.now();
    let attempts = 0;

    const check = async (): Promise<void> => {
      attempts += 1;

      const entry = this.streams.get(stationId);
      // Stream stopped, replaced, or already failed -> abandon confirmation
      if (!entry || entry.process !== proc || entry.status !== "recording") {
        return;
      }

      const segmentDir = path.join(DATA_DIR, String(stationId));
      const latestMtime = await getLatestSegmentMtime(
        segmentDir,
        MIN_SEGMENT_BYTES,
      );
      // Require a segment written by THIS process (older segments from a
      // previous run may still be on disk).
      const hasFreshSegment =
        latestMtime !== null && latestMtime.getTime() >= spawnedAt;

      if (hasFreshSegment) {
        const res = await prisma.station.updateMany({
          where: { id: stationId, status: "ERROR" },
          data: { status: "ACTIVE", restartCount: 0 },
        });
        if (res.count > 0) {
          logger.info(
            { stationId },
            "Healthy start confirmed - station recovered ERROR -> ACTIVE",
          );
        }
        return;
      }

      if (attempts < HEALTH_CONFIRM_MAX_ATTEMPTS) {
        const timer = setTimeout(() => {
          check().catch((err) =>
            logger.error({ stationId, err }, "Health confirmation check failed"),
          );
        }, HEALTH_CONFIRM_DELAY_MS);
        timer.unref?.();
      }
    };

    const timer = setTimeout(() => {
      check().catch((err) =>
        logger.error({ stationId, err }, "Health confirmation check failed"),
      );
    }, HEALTH_CONFIRM_DELAY_MS);
    timer.unref?.();
  }

  /**
   * Reset restart count for a station (called by watchdog when stream is healthy).
   * If restartCount > 0, resets to 0 and updates DB.
   */
  async resetRestartCount(stationId: number): Promise<void> {
    const entry = this.streams.get(stationId);
    if (!entry || entry.restartCount === 0) return;

    const previousCount = entry.restartCount;
    entry.restartCount = 0;

    await prisma.station.update({
      where: { id: stationId },
      data: { restartCount: 0 },
    });

    logger.info(
      { stationId, previousCount },
      "Restart count reset - stream recovered",
    );
  }

  /**
   * Get the status of a specific stream.
   */
  getStatus(stationId: number): StreamProcess | undefined {
    return this.streams.get(stationId);
  }

  /**
   * Get all tracked stream statuses.
   */
  getAllStatuses(): StreamProcess[] {
    return Array.from(this.streams.values());
  }

  /**
   * Stop all streams (for graceful shutdown).
   */
  async stopAll(): Promise<void> {
    const stationIds = Array.from(this.streams.keys());
    await Promise.all(stationIds.map((id) => this.stopStream(id)));
    logger.info({ count: stationIds.length }, "All streams stopped");
  }
}
