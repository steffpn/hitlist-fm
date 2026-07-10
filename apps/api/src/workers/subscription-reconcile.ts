/**
 * Subscription reconciliation worker.
 *
 * Runs daily and does two things so entitlement state can never silently drift:
 *   1. Expires ended self-serve trials — `trialing` rows past `trialEndsAt` that
 *      never attached a Stripe subscription are flipped to `expired`, so the
 *      user falls back to the locked-free plan (no perpetual free access).
 *   2. Reconciles Stripe-backed rows — pulls the authoritative status from Stripe
 *      for every live subscription, self-healing any webhook that was missed.
 */

import { Worker, Queue } from "bullmq";
import { createRedisConnection } from "../lib/redis.js";
import { prisma } from "../lib/prisma.js";
import { stripe } from "../services/stripe/index.js";
import pino from "pino";

const logger = pino({ name: "subscription-reconcile-worker" });
const QUEUE_NAME = "subscription-reconcile";

export async function reconcileSubscriptions(): Promise<void> {
  const now = new Date();

  // 1. Ended self-serve trials (no Stripe subscription) -> expired.
  const expired = await prisma.subscription.updateMany({
    where: {
      status: "trialing",
      stripeSubscriptionId: null,
      trialEndsAt: { lt: now },
    },
    data: { status: "expired" },
  });
  if (expired.count > 0) {
    logger.info({ count: expired.count }, "Expired ended self-serve trials");
  }

  // 2. Reconcile Stripe-backed subscriptions against Stripe's real status.
  if (!stripe) return;

  const live = await prisma.subscription.findMany({
    where: {
      stripeSubscriptionId: { not: null },
      status: { in: ["trialing", "active", "past_due", "unpaid"] },
    },
    select: { id: true, stripeSubscriptionId: true },
  });

  let reconciled = 0;
  for (const row of live) {
    if (!row.stripeSubscriptionId) continue;
    try {
      const s = await stripe.subscriptions.retrieve(row.stripeSubscriptionId);
      const item = s.items.data[0];
      await prisma.subscription.update({
        where: { id: row.id },
        data: {
          status: s.status,
          cancelAtPeriodEnd: s.cancel_at_period_end,
          trialEndsAt: s.trial_end ? new Date(s.trial_end * 1000) : null,
          currentPeriodStart: item
            ? new Date(item.current_period_start * 1000)
            : null,
          currentPeriodEnd: item
            ? new Date(item.current_period_end * 1000)
            : null,
        },
      });
      reconciled++;
    } catch (err) {
      logger.warn(
        { subscriptionId: row.id, err },
        "Failed to reconcile subscription from Stripe",
      );
    }
  }
  if (reconciled > 0) {
    logger.info({ count: reconciled }, "Reconciled Stripe-backed subscriptions");
  }
}

/**
 * Start the reconciliation worker (daily at 03:15 UTC, off-peak).
 */
export async function startSubscriptionReconcileWorker(): Promise<{
  queue: Queue;
  worker: Worker;
}> {
  const queue = new Queue(QUEUE_NAME, {
    connection: createRedisConnection(),
  });

  await queue.upsertJobScheduler(
    "subscription-reconcile-scheduler",
    { pattern: "15 3 * * *", tz: "UTC" },
    { name: "subscription-reconcile", data: {} },
  );

  const worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      if (job.name === "subscription-reconcile") {
        logger.info("Running subscription reconciliation");
        await reconcileSubscriptions();
        logger.info("Subscription reconciliation complete");
      }
    },
    { connection: createRedisConnection() },
  );

  worker.on("failed", (job, err) => {
    logger.error({ jobId: job?.id, err }, "Subscription reconcile job failed");
  });

  logger.info("Subscription reconcile worker started (daily 03:15 UTC)");

  return { queue, worker };
}
