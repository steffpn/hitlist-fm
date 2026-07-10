/**
 * BullMQ detection processing worker.
 *
 * Transforms ACRCloud broadcast monitoring callbacks into Detection records
 * and deduplicates them into AirplayEvent aggregates using multi-layer matching:
 *   1. Exact (full 12-char) ISRC match
 *   2. Exact normalized title+artist match
 *   3. Fuzzy title+artist match (Jaro-Winkler)
 *
 * Dedup NEVER keys on an ISRC substring/prefix: a prefix (e.g. first 9 chars)
 * shares country + registrant + year across a label's whole catalogue, so it
 * collapses DISTINCT recordings into one event. Same-song/different-version
 * merging is handled by the normalized title+artist layers instead, which is
 * what actually varies between an ISRC-less callback and its ISRC'd twin.
 *
 * Uses per-station Redis locks to prevent race conditions during dedup.
 */

import { Worker, Queue } from "bullmq";
import { createRedisConnection } from "../lib/redis.js";
import { redis } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { normalizeTitle, normalizeArtist } from "../lib/normalization.js";
import { filterDetection } from "../lib/false-positive-filter.js";
import { isFuzzyMatch } from "../lib/fuzzy-match.js";
import { lookupArtwork } from "../lib/deezer.js";
import { sendPush } from "../lib/push.js";
import {
  CHANNELS,
  BACKFILL_KEY,
  BACKFILL_MAX,
  type LiveDetectionEvent,
} from "../lib/pubsub.js";
import {
  DETECTION_GAP_TOLERANCE_MS,
  DETECTION_QUEUE,
} from "@hitlist/shared";
import pino from "pino";

const logger = pino({ name: "detection-worker" });

/**
 * Industry-standard minimum play duration (MediaForest uses ~30s).
 *
 * ACRCloud reports `played_duration` (seconds) per callback. Plays shorter
 * than this threshold are treated as teasers/jingles/transitions, not real
 * airplay: they are stored with `partialPlay: true` and excluded from
 * user-facing aggregations. They are NEVER dropped — the Detection row and the
 * AirplayEvent are always written, only flagged, so no play is silently lost.
 *
 * When a callback has no `played_duration`, we assume a full play.
 *
 * ⚠️ UNVERIFIED SEMANTIC: the exact meaning of ACRCloud's `played_duration`
 * (matched-segment length? cumulative airtime? per-callback vs per-detection?)
 * has NOT been confirmed against real production payloads. Until it is, treat
 * `partialPlay` as a best-effort aggregation flag only. It MUST NOT gate
 * anything user-visible beyond report exclusion — e.g. the first-play push is
 * deliberately decoupled from it (see processCallback). Confirm the semantic
 * against captured callbacks before tightening any behaviour that depends on it.
 */
export const MIN_FULL_PLAY_SECONDS = 30;

function isPartialPlay(playedDurationSeconds: number | null): boolean {
  return (
    playedDurationSeconds !== null &&
    playedDurationSeconds < MIN_FULL_PLAY_SECONDS
  );
}

// ---- Module-scope snippet queue reference ----
let _snippetQueue: Queue | null = null;

// ---- Per-station lock ----
const LOCK_TTL_MS = 10_000; // 10s lock TTL

async function acquireStationLock(stationId: number): Promise<boolean> {
  const key = `dedup-lock:${stationId}`;
  const result = await redis.set(key, "1", "PX", LOCK_TTL_MS, "NX");
  return result === "OK";
}

async function releaseStationLock(stationId: number): Promise<void> {
  const key = `dedup-lock:${stationId}`;
  await redis.del(key);
}

async function withStationLock<T>(
  stationId: number,
  fn: () => Promise<T>,
): Promise<T> {
  // Retry acquiring lock up to 50 times (500ms total)
  let acquired = false;
  for (let i = 0; i < 50; i++) {
    acquired = await acquireStationLock(stationId);
    if (acquired) break;
    await new Promise((r) => setTimeout(r, 10));
  }

  if (!acquired) {
    logger.warn({ stationId }, "Failed to acquire station lock after retries");
    // Proceed without lock rather than dropping the detection
  }

  try {
    return await fn();
  } finally {
    if (acquired) {
      await releaseStationLock(stationId);
    }
  }
}

