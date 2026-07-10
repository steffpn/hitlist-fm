import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma.js";
import { stripe } from "../../../services/stripe/index.js";
import { validSubscriptionWhere } from "../../../lib/entitlements.js";
import type { CreateCheckoutBody, CustomerPortalBody } from "./schema.js";

/**
 * Self-service billing handlers (any authenticated user).
 *
 * All handlers read `request.currentUser`, which under admin "view as role"
 * impersonation is the impersonated persona — so /billing/* reflects and acts
 * on the persona's subscription, not the admin's.
 *
 * Stripe is env-gated: without STRIPE_SECRET_KEY the `stripe` export is null
 * and checkout/portal respond 503 instead of crashing.
 */

/**
 * POST /billing/checkout - Create a Stripe Checkout session.
 * Called by the user (any authenticated user) to start a subscription.
 */
export async function createCheckout(
  request: FastifyRequest<{ Body: CreateCheckoutBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { planId, billingInterval, successUrl, cancelUrl } = request.body;
  const user = request.currentUser;

  const plan = await prisma.plan.findUnique({ where: { id: planId } });
  if (!plan) {
    return reply.status(404).send({ error: "Plan not found" });
  }

  if (plan.role !== user.role) {
    return reply.status(400).send({ error: "Plan does not match your role" });
  }

  if (!stripe) {
    return reply.status(503).send({ error: "Billing not configured" });
  }

  // Guard against a second Stripe subscription: if the user already has a VALID
  // (active/trialing-not-expired) Stripe-backed subscription, send them to the
  // billing portal to change plans instead of creating a duplicate. The signup
  // trial row has no stripeSubscriptionId, so a fresh user still reaches checkout.
  const existingValid = await prisma.subscription.findFirst({
    where: {
      userId: user.id,
      stripeSubscriptionId: { not: null },
      ...validSubscriptionWhere(),
    },
    orderBy: { createdAt: "desc" },
  });

  if (existingValid?.stripeCustomerId) {
    const portal = await stripe.billingPortal.sessions.create({
      customer: existingValid.stripeCustomerId,
      return_url: cancelUrl,
    });
    return reply.send({ checkoutUrl: portal.url, portal: true });
  }

  // Find or create Stripe customer
  let subscription = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  let customerId = subscription?.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: user.email,
      name: user.name,
      metadata: { userId: String(user.id), role: user.role },
    });
    customerId = customer.id;
  }

  const priceId =
    billingInterval === "annual" ? plan.stripeAnnualPriceId : plan.stripeMonthlyPriceId;

  if (!priceId) {
    return reply.status(400).send({ error: "Stripe price not configured for this plan/interval" });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    subscription_data: {
      // Grant Stripe's trial ONLY to a user who has never had a subscription
      // row. A returning/converting user already consumed the signup trial, so
      // stacking another trial here would hand out ~28 days of free premium.
      trial_period_days:
        !subscription && plan.trialDays > 0 ? plan.trialDays : undefined,
      metadata: {
        userId: String(user.id),
        planId: String(plan.id),
        billingInterval,
      },
    },
    metadata: {
      userId: String(user.id),
      planId: String(plan.id),
    },
  });

  return reply.send({ checkoutUrl: session.url });
}

/**
 * POST /billing/portal - Create a Stripe Customer Portal session.
 */
export async function createPortalSession(
  request: FastifyRequest<{ Body: CustomerPortalBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { returnUrl } = request.body;
  const user = request.currentUser;

  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription?.stripeCustomerId) {
    return reply.status(404).send({ error: "No billing account found" });
  }

  if (!stripe) {
    return reply.status(503).send({ error: "Billing not configured" });
  }

  const session = await stripe.billingPortal.sessions.create({
    customer: subscription.stripeCustomerId,
    return_url: returnUrl,
  });

  return reply.send({ portalUrl: session.url });
}

/**
 * GET /billing/me - Get current user's subscription.
 */
export async function mySubscription(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.currentUser;

  const subscription = await prisma.subscription.findFirst({
    where: { userId: user.id, ...validSubscriptionWhere() },
    include: {
      plan: {
        include: {
          features: { include: { feature: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!subscription) {
    // No valid subscription (never subscribed, or trial expired / canceled):
    // fall back to the role's locked-free plan.
    const freePlan = await prisma.plan.findFirst({
      where: { role: user.role, tier: "FREE", isActive: true },
      include: {
        features: { include: { feature: true } },
      },
    });

    return reply.send({
      subscription: null,
      plan: freePlan,
      features: freePlan?.features.map((pf) => pf.feature.key) || [],
    });
  }

  return reply.send({
    subscription: {
      id: subscription.id,
      status: subscription.status,
      billingInterval: subscription.billingInterval,
      trialEndsAt: subscription.trialEndsAt,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
      seatCount: subscription.seatCount,
    },
    plan: {
      id: subscription.plan.id,
      name: subscription.plan.name,
      slug: subscription.plan.slug,
      tier: subscription.plan.tier,
    },
    features: subscription.plan.features.map((pf) => pf.feature.key),
  });
}
