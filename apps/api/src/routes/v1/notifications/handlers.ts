import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../../../lib/prisma.js";
import { addLocalDays, startOfDay } from "../../../lib/period.js";
import type {
  UpdatePreferencesBody,
  RegisterDeviceTokenBody,
  DeleteDeviceTokenBody,
  DigestDetailParams,
  DigestDetailQuery,
} from "./schema.js";

/**
 * GET /notifications/preferences
 *
 * Returns the current user's notification preferences.
 * Wire format (dailyDigestEnabled/weeklyDigestEnabled) is kept for iOS
 * compatibility; values are backed by UserSettings.dailyReportEnabled /
 * weeklyReportEnabled (the single consolidated report system).
 */
export async function getNotificationPreferences(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const settings = await prisma.userSettings.findUnique({
    where: { userId: request.currentUser.id },
    select: {
      dailyReportEnabled: true,
      weeklyReportEnabled: true,
    },
  });

  return reply.send({
    dailyDigestEnabled: settings?.dailyReportEnabled ?? true,
    weeklyDigestEnabled: settings?.weeklyReportEnabled ?? true,
  });
}

/**
 * PUT /notifications/preferences
 *
 * Updates the current user's notification preferences (partial update).
 * Maps dailyDigest -> UserSettings.dailyReportEnabled and
 * weeklyDigest -> UserSettings.weeklyReportEnabled.
 */
export async function updateNotificationPreferences(
  request: FastifyRequest<{ Body: UpdatePreferencesBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { dailyDigestEnabled, weeklyDigestEnabled } = request.body;

  const data: Record<string, boolean> = {};
  if (dailyDigestEnabled !== undefined) data.dailyReportEnabled = dailyDigestEnabled;
  if (weeklyDigestEnabled !== undefined) data.weeklyReportEnabled = weeklyDigestEnabled;

  const updated = await prisma.userSettings.upsert({
    where: { userId: request.currentUser.id },
    update: data,
    create: { userId: request.currentUser.id, ...data },
    select: {
      dailyReportEnabled: true,
      weeklyReportEnabled: true,
    },
  });

  return reply.send({
    dailyDigestEnabled: updated.dailyReportEnabled,
    weeklyDigestEnabled: updated.weeklyReportEnabled,
  });
}

/**
 * GET /notifications/digest/:date?type=daily|weekly
 *
 * Returns the user's stored DailyReport for the given date (YYYY-MM-DD),
 * mapped to the shape the iOS DigestDetailView expects
 * (apps/ios/onairMusic/Models/NotificationModels.swift: DigestDetail/TopItem).
 * Opened when the user taps a daily_digest/weekly_digest push notification.
 */
export async function getDigestDetail(
  request: FastifyRequest<{ Params: DigestDetailParams; Querystring: DigestDetailQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { date } = request.params;
  const reportType = request.query.type === "weekly" ? "weekly" : "daily";

  // Reports are stamped with reportDate at Bucharest midnight (daily-report.ts
  // uses startOfDay()), so the lookup window has to be the same local day. Noon
  // UTC is a safe reference instant: no timezone offset can push it onto a
  // neighbouring calendar date.
  const noon = new Date(`${date}T12:00:00Z`);
  if (Number.isNaN(noon.getTime())) {
    return reply.code(400).send({ error: "Invalid date. Expected YYYY-MM-DD." });
  }
  const dayStart = startOfDay(noon);
  const dayEnd = addLocalDays(dayStart, 1);

  const report = await prisma.dailyReport.findFirst({
    where: {
      userId: request.currentUser.id,
      reportType,
      reportDate: { gte: dayStart, lt: dayEnd },
    },
  });

  if (!report) {
    return reply.code(404).send({
      error: `No ${reportType} report found for ${date}`,
    });
  }

  const content = (report.content ?? {}) as Record<string, unknown>;

  // Map role-specific report content to the DigestDetail shape.
  const rawTopSong = content.topSong as
    | { title?: string; plays?: number; station?: string }
    | null
    | undefined;
  const rawTopArtist = content.topArtist as
    | { name?: string; song?: string; plays?: number; station?: string }
    | null
    | undefined;
  const rawTopStation = content.topStation as
    | { name?: string; plays?: number }
    | null
    | undefined;

  let topSong: { title: string; artist: string | null; name: string | null; count: number } | null = null;
  if (rawTopSong?.title) {
    topSong = {
      title: rawTopSong.title,
      artist: null,
      name: null,
      count: Number(rawTopSong.plays ?? 0),
    };
  } else if (rawTopArtist?.song) {
    topSong = {
      title: rawTopArtist.song,
      artist: rawTopArtist.name ?? null,
      name: null,
      count: Number(rawTopArtist.plays ?? 0),
    };
  }

  let topStation: { title: string; artist: string | null; name: string | null; count: number } | null = null;
  if (rawTopStation?.name) {
    topStation = {
      title: rawTopStation.name,
      artist: null,
      name: rawTopStation.name,
      count: Number(rawTopStation.plays ?? 0),
    };
  } else {
    // Daily reports don't store a dedicated top station; fall back to the
    // station of the top song/artist when available.
    const fallbackStation = rawTopSong?.station || rawTopArtist?.station;
    if (fallbackStation && fallbackStation !== "multiple stations") {
      topStation = {
        title: fallbackStation,
        artist: null,
        name: fallbackStation,
        count: Number(rawTopSong?.plays ?? rawTopArtist?.plays ?? 0),
      };
    }
  }

  return reply.send({
    playCount: Number(content.totalPlays ?? 0),
    topSong,
    topStation,
    weekOverWeekChange:
      reportType === "weekly" ? Number(content.weekOverWeekPercent ?? 0) : null,
    newStationsCount:
      reportType === "weekly" ? Number(content.newStationsCount ?? 0) : null,
  });
}

/**
 * POST /notifications/device-token
 *
 * Registers (or re-assigns) a device push token for the current user.
 */
export async function registerDeviceToken(
  request: FastifyRequest<{ Body: RegisterDeviceTokenBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { token, platform, environment } = request.body;
  const userId = request.currentUser.id;
  const resolvedPlatform = platform || "ios";

  await prisma.deviceToken.upsert({
    where: { token },
    update: { userId, platform: resolvedPlatform, environment: environment || "production" },
    create: { userId, token, platform: resolvedPlatform, environment: environment || "production" },
  });

  return reply.code(201).send({ success: true });
}

/**
 * DELETE /notifications/device-token
 *
 * Removes a device token owned by the current user.
 */
export async function deleteDeviceToken(
  request: FastifyRequest<{ Body: DeleteDeviceTokenBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { token } = request.body;
  const userId = request.currentUser.id;

  await prisma.deviceToken.deleteMany({
    where: { token, userId },
  });

  return reply.code(204).send();
}
