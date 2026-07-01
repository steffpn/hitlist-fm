import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma.js";

/**
 * GET /orgs/me
 *
 * The caller's organizations (via memberships) with their entities — the
 * data source for the future org switcher in clients. Reads
 * request.currentUser, so admin "view as role" impersonation shows the
 * persona's organizations, consistent with every other data route.
 *
 * Response:
 * {
 *   organizations: [{
 *     id, name, type,
 *     role,                       // the caller's membership role in this org
 *     entities: [{
 *       id, entityType,           // "ARTIST" | "STATION"
 *       artist:  { id, name, verified } | null,
 *       station: { id, name } | null
 *     }]
 *   }]
 * }
 */
export async function getMyOrgs(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const memberships = await prisma.membership.findMany({
    where: { userId: request.currentUser.id },
    orderBy: { createdAt: "asc" },
    include: {
      organization: {
        include: {
          entities: {
            orderBy: { id: "asc" },
            include: {
              artist: { select: { id: true, name: true, verified: true } },
              station: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  return reply.send({
    organizations: memberships.map((m) => ({
      id: m.organization.id,
      name: m.organization.name,
      type: m.organization.type,
      role: m.role,
      entities: m.organization.entities.map((e) => ({
        id: e.id,
        entityType: e.entityType,
        artist: e.artist
          ? { id: e.artist.id, name: e.artist.name, verified: e.artist.verified }
          : null,
        station: e.station ? { id: e.station.id, name: e.station.name } : null,
      })),
    })),
  });
}
