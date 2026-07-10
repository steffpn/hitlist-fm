import type { FastifyRequest, FastifyReply, preHandlerHookHandler } from "fastify";
import { getEffectivePlan } from "../lib/entitlements.js";

/**
 * Factory that returns a preHandler checking if the user's plan includes a feature.
 * Must be used after the authenticate middleware.
 *
 * If the user has an active/trialing subscription, checks their plan's features.
 * If not, falls back to the FREE plan for their role.
 *
 * Usage: fastify.get("/premium-route", { preHandler: requireFeature("artist.detailed_analytics") }, handler)
 */
export function requireFeature(featureKey: string): preHandlerHookHandler {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.currentUser;
    if (!user) {
      reply.code(401).send({ error: "Authentication required" });
      return;
    }

    // Platform admins have no subscription; gating applies to customer roles.
    // "View as role" impersonation is also exempt (product decision): the
    // admin behind the persona must be able to explore every screen without
    // paywalls, on all clients.
    if (user.role === "ADMIN" || request.realUser?.role === "ADMIN") return;

    const hasFeature = await userHasFeature(user.id, user.role, featureKey);
    if (!hasFeature) {
      reply.code(403).send({
        error: "Premium feature",
        message: "Upgrade your plan to access this feature",
        featureKey,
      });
      return;
    }
  };
}

/**
 * Check if a user has access to a feature based on their EFFECTIVE plan
 * (valid subscription, or the role's locked-free fallback if the trial expired /
 * the subscription was canceled). Useful for conditional logic in handlers.
 */
export async function userHasFeature(
  userId: number,
  userRole: string,
  featureKey: string,
): Promise<boolean> {
  const plan = await getEffectivePlan(userId, userRole);
  return plan.features.some((pf) => pf.feature.key === featureKey);
}

/**
 * Get all feature keys for the user's effective plan.
 * Useful for sending the feature list to the client.
 */
export async function getUserFeatures(
  userId: number,
  userRole: string,
): Promise<string[]> {
  const plan = await getEffectivePlan(userId, userRole);
  return plan.features.map((pf) => pf.feature.key);
}
