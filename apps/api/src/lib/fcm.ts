/**
 * Firebase Cloud Messaging (FCM) client singleton — Android push.
 *
 * Lazily initializes firebase-admin from a service-account credential.
 * Returns null if not configured (graceful degradation, mirrors apns.ts).
 *
 * Required env (one of):
 * - FCM_SERVICE_ACCOUNT_JSON: the service-account JSON as a string
 * - FCM_SERVICE_ACCOUNT_PATH: path to the service-account .json file
 */

import fs from "node:fs";
import admin from "firebase-admin";
import pino from "pino";

const logger = pino({ name: "fcm" });

let messaging: admin.messaging.Messaging | null | undefined;
let warnedOnce = false;

export function getFcmMessaging(): admin.messaging.Messaging | null {
  if (messaging !== undefined) return messaging;

  const json = process.env.FCM_SERVICE_ACCOUNT_JSON;
  const path = process.env.FCM_SERVICE_ACCOUNT_PATH;

  let serviceAccount: admin.ServiceAccount | null = null;
  try {
    if (json) {
      serviceAccount = JSON.parse(json);
    } else if (path) {
      serviceAccount = JSON.parse(fs.readFileSync(path, "utf8"));
    }
  } catch (err) {
    logger.error({ err }, "Failed to parse FCM service account");
    messaging = null;
    return null;
  }

  if (!serviceAccount) {
    if (!warnedOnce) {
      logger.warn(
        "FCM_SERVICE_ACCOUNT_JSON / FCM_SERVICE_ACCOUNT_PATH missing. Android push disabled.",
      );
      warnedOnce = true;
    }
    messaging = null;
    return null;
  }

  try {
    const app = admin.apps.length
      ? admin.app()
      : admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    messaging = admin.messaging(app);
    logger.info("FCM messaging initialized");
    return messaging;
  } catch (err) {
    logger.error({ err }, "Failed to initialize FCM");
    messaging = null;
    return null;
  }
}
