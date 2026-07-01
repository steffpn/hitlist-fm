/**
 * Admin push notifications for station health incidents.
 *
 * Sends a push to every active ADMIN user's registered devices via the
 * unified push lib (APNs + FCM). Used by the StreamManager circuit breaker
 * (station ERROR) and the station-health worker (DEGRADED / recovered).
 *
 * Errors are logged and swallowed so a push failure never breaks the
 * supervisor or worker control flow.
 */

import pino from "pino";
import { prisma } from "../../lib/prisma.js";
import { sendPush, type PushPayload } from "../../lib/push.js";

const logger = pino({ name: "supervisor:admin-notify" });

/** Send a push notification to all active ADMIN users with device tokens. */
export async function notifyAdmins(payload: PushPayload): Promise<void> {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN", isActive: true },
      include: { deviceTokens: true },
    });

    let sent = 0;
    for (const admin of admins) {
      for (const dt of admin.deviceTokens) {
        await sendPush(dt, payload);
        sent += 1;
      }
    }

    logger.info(
      { admins: admins.length, devices: sent, title: payload.title },
      "Admin push dispatched",
    );
  } catch (err) {
    logger.error({ err, title: payload.title }, "Failed to notify admins");
  }
}