// ---- Types ----

interface AcrCloudMusicResult {
  title: string;
  artists: Array<{ name: string }>;
  album?: { name?: string };
  label?: string;
  duration_ms: number;
  score: number;
  acrid: string;
  external_ids?: {
    isrc?: string | string[];
  };
  external_metadata?: {
    spotify?: { track?: { id?: string } };
    deezer?: { track?: { id?: string; preview?: string } };
    youtube?: { vid?: string };
  };
}

interface AcrCloudCallbackBody {
  stream_id: string;
  stream_url?: string;
  stream_name?: string;
  status: number;
  data: {
    status: { msg: string; code: number; version?: string };
    result_type?: number;
    metadata?: {
      music?: AcrCloudMusicResult[];
      timestamp_utc: string;
      played_duration?: number;
    };
  };
}

// ---- Helpers ----

function normalizeIsrc(
  isrc: string | string[] | undefined | null,
): string | null {
  if (Array.isArray(isrc)) {
    return isrc[0] ?? null;
  }
  if (typeof isrc === "string") {
    return isrc;
  }
  return null;
}

// ---- Artwork caching ----

/**
 * In-memory memo of resolved artwork per track (keyed by ISRC, or normalized
 * title|artist when no ISRC). Caches null results too, so we never hit Deezer
 * twice for the same track — even when it has no artwork there.
 * Capped at ~5000 entries with FIFO eviction (Map preserves insertion order).
 */
const ARTWORK_CACHE_MAX = 5000;
const artworkCache = new Map<string, string | null>();

function cacheArtwork(key: string, url: string | null): void {
  if (!artworkCache.has(key) && artworkCache.size >= ARTWORK_CACHE_MAX) {
    const oldest = artworkCache.keys().next().value;
    if (oldest !== undefined) {
      artworkCache.delete(oldest);
    }
  }
  artworkCache.set(key, url);
}

/**
 * Fire-and-forget artwork resolution for a freshly created AirplayEvent.
 * Order: in-memory memo -> copy from another event with the same ISRC
 * (zero HTTP) -> Deezer ISRC lookup -> Deezer title+artist search.
 * Never throws into the detection pipeline; callers attach a .catch.
 */
async function resolveArtwork(
  eventId: number,
  isrc: string | null,
  title: string,
  artist: string,
): Promise<void> {
  const cacheKey =
    isrc ?? `t:${normalizeTitle(title)}|${normalizeArtist(artist)}`;

  if (artworkCache.has(cacheKey)) {
    const cached = artworkCache.get(cacheKey) ?? null;
    if (cached) {
      await prisma.airplayEvent.update({
        where: { id: eventId },
        data: { artworkUrl: cached },
      });
    }
    return;
  }

  // Reuse artwork already resolved for the same recording (zero HTTP)
  if (isrc) {
    const existing = await prisma.airplayEvent.findFirst({
      where: { isrc, artworkUrl: { not: null }, id: { not: eventId } },
      select: { artworkUrl: true },
    });
    if (existing?.artworkUrl) {
      cacheArtwork(cacheKey, existing.artworkUrl);
      await prisma.airplayEvent.update({
        where: { id: eventId },
        data: { artworkUrl: existing.artworkUrl },
      });
      return;
    }
  }

  const artworkUrl = await lookupArtwork(isrc, title, artist);
  cacheArtwork(cacheKey, artworkUrl);

  if (artworkUrl) {
    await prisma.airplayEvent.update({
      where: { id: eventId },
      data: { artworkUrl },
    });
  }
}

// ---- First-play "ON AIR" push ----

/** Max first-play pushes per user per rolling 24h (Redis counter with TTL). */
export const FIRST_PLAY_DAILY_LIMIT = 5;
const FIRST_PLAY_CAP_TTL_SECONDS = 24 * 60 * 60;

