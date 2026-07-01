import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../../middleware/authenticate.js";
import { CreateCheckoutSchema, CustomerPortalSchema } from "./schema.js";
import {
  mySubscription,
  createCheckout,
  createPortalSession,
} from "./handlers.js";

/**
 * Self-service billing routes — any authenticated user (no requireRole).
 *
 * Lives under /billing (NOT /admin/*) on purpose: the authenticate middleware
 * skips "view as role" impersonation on /api/v1/admin/* routes, so these
 * being here means an ADMIN impersonating a persona sees/acts on the
 * persona's subscription (currentUser = persona).
 *
 * The old /admin/subscriptions/{me,checkout,portal} routes remain registered
 * as deprecated aliases for already-shipped clients.
 */
const billingRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  // Current user's subscription (or their role's free plan)
  fastify.get("/me", mySubscription);

  // Start a Stripe Checkout session for a plan
  fastify.post(
    "/checkout",
    { schema: { body: CreateCheckoutSchema } },
    createCheckout,
  );

  // Open the Stripe Customer Portal
  fastify.post(
    "/portal",
    { schema: { body: CustomerPortalSchema } },
    createPortalSession,
  );
};

export default billingRoutes;
