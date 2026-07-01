import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../../lib/prisma.js";
import type { ListClaimsQuery, ClaimParams, DecideClaimBody } from "./schema.js";

/**
 * GET /admin/artist-claims?status=PENDING|APPROVED|REJECTED
 *
 * Lists claims (newest first), enriched with the artist, the claiming
 * organization and the requesting user. ArtistClaim intentionally has no
 * Prisma relations to Organization/User (spec-exact model), so the names
 * are resolved with two batched lookups instead of includes.
 */
export async function listClaims(
  request: FastifyRequest<{ Querystring: ListClaimsQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const { status } = request.query;

  const claims = await prisma.artistClaim.findMany({
    where: status ? { status } : undefined,
    orderBy: { createdAt: "desc" },
    include: {
      artist: { select: { id: true, name: true, verified: true } },
    },
  });

  const orgIds = [...new Set(claims.map((c) => c.organizationId))];
  const userIds = [
    ...new Set(claims.map((c) => c.requestedById)),
  ];

  const [orgs, users] = await Promise.all([
    prisma.organization.findMany({
      where: { id: { in: orgIds } },
      select: { id: true, name: true, type: true },
    }),
    prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true },
    }),
  ]);

  const orgById = new Map(orgs.map((o) => [o.id, o]));
  const userById = new Map(users.map((u) => [u.id, u]));

  return reply.send({
    claims: claims.map((c) => ({
      id: c.id,
      status: c.status,
      evidence: c.evidence,
      createdAt: c.createdAt,
      decidedAt: c.decidedAt,
      decidedById: c.decidedById,
      artist: c.artist,
      organization: orgById.get(c.organizationId) ?? {
        id: c.organizationId,
        name: null,
        type: null,
      },
      requestedBy: userById.get(c.requestedById) ?? {
        id: c.requestedById,
        name: null,
        email: null,
      },
    })),
  });
}

/**
 * PATCH /admin/artist-claims/:id {status: APPROVED|REJECTED}
 *
 * Decides a PENDING claim. On APPROVED (solid evidence), in one
 * transaction: the OrgEntity link org<->artist is created (skipped if it
 * already exists) and the artist is marked verified=true. On REJECTED only
 * the claim status changes. Decided claims are immutable (409).
 */
export async function decideClaim(
  request: FastifyRequest<{ Params: ClaimParams; Body: DecideClaimBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { id } = request.params;
  const { status } = request.body;

  const claim = await prisma.artistClaim.findUnique({ where: { id } });
  if (!claim) {
    return reply.code(404).send({ error: "Claim not found" });
  }
  if (claim.status !== "PENDING") {
    return reply.code(409).send({ error: "Claim has already been decided" });
  }

  const decidedById = request.currentUser.id;
  const decidedAt = new Date();

  const updated = await prisma.$transaction(async (tx) => {
    if (status === "APPROVED") {
      const existingLink = await tx.orgEntity.findFirst({
        where: {
          organizationId: claim.organizationId,
          entityType: "ARTIST",
          artistId: claim.artistId,
        },
      });

      if (!existingLink) {
        await tx.orgEntity.create({
          data: {
            organizationId: claim.organizationId,
            entityType: "ARTIST",
            artistId: claim.artistId,
          },
        });
      }

      await tx.artist.update({
        where: { id: claim.artistId },
        data: { verified: true },
      });
    }

    return tx.artistClaim.update({
      where: { id },
      data: { status, decidedById, decidedAt },
    });
  });

  return reply.send({
    claim: {
      id: updated.id,
      artistId: updated.artistId,
      organizationId: updated.organizationId,
      status: updated.status,
      decidedById: updated.decidedById,
      decidedAt: updated.decidedAt,
    },
  });
}