function firstPlayCapKey(userId: number): string {
  return `first-play-cap:${userId}`;
}

/**
 * "Your song is ON AIR" push — sent when a NEW AirplayEvent (not an extension)
 * is created for a monitored ISRC.
 *
 * Intentionally NOT gated on partialPlay: `played_duration` semantics are
 * unverified (see MIN_FULL_PLAY_SECONDS), so a real first play must never be
 * suppressed just because ACRCloud reported a short segment. The push fires on
 * the first NEW event of an isrc+station regardless of partial/full; rule (a)
 * below still guarantees it happens at most once per song per station.
 *
 * Anti-spam rules:
 *  (a) only for the FIRST play of that ISRC on that station (no earlier
 *      AirplayEvent with the same isrc+stationId) — which also covers the
 *      "first play ever" case;
 *  (b) max FIRST_PLAY_DAILY_LIMIT pushes of this type per user per 24h,
 *      enforced with a Redis INCR counter that gets a 24h TTL on first use;
 *  (c) honors UserSettings.firstPlayAlertsEnabled (default true — a missing
 *      settings row means enabled).
 *
 * Recipients: the owning artist of each active MonitoredSong with this ISRC,
 * plus every label user linked through LabelMonitoredSong. Users are
 * de-duplicated so nobody gets two pushes for one play.
 *
 * Fire-and-forget: callers attach .catch — this must never block or fail
 * detection processing.
 */
export async function notifyFirstPlay(params: {
  airplayEventId: number;
  isrc: string;
  songTitle: string;
  stationId: number;
  stationName: string;
}): Promise<void> {
  const { airplayEventId, isrc, songTitle, stationId, stationName } = params;

  // Rule (a): first play of this ISRC on this station. The freshly created
  // event is already in the DB, so exclude it from the lookup.
  const priorOnStation = await prisma.airplayEvent.findFirst({
    where: { isrc, stationId, id: { not: airplayEventId } },
    select: { id: true },
  });
  if (priorOnStation) return;

  // Recipients: artists monitoring this ISRC + their linked label users.
  const monitored = await prisma.monitoredSong.findMany({
    where: { isrc, status: "active" },
    include: {
      user: { include: { deviceTokens: true, settings: true } },
      labelMonitoredSongs: {
        include: {
          labelArtist: {
            include: {
              labelUser: { include: { deviceTokens: true, settings: true } },
            },
          },
        },
      },
    },
  });
  if (monitored.length === 0) return;

  type Recipient = {
    id: number;
    deviceTokens: Array<{ token: string; platform: string }>;
    settings: { firstPlayAlertsEnabled: boolean } | null;
  };

  const recipients = new Map<number, Recipient>();
  for (const ms of monitored) {
    recipients.set(ms.user.id, ms.user);
    for (const lms of ms.labelMonitoredSongs) {
      const labelUser = lms.labelArtist.labelUser;
      recipients.set(labelUser.id, labelUser);
    }
  }

  const payload = {
    title: `🔴 ON AIR: ${songTitle}`,
    body: `${songTitle} rulează acum pe ${stationName}`,
    data: {
      type: "first_play",
      airplayEventId: String(airplayEventId),
      isrc,
    },
  };

  for (const user of recipients.values()) {
    // Rule (c): user setting (missing settings row = enabled by default).
    if (user.settings && user.settings.firstPlayAlertsEnabled === false) {
      continue;
    }
    if (user.deviceTokens.length === 0) continue;

    // Rule (b): daily cap per user (Redis counter, 24h TTL from first push).
    const key = firstPlayCapKey(user.id);
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, FIRST_PLAY_CAP_TTL_SECONDS);
    }
    if (count > FIRST_PLAY_DAILY_LIMIT) {
      logger.debug(
        { userId: user.id, count },
        "First-play push suppressed (daily cap reached)",
      );
      continue;
    }

    for (const dt of user.deviceTokens) {
      await sendPush(dt, payload);
    }
  }
}

// ---- Core Processor ----

