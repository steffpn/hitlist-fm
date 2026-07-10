/**
 * Entitlement resolution — the single place that decides which plan actually
 * governs a user right now, and the shared quota/upgrade helpers built on top.
 *
 * Under capped-tier pricing there is NO perpetual free plan: paid tiers run a
 * 14-day trial that MUST expire, and on trial expiry / cancel / downgrade the
 * user falls back to a role-scoped *locked free* plan (all quotas 0, read-only).
 *
 * A subscription grants entitlements iff it is `active`, or `trialing` and still
 * within its trial (`trialEndsAt > now`). Comparing status alone is the historic
 * bug — a `trialing` row whose trial already ended must NOT grant access.
 */

import { prisma } from "./prisma.js";
import { Prisma } from "../../generated/prisma/client.js";
import type { Plan, Feature, PlanFeature } from "../../generated/prisma/client.js";

/** A Plan with its feature rows eagerly loaded. */
export type PlanWithFeatures = Plan & {
  features: (PlanFeature & { feature: Feature })[];
};

/**
 * Master kill-switch for billing enforcement.
 *
 * OFF (the production default until a real payment path exists) keeps the app
 * "la liber": everyone is treated as premium, trials never expire, and quotas
 * are not enforced — so shipping this code to production charges/blocks nobody.
 * Flip ON by setting `BILLING_ENFORCEMENT=on` once StoreKit / Play Billing /
 * Stripe purchase flows are live. Always ON under the test runner so the
 * enforcement test suite stays meaningful.
 */
export function isBillingEnforced(): boolean {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return true;
  return process.env.BILLING_ENFORCEMENT === "on";
}

/**
 * Prisma `where` fragment selecting only subscriptions that currently grant
 * entitlements. Use it everywhere entitlement/features are computed so the
 * "never status alone" rule is enforced in exactly one place.
 */
export function validSubscriptionWhere(
  now: Date = new Date(),
): Prisma.SubscriptionWhereInput {
  return {
    OR: [
      { status: "active" },
      { status: "trialing", trialEndsAt: { gt: now } },
    ],
  };
}

const PLAN_FEATURE_INCLUDE = {
  features: { include: { feature: true } },
} as const;

/**
 * Resolve the plan that actually governs this user right now: their valid
 * subscription's plan, or the role's locked-free fallback if none is valid.
 */
export async function getEffectivePlan(
  userId: number,
  role: string,
): Promise<PlanWithFeatures> {
  // Kill-switch OFF → everyone runs on an open, all-features, unlimited plan.
  if (!isBillingEnforced()) {
    return syntheticUnlimited(role, await allRoleFeatures(role));
  }

  const sub = await prisma.subscription.findFirst({
    where: { userId, ...validSubscriptionWhere() },
    include: { plan: { include: PLAN_FEATURE_INCLUDE } },
    orderBy: { createdAt: "desc" },
  });

  if (sub?.plan) return sub.plan as PlanWithFeatures;
  return getLockedFreePlan(role);
}

/**
 * The role's locked-free plan (tier FREE). Falls back to a synthetic all-zero
 * plan if the free plan is not seeded, so entitlement checks never crash.
 */
export async function getLockedFreePlan(role: string): Promise<PlanWithFeatures> {
  const plan = await prisma.plan.findFirst({
    where: { role, tier: "FREE" },
    include: PLAN_FEATURE_INCLUDE,
    orderBy: { createdAt: "asc" },
  });
  if (plan) return plan as PlanWithFeatures;
  return syntheticLockedFree(role);
}

/** Every feature applicable to a role, as PlanFeature rows (billing OFF). */
async function allRoleFeatures(role: string): Promise<PlanWithFeatures["features"]> {
  const feats = await prisma.feature.findMany({ where: { roles: { has: role } } });
  return feats.map((feature) => ({
    id: -1,
    planId: -2,
    featureId: feature.id,
    feature,
  })) as unknown as PlanWithFeatures["features"];
}

/**
 * Synthetic OPEN plan used when billing enforcement is OFF: PREMIUM tier,
 * unlimited quotas (so no quota check ever trips) and all role features.
 */
function syntheticUnlimited(
  role: string,
  features: PlanWithFeatures["features"],
): PlanWithFeatures {
  const now = new Date();
  return {
    id: -2,
    name: `${role} (open)`,
    slug: `${role.toLowerCase()}-open`,
    role,
    tier: "PREMIUM",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    trialDays: 0,
    perSeatPriceCents: 0,
    perSeatLabel: null,
    maxMonitoredSongs: Number.MAX_SAFE_INTEGER,
    maxRosterArtists: Number.MAX_SAFE_INTEGER,
    maxCompetitorStations: Number.MAX_SAFE_INTEGER,
    maxHistoryDays: 36500,
    stripeMonthlyPriceId: null,
    stripeAnnualPriceId: null,
    stripeProductId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    features,
  };
}

function syntheticLockedFree(role: string): PlanWithFeatures {
  const now = new Date();
  return {
    id: -1,
    name: `${role} (locked)`,
    slug: `${role.toLowerCase()}-free`,
    role,
    tier: "FREE",
    monthlyPriceCents: 0,
    annualPriceCents: 0,
    trialDays: 0,
    perSeatPriceCents: 0,
    perSeatLabel: null,
    maxMonitoredSongs: 0,
    maxRosterArtists: 0,
    maxCompetitorStations: 0,
    maxHistoryDays: 7,
    stripeMonthlyPriceId: null,
    stripeAnnualPriceId: null,
    stripeProductId: null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    features: [],
  };
}

// ─── Upgrade ladder ────────────────────────────────────────────────
// Ordered cheapest → most expensive, mirroring prisma/seed-plans.ts. Used to
// suggest the next tier in quota_exceeded responses.
const UPGRADE_LADDER: Record<string, string[]> = {
  ARTIST: [
    "artist-1", "artist-3", "artist-5", "artist-10",
    "artist-25", "artist-50", "artist-100",
  ],
  LABEL: ["label-indie", "label", "label-group"],
  STATION: ["station-pro", "station-network"],
};

/**
 * Suggested upgrade target for a user currently on `currentSlug`.
 * - locked-free / unknown slug → entry tier
 * - a paid tier → the next tier up (clamped at the top tier)
 */
export function nextUpgradeTier(role: string, currentSlug: string | null): string | null {
  const ladder = UPGRADE_LADDER[role] ?? [];
  if (ladder.length === 0) return null;
  const idx = currentSlug ? ladder.indexOf(currentSlug) : -1;
  if (idx === -1) return ladder[0];
  return ladder[Math.min(idx + 1, ladder.length - 1)];
}

/** Standard 403 payload for a plan quota being hit. */
export function quotaExceededBody(
  featureKey: string,
  limit: number,
  current: number,
  upgradeTier: string | null,
): {
  error: string;
  code: "quota_exceeded";
  featureKey: string;
  limit: number;
  current: number;
  upgradeTier: string | null;
} {
  return {
    error: "Quota exceeded",
    code: "quota_exceeded",
    featureKey,
    limit,
    current,
    upgradeTier,
  };
}

/**
 * Clamp a user-supplied history lower bound to the plan's look-back window:
 * never earlier than `now - maxHistoryDays`. When `from` is omitted the floor
 * itself is returned so the window is always enforced.
 */
export function clampHistoryFrom(
  from: Date | undefined,
  maxHistoryDays: number,
  now: Date = new Date(),
): Date {
  const earliest = new Date(now.getTime() - maxHistoryDays * 24 * 60 * 60 * 1000);
  return from && from > earliest ? from : earliest;
}
