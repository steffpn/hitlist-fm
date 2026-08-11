/**
 * APNS client singleton factory.
 *
 * Lazily initializes an ApnsClient using environment variables.
 * Returns null if required env vars are missing (graceful degradation).
 */

import fs from "node:fs";
import { ApnsClient, Host } from "apns2";
import pino from "pino";

const logger = pino({ name: "apns" });

let client: ApnsClient | null | undefined;
let warnedOnce = false;

/**
 * Get or create the APNS client singleton.
 *
 * Required env vars:
 * - APNS_SIGNING_KEY: the .p8 contents themselves (preferred), or
 *   APNS_SIGNING_KEY_PATH: path to a .p8 file on disk
 * - APNS_KEY_ID: Key ID from Apple Developer Portal
 * - APNS_TEAM_ID: Team ID from Apple Developer Portal
 * - APNS_BUNDLE_ID: App bundle identifier
 * - APNS_HOST: api.push.apple.com or api.sandbox.push.apple.com
 *
 * The inline variant exists because the deploy target has no persistent disk:
 * with only a path, the private signing key would have to be committed to the
 * repository to be readable at runtime, which is not an acceptable trade.
 *
 * @returns ApnsClient or null if env vars are missing
 */
export function getApnsClient(): ApnsClient | null {
  if (client !== undefined) return client;

  const inlineKey = process.env.APNS_SIGNING_KEY;
  const keyPath = process.env.APNS_SIGNING_KEY_PATH;
  const keyId = process.env.APNS_KEY_ID;
  const teamId = process.env.APNS_TEAM_ID;
  const bundleId = process.env.APNS_BUNDLE_ID;
  const host = process.env.APNS_HOST;

  if ((!inlineKey && !keyPath) || !keyId || !teamId || !bundleId) {
    if (!warnedOnce) {
      logger.warn(
        "APNS env vars missing (APNS_SIGNING_KEY or APNS_SIGNING_KEY_PATH, plus APNS_KEY_ID, APNS_TEAM_ID, APNS_BUNDLE_ID). Push notifications disabled.",
      );
      warnedOnce = true;
    }
    client = null;
    return null;
  }

  let signingKey: string;
  if (inlineKey) {
    // Dashboards and shells routinely turn the key's newlines into a literal
    // backslash-n; a PEM without real line breaks fails to parse.
    signingKey = inlineKey.includes("\\n")
      ? inlineKey.replace(/\\n/g, "\n")
      : inlineKey;
  } else {
    try {
      signingKey = fs.readFileSync(keyPath!, "utf8");
    } catch {
      logger.error({ keyPath }, "Failed to read APNS signing key file");
      client = null;
      return null;
    }
  }

  if (!signingKey.includes("BEGIN PRIVATE KEY")) {
    logger.error(
      "APNS signing key is not a PEM private key — check the value was pasted whole.",
    );
    client = null;
    return null;
  }

  client = new ApnsClient({
    team: teamId,
    keyId,
    signingKey,
    defaultTopic: bundleId,
    host: host === "api.sandbox.push.apple.com"
      ? Host.development
      : Host.production,
  });

  logger.info("APNS client initialized");
  return client;
}