export async function processCallback(
  callback: AcrCloudCallbackBody,
): Promise<void> {
  const { stream_id, data } = callback;

  // 1. Station lookup
  const station = await prisma.station.findFirst({
    where: { acrcloudStreamId: stream_id },
  });

  if (!station) {
    logger.warn({ stream_id }, "Unknown ACRCloud stream ID, discarding");
    return;
  }

  // 2. No-match check
  if (data.status.code === 1001 || !data.metadata?.music?.length) {
    await prisma.noMatchCallback.create({
      data: {
        stationId: station.id,
        callbackAt: new Date(data.metadata?.timestamp_utc ?? new Date()),
        statusCode: data.status.code,
      },
    });
    // Still update heartbeat on no-match
    await prisma.station.update({
      where: { id: station.id },
      data: { lastHeartbeat: new Date(data.metadata?.timestamp_utc ?? new Date()) },
    });
    return;
  }

  // 3. Process each music result
  const timestampUtc = data.metadata!.timestamp_utc;
  const detectedAt = new Date(timestampUtc);

  const MIN_CONFIDENCE = 70;

  for (const music of data.metadata!.music!) {
    if (music.score < MIN_CONFIDENCE) {
      logger.debug({ score: music.score, title: music.title }, "Low confidence, skipping");
      continue;
    }

    const artistName = music.artists[0]?.name ?? "Unknown";
    const isrc = normalizeIsrc(music.external_ids?.isrc);

    // --- False positive filter ---
    const filterResult = filterDetection(music.title, artistName, music.score, isrc);
    if (filterResult.filtered) {
      logger.debug(
        { title: music.title, artist: artistName, reason: filterResult.reason },
        "Filtered as false positive",
      );
      continue;
    }

    const confidence = music.score / 100;
    const rawCallbackId = `${stream_id}-${timestampUtc}`;

    const albumTitle = music.album?.name ?? null;
    const label = music.label ?? null;
    const playedDuration = data.metadata?.played_duration ?? null;
    const deezerUrl = music.external_metadata?.deezer?.track?.preview ?? null;
    const spotifyId = music.external_metadata?.spotify?.track?.id ?? null;
    const youtubeId = music.external_metadata?.youtube?.vid ?? null;

    // Insert Detection record
    try {
      await prisma.detection.create({
        data: {
          stationId: station.id,
          detectedAt,
          songTitle: music.title,
          artistName,
          albumTitle: music.album?.name ?? null,
          isrc,
          confidence,
          durationMs: music.duration_ms,
          rawCallbackId,
        },
      });
    } catch (err: unknown) {
      if (
        err instanceof Error &&
        "code" in err &&
        (err as Record<string, unknown>).code === "P2002"
      ) {
        logger.debug({ rawCallbackId }, "Duplicate detection callback, skipping");
        continue;
      }
      throw err;
    }

    // --- Deduplication with per-station lock ---
    await withStationLock(station.id, async () => {
      const cutoff = new Date(detectedAt.getTime() - DETECTION_GAP_TOLERANCE_MS);
      let recentEvent;

      // Layer 1: Exact (full) ISRC match. We require the WHOLE ISRC to be
      // equal — never a prefix/substring. An ISRC prefix (country+registrant+
      // year+partial designation) is shared across a label's catalogue, so
      // matching on it would merge DISTINCT recordings into one event. Songs
      // whose ISRC differs but that are actually the same recording are caught
      // by the normalized title+artist layers below.
      if (isrc) {
        recentEvent = await prisma.airplayEvent.findFirst({
          where: {
            stationId: station.id,
            isrc,
            endedAt: { gte: cutoff },
          },
          orderBy: { endedAt: "desc" },
        });
      }

      // Layer 2: Exact normalized title+artist match
      if (!recentEvent) {
        const normTitle = normalizeTitle(music.title);
        const normArtist = normalizeArtist(artistName);

        const candidates = await prisma.airplayEvent.findMany({
          where: {
            stationId: station.id,
            endedAt: { gte: cutoff },
          },
          orderBy: { endedAt: "desc" },
          take: 10,
        });

        for (const candidate of candidates) {
          const candidateNormTitle = normalizeTitle(candidate.songTitle);
          const candidateNormArtist = normalizeArtist(candidate.artistName);

          // Exact normalized match
          if (normTitle === candidateNormTitle && normArtist === candidateNormArtist) {
            recentEvent = candidate;
            break;
          }
        }

        // Layer 3: Fuzzy title+artist match (Jaro-Winkler)
        if (!recentEvent) {
          for (const candidate of candidates) {
            const candidateNormTitle = normalizeTitle(candidate.songTitle);
            const candidateNormArtist = normalizeArtist(candidate.artistName);

            if (isFuzzyMatch(normTitle, normArtist, candidateNormTitle, candidateNormArtist)) {
              recentEvent = candidate;
              logger.info(
                {
                  incoming: `${music.title} - ${artistName}`,
                  existing: `${candidate.songTitle} - ${candidate.artistName}`,
                },
                "Fuzzy dedup match",
              );
              break;
            }
          }
        }
      }

      if (recentEvent) {
        // Extend existing AirplayEvent
        const updateData: Record<string, unknown> = {
          endedAt: detectedAt,
          playCount: { increment: 1 },
        };

        // Partial-play promotion: an event created from a short segment
        // (< MIN_FULL_PLAY_SECONDS) becomes a full play once we can prove
        // enough airtime. We clear the flag when any of these holds:
        //  - the new segment alone is a full play (or has no played_duration,
        //    which we treat as a full play),
        //  - stored + new played_duration reach the threshold,
        //  - the event's detection span (new endedAt - startedAt) reaches
        //    the threshold (robust even when intermediate segment durations
        //    were not accumulated on the row).
        // The flag is monotonic: once false, it is never set back to true.
        if (recentEvent.partialPlay) {
          const cumulativeSeconds =
            (recentEvent.playedDuration ?? 0) + (playedDuration ?? 0);
          const spanSeconds =
            (detectedAt.getTime() - recentEvent.startedAt.getTime()) / 1000;
          const segmentIsFull = !isPartialPlay(playedDuration);

          if (
            segmentIsFull ||
            cumulativeSeconds >= MIN_FULL_PLAY_SECONDS ||
            spanSeconds >= MIN_FULL_PLAY_SECONDS
          ) {
            updateData.partialPlay = false;
          }
        }

        if (confidence > recentEvent.confidence) {
          updateData.songTitle = music.title;
          updateData.artistName = artistName;
          updateData.confidence = confidence;
          updateData.albumTitle = albumTitle;
          updateData.label = label;
          updateData.playedDuration = playedDuration;
          updateData.deezerUrl = deezerUrl;
          updateData.spotifyId = spotifyId;
          updateData.youtubeId = youtubeId;
        }

        await prisma.airplayEvent.update({
          where: { id: recentEvent.id },
          data: updateData,
        });
      } else {
        // Create new AirplayEvent
        const newEvent = await prisma.airplayEvent.create({
          data: {
            stationId: station.id,
            startedAt: detectedAt,
            endedAt: detectedAt,
            songTitle: music.title,
            artistName,
            isrc,
            playCount: 1,
            confidence,
            albumTitle,
            label,
            playedDuration,
            // Missing played_duration -> assume full play (partialPlay false)
            partialPlay: isPartialPlay(playedDuration),
            deezerUrl,
            spotifyId,
            youtubeId,
          },
        });

        // Fire-and-forget artwork lookup (never blocks detection processing)
        resolveArtwork(newEvent.id, isrc, music.title, artistName).catch(
          (err) => {
            logger.warn(
              { err, airplayEventId: newEvent.id, isrc },
              "Artwork lookup failed",
            );
          },
        );

        // Fire-and-forget "your song is ON AIR" push for monitored ISRCs.
        // Fires for the FIRST new event of this isrc+station regardless of
        // partialPlay: `played_duration` semantics are unverified (see
        // MIN_FULL_PLAY_SECONDS), so we must not suppress a genuine first play
        // just because ACRCloud reported a short segment. notifyFirstPlay still
        // enforces first-per-station, the per-user daily cap and the user
        // opt-out, so this cannot spam.
        if (isrc) {
          notifyFirstPlay({
            airplayEventId: newEvent.id,
            isrc,
            songTitle: newEvent.songTitle,
            stationId: station.id,
            stationName: station.name,
          }).catch((err) => {
            logger.warn(
              { err, airplayEventId: newEvent.id, isrc },
              "First-play push failed",
            );
          });
        }

        // Enqueue snippet extraction (always, unless explicitly disabled)
        if (process.env.SNIPPETS_ENABLED !== "false" && _snippetQueue) {
          try {
            await _snippetQueue.add("extract", {
              airplayEventId: newEvent.id,
              stationId: station.id,
              detectedAt: detectedAt.toISOString(),
            }, {
              attempts: 20,
              backoff: { type: "exponential", delay: 3000 },
            });
          } catch (err) {
            logger.error(
              { airplayEventId: newEvent.id, err },
              "Failed to enqueue snippet extraction job",
            );
          }
        }

        // Publish live detection event
        try {
          const liveEvent: LiveDetectionEvent = {
            id: newEvent.id,
            stationId: newEvent.stationId,
            songTitle: newEvent.songTitle,
            artistName,
            isrc,
            snippetUrl: newEvent.snippetUrl ?? null,
            stationName: station.name,
            startedAt: detectedAt.toISOString(),
            publishedAt: new Date().toISOString(),
          };
          await redis.publish(CHANNELS.DETECTION_NEW, JSON.stringify(liveEvent));
          await redis.zadd(BACKFILL_KEY, newEvent.id, JSON.stringify(liveEvent));
          await redis.zremrangebyrank(BACKFILL_KEY, 0, -(BACKFILL_MAX + 1));
        } catch (err) {
          logger.error(
            { err, airplayEventId: newEvent.id },
            "Failed to publish live detection event",
          );
        }
      }
    });
  }

  // 4. Update station lastHeartbeat
  await prisma.station.update({
    where: { id: station.id },
    data: { lastHeartbeat: detectedAt },
  });
}

