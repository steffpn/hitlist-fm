/**
 * Per-seat billing sync.
 *
 * Some tiers bill per seat on top of the base fee: LABEL bills each roster
 * artist; STATION (network tier) bills per competitor beyond the included
 * allowance (overage). Whenever the roster / competitor set changes we recompute
 * the billable seat count, persist it on the subscription (the source of truth
 * for reconciliation), and push the quantity onto the Stripe subscription item
 * so per-seat is actually charged.
 *
 * No-ops for plans without a per-seat price, so callers can invoke it
 * unconditionally after any add/remove.
 */

import { prisma } from "../../lib/prisma.js";
import { stripe } from "./index.js";
import { validSubscriptionWhere } from "../../lib/entitlements.js";

export async function syncSubscriptionSeats(
  userId: number,
  role: string,
): Promise<void> {
  const sub = await prisma.subscription.findFirst({
    where: { userId, ...validSubscriptionWhere() },
    include: { plan: true },
    orderBy: { createdAt: "desc" },
  });

  // Only per-seat plans need seat tracking; base tiers bill a flat fee.
  if (!sub || sub.plan.perSeatPriceCents <= 0) return;

  let seatCount = 0;
  if (role === "LABEL") {
    // Only roster artists beyond the plan's included allowance are billed as
    // overage — the base fee already covers maxRosterArtists artists.
    const roster = await prisma.labelArtist.count({ where: { labelUserId: userId } });
    seatCount = Math.max(0, roster - sub.plan.maxRosterArtists);
  } else if (role === "STATION") {
    // Only competitors beyond the included allowance are billed as overage.
    const watched = await prisma.watchedStation.count({ where: { userId } });
    seatCount = Math.max(0, watched - sub.plan.maxCompetitorStations);
  } else {
    return;
  }

  if (sub.seatCount !== seatCount) {
    await prisma.subscription.update({
      where: { id: sub.id },
      data: { seatCount },
    });
  }

  // Push the quantity to Stripe (best-effort: local seatCount stays the source
  // of truth and the reconcile worker can re-push on the next run if this fails).
  if (stripe && sub.stripeSubscriptionId) {
    try {
      const stripeSub = await stripe.subscriptions.retrieve(sub.stripeSubscriptionId);
      const item = stripeSub.items.data[0];
      if (item) {
        await stripe.subscriptionItems.update(item.id, {
          quantity: Math.max(1, seatCount),
        });
      }
    } catch (err) {
      console.warn(
        `syncSubscriptionSeats: failed to push ${seatCount} seats to Stripe for user ${userId}`,
        err,
      );
    }
  }
}
