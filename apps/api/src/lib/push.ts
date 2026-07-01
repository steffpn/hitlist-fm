/**
 * Unified push sender — routes to APNs (iOS) or FCM (Android) by device platform.
 * Deletes the stored token if the provider reports it permanently invalid.
 * Both providers degrade gracefully when their env credentials are absent.
 */

import { Notification, ApnsError } from "apns2";
import pino from "pino";
import { getApnsClient } from "./apns.js";
import { getFcmMessaging } from "./fcm.js";
import { prisma } from "./prisma.js";

const logger = pino({ name: "push" });

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
}

export interface PushTarget {
  token: string;
  platform: string; // "ios" | "android"
}

async function forgetToken(token: string): Promise<void> {
  await prisma.deviceToken.deleteMany({ where: { token } });
}

/** Send one push to one device token, routed by platform. */
export async function sendPush(target: PushTarget, payload: PushPayload): Promise<void> {
  if (target.platform === "android") {
    const fcm = getFcmMessaging();
    if (!fcm) return;
    try {
      await fcm.send({
        token: target.token,
        notification: { title: payload.title, body: payload.body },
        data: payload.data ?? {},
        android: { priority: "high" },
      });
    } catch (err: unknown) {
      const code =
        (err as { errorInfo?: { code?: string }; code?: string })?.errorInfo?.code ??
        (err as { code?: string })?.code;
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token" ||
        code === "messaging/invalid-argument"
      ) {
        await forgetToken(target.token);
        return;
      }
      logger.error({ err }, "FCM send failed");
    }
    return;
  }

  // Default: iOS via APNs.
  const apns = getApnsClient();
  if (!apns) return;
  try {
    const notification = new Notification(target.token, {
      alert: { title: payload.title, body: payload.body },
      data: payload.data ?? {},
    });
    await apns.send(notification);
  } catch (err) {
    if (
      err instanceof ApnsError &&
      (err.reason === "BadDeviceToken" || err.reason === "Unregistered")
    ) {
      await forgetToken(target.token);
      return;
    }
    logger.error({ err }, "APNs send failed");
  }
}
