import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../../../middleware/authenticate.js";
import { requireRole } from "../../../../middleware/authorize.js";
import {
  CreateCheckoutSchema,
  CustomerPortalSchema,
} from "../../billing/schema.js";
import {
  mySubscription,
  createCheckout,
  createPortalSession,
} from "../../billing/handlers.js";
import { listSubscriptions } from "./handlers.js";

const subscriptionRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  // Admin-only: list all subscriptions
  fastify.get(
    "/",
    { preHandler: requireRole("ADMIN") },
    listSubscriptions,
  );

  // ─── DEPRECATED ALIASES ────────────────────────────────────────────────
  // Self-service billing moved to /api/v1/billing/{me,checkout,portal}.
  // These aliases exist only for already-installed clients (iOS app) that
  // still call /admin/subscriptions/*. Same handlers, same behavior — except
  // that /admin/* routes are excluded from "view as role" impersonation, so
  // new clients must use /billing/*. Remove once no shipped client uses them.
  fastify.get("/me", mySubscription);
  fastify.post(
    "/checkout",
    { schema: { body: CreateCheckoutSchema } },
    createCheckout,
  );
  fastify.post(
    "/portal",
    { schema: { body: CustomerPortalSchema } },
    createPortalSession,
  );
};

export default subscriptionRoutes;
