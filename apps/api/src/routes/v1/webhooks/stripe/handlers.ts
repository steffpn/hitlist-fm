import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../../lib/prisma.js";
import { stripe, STRIPE_WEBHOOK_SECRET } from "../../../../services/stripe/index.js";
import type Stripe from "stripe";

export async function handleStripeWebhook(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  if (!stripe) {
    return reply.status(503).send({ error: "Stripe is not configured" });
  }

  const sig = request.headers["stripe-signature"];
  if (!sig) {
    return reply.status(400).send({ error: "Missing stripe-signature header" });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      request.body as Buffer,
      sig,
      STRIPE_WEBHOOK_SECRET,
    );
  } catch (err) {
    request.log.error(err, "Stripe webhook signature verification failed");
    return reply.status(400).send({ error: "Invalid signature" });
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "customer.subscription.updated":
      await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
      break;

    case "customer.subscription.deleted":
      await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
      break;

    case "invoice.paid":
      await handleInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      request.log.info(`Unhandled Stripe event: ${event.type}`);
  }

  return reply.send({ received: true });
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = Number(session.metadata?.userId);
  const planId = Number(session.metadata?.planId);

  if (!userId || !planId || !stripe) return;

  const stripeSubscription = await stripe.subscriptions.retrieve(
    session.subscription as string,
  );

  const item = stripeSubscription.items.data[0];
  const data = {
    userId,
    planId,
    stripeCustomerId: session.customer as string,
    status: stripeSubscription.status === "trialing" ? "trialing" : "active",
    billingInterval:
      (stripeSubscription.metadata?.billingInterval as string) || "monthly",
    trialEndsAt: stripeSubscription.trial_end
      ? new Date(stripeSubscription.trial_end * 1000)
      : null,
    currentPeriodStart: item
      ? new Date(item.current_period_start * 1000)
      : null,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
  };

  // Never leave two rows: drop the orphan self-serve trial (no Stripe
  // subscription) the user got at signup before attaching the real one.
  await prisma.subscription.deleteMany({
    where: { userId, stripeSubscriptionId: null },
  });

  // Idempotent: keyed on the Stripe subscription id, so a replayed
  // checkout.session.completed updates the same row instead of duplicating it.
  await prisma.subscription.upsert({
    where: { stripeSubscriptionId: stripeSubscription.id },
    create: { ...data, stripeSubscriptionId: stripeSubscription.id },
    update: data,
  });
}

async function handleSubscriptionUpdated(sub: Stripe.Subscription) {
  const item = sub.items.data[0];
  const data = {
    status: sub.status,
    cancelAtPeriodEnd: sub.cancel_at_period_end,
    stripeCustomerId:
      typeof sub.customer === "string" ? sub.customer : sub.customer.id,
    currentPeriodStart: item
      ? new Date(item.current_period_start * 1000)
      : null,
    currentPeriodEnd: item ? new Date(item.current_period_end * 1000) : null,
    trialEndsAt: sub.trial_end ? new Date(sub.trial_end * 1000) : null,
  };

  const existing = await prisma.subscription.findUnique({
    where: { stripeSubscriptionId: sub.id },
  });

  if (existing) {
    await prisma.subscription.update({
      where: { stripeSubscriptionId: sub.id },
      data,
    });
    return;
  }

  // Self-heal a missed checkout webhook: recreate from the Stripe metadata we
  // stamped at checkout. Without userId/planId we can't build a valid row, so
  // we skip (still idempotent — a later event or the reconcile worker fixes it).
  const userId = Number(sub.metadata?.userId);
  const planId = Number(sub.metadata?.planId);
  if (userId && planId) {
    await prisma.subscription.create({
      data: {
        ...data,
        userId,
        planId,
        stripeSubscriptionId: sub.id,
        billingInterval: (sub.metadata?.billingInterval as string) || "monthly",
      },
    });
  }
}

async function handleSubscriptionDeleted(sub: Stripe.Subscription) {
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: sub.id },
    data: { status: "canceled" },
  });
}

/**
 * Extract the subscription id from an invoice.
 *
 * Since Stripe API version 2025-03-31 (and our pinned "2026-02-25.clover"),
 * `invoice.subscription` no longer exists — the reference moved to
 * `invoice.parent.subscription_details.subscription`. The old field would be
 * `undefined` at runtime, silently skipping subscription status updates.
 */
function invoiceSubscriptionId(invoice: Stripe.Invoice): string | undefined {
  const ref = invoice.parent?.subscription_details?.subscription;
  if (!ref) return undefined;
  return typeof ref === "string" ? ref : ref.id;
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (subscriptionId) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "active" },
    });
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const subscriptionId = invoiceSubscriptionId(invoice);
  if (subscriptionId) {
    await prisma.subscription.updateMany({
      where: { stripeSubscriptionId: subscriptionId },
      data: { status: "past_due" },
    });
  }
}
