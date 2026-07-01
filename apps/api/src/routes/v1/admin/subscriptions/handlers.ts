import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../../lib/prisma.js";

/**
 * GET /admin/subscriptions - List all subscriptions.
 *
 * Self-service handlers (me/checkout/portal) moved to ../../billing/ —
 * this module now only holds admin-scoped subscription management.
 */
export async function listSubscriptions(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const subs = await prisma.subscription.findMany({
    include: {
      user: { select: { id: true, email: true, name: true, role: true } },
      plan: { select: { id: true, name: true, slug: true, role: true, tier: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return reply.send(subs);
}
