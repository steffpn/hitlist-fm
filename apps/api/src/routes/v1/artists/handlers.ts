import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma.js";
import { normalizeArtistName } from "../../../lib/artist-name.js";
import type {
  ArtistsSummaryQuery,
  ArtistSearchQuery,
  ClaimArtistParams,
  ClaimArtistBody,
} from "./schema.js";

const PERIOD_DAYS: Record<string, number> = {
  day: 1,
  week: 7,
  month: 30,
};

/**
 * GET /artists/summary?period=day|week|month&limit=50
 *
 * Global artist aggregation computed in Postgres — replaces the client-side
 * hack (iOS/Android) that aggregated artists from at most 250 airplay events.
 * Single GROUP BY over airplay_events in the requested rolling window,
 * served by the (artist_name, started_at) index. Partial plays (teasers /
 * jingles under 30s) are excluded.
 */
export async function getArtistsSummary(
  request: FastifyRequest<{ Querystring: ArtistsSummaryQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const period = request.query.period ?? "week";
  const limit = request.query.limit ?? 50;
  const days = PERIOD_DAYS[period] ?? 7;
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const rows = await prisma.$queryRaw<
    Array<{
      artist_name: string;
      play_count: bigint | number;
      song_count: bigint | number;
      station_count: bigint | number;
      last_play_at: Date;
    }>
  >`
    SELECT
      artist_name,
      COUNT(*)::int AS play_count,
      COUNT(DISTINCT isrc)::int AS song_count,
      COUNT(DISTINCT station_id)::int AS station_count,
      MAX(started_at) AS last_play_at
    FROM airplay_events
    WHERE started_at >= ${since}
      AND partial_play = false
    GROUP BY artist_name
    ORDER BY play_count DESC
    LIMIT ${limit}
  `;

  return reply.send(
    rows.map((r) => ({
      artistName: r.artist_name,
      playCount: Number(r.play_count),
      songCount: Number(r.song_count),
      stationCount: Number(r.station_count),
      lastPlayAt:
        r.last_play_at instanceof Date
          ? r.last_play_at.toISOString()
          : r.last_play_at,
    })),
  );
}

/**
 * GET /artists/search?q= (any authenticated user)
 *
 * Canonical artist lookup so clients can find the entity to claim. The
 * query is folded through normalizeArtistName (same normalization the
 * artists.name_normalized column stores), then matched with `contains`.
 *
 * Response: { artists: [{ id, name, verified }] }
 */
export async function searchArtists(
  request: FastifyRequest<{ Querystring: ArtistSearchQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const normalized = normalizeArtistName(request.query.q);

  if (normalized === "") {
    return reply.send({ artists: [] });
  }

  const artists = await prisma.artist.findMany({
    where: { nameNormalized: { contains: normalized } },
    select: { id: true, name: true, verified: true },
    orderBy: { name: "asc" },
    take: 20,
  });

  return reply.send({ artists });
}

/**
 * POST /artists/:id/claim {evidence?, organizationId?}
 *
 * Files an ArtistClaim (PENDING) for a canonical artist on behalf of one of
 * the caller's organizations. The caller must be OWNER or ADMIN member of
 * that organization; organizationId may be omitted when they hold exactly
 * one such membership. Approval happens in PATCH /admin/artist-claims/:id.
 *
 * 404 unknown artist, 403 no OWNER/ADMIN membership (or not of the given
 * org), 400 ambiguous org, 409 already linked / already pending.
 */
export async function claimArtist(
  request: FastifyRequest<{ Params: ClaimArtistParams; Body: ClaimArtistBody }>,
  reply: FastifyReply,
): Promise<void> {
  const artistId = request.params.id;
  const { evidence, organizationId } = request.body;
  const user = request.currentUser;

  const artist = await prisma.artist.findUnique({ where: { id: artistId } });
  if (!artist) {
    return reply.code(404).send({ error: "Artist not found" });
  }

  // Claiming is an org-level action: only OWNER/ADMIN members qualify.
  const eligibleMemberships = await prisma.membership.findMany({
    where: { userId: user.id, role: { in: ["OWNER", "ADMIN"] } },
  });

  if (eligibleMemberships.length === 0) {
    return reply.code(403).send({
      error: "Requires an OWNER or ADMIN membership of an organization",
    });
  }

  let targetOrgId: number;
  if (organizationId !== undefined) {
    const match = eligibleMemberships.find(
      (m) => m.organizationId === organizationId,
    );
    if (!match) {
      return reply.code(403).send({
        error: "Not an OWNER or ADMIN of the specified organization",
      });
    }
    targetOrgId = organizationId;
  } else if (eligibleMemberships.length === 1) {
    targetOrgId = eligibleMemberships[0].organizationId;
  } else {
    return reply.code(400).send({
      error:
        "Multiple organizations found — specify organizationId in the request body",
    });
  }

  const existingLink = await prisma.orgEntity.findFirst({
    where: { organizationId: targetOrgId, entityType: "ARTIST", artistId },
  });
  if (existingLink) {
    return reply.code(409).send({
      error: "Artist is already linked to this organization",
    });
  }

  const pendingClaim = await prisma.artistClaim.findFirst({
    where: { organizationId: targetOrgId, artistId, status: "PENDING" },
  });
  if (pendingClaim) {
    return reply.code(409).send({
      error: "A claim for this artist is already pending",
    });
  }

  const claim = await prisma.artistClaim.create({
    data: {
      artistId,
      organizationId: targetOrgId,
      requestedById: user.id,
      evidence: evidence ?? null,
      status: "PENDING",
    },
  });

  return reply.code(201).send({
    claim: {
      id: claim.id,
      artistId: claim.artistId,
      organizationId: claim.organizationId,
      requestedById: claim.requestedById,
      evidence: claim.evidence,
      status: claim.status,
      createdAt: claim.createdAt,
    },
  });
}