// ---- Worker Lifecycle ----

export async function startDetectionWorker(options?: {
  snippetQueue?: Queue;
}): Promise<{
  queue: Queue;
  worker: Worker;
}> {
  _snippetQueue = options?.snippetQueue ?? null;
  const queue = new Queue(DETECTION_QUEUE, {
    connection: createRedisConnection(),
    // Retry policy for detection jobs. processCallback is idempotent
    // (Detection has a unique rawCallbackId + detectedAt, and re-runs re-find
    // the same AirplayEvent), so retries cannot double-count.
    // NOTE: keep in sync with the producer queue in
    // routes/v1/webhooks/acrcloud/index.ts.
    defaultJobOptions: {
      attempts: 5,
      backoff: { type: "exponential", delay: 5000 },
    },
  });

  const worker = new Worker(
    DETECTION_QUEUE,
    async (job) => {
      await processCallback(job.data);
    },
    {
      connection: createRedisConnection(),
      concurrency: 5, // Reduced from 10 — per-station locks serialize same-station work
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 5000 },
    },
  );

  // Dead-letter awareness: distinguish a transient failure that will be
  // retried from a job that has exhausted all attempts. Exhausted jobs are
  // retained in the failed set (removeOnFail keeps the last 5000) so they can
  // be inspected/replayed — that failed set IS the dead-letter queue.
  worker.on("failed", (job, err) => {
    const attemptsMade = job?.attemptsMade ?? 0;
    const maxAttempts = job?.opts?.attempts ?? 1;
    const exhausted = attemptsMade >= maxAttempts;
    logger.error(
      { jobId: job?.id, attemptsMade, maxAttempts, exhausted, err },
      exhausted
        ? "Detection job failed permanently after all retries — DEAD-LETTER (retained in failed set for inspection/replay)"
        : "Detection job failed, will retry",
    );
  });

  logger.info(
    "Detection worker started (concurrency: 5, per-station locks, retries: 5 w/ exponential backoff)",
  );

  return { queue, worker };
}
