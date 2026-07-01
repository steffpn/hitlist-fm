import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../../middleware/authenticate.js";
import { requireRole } from "../../../middleware/authorize.js";
import {
  ArtistsSummaryQuerySchema,
  ArtistSearchQuerySchema,
  ClaimArtistParamsSchema,
  ClaimArtistBodySchema,
  type ArtistsSummaryQuery,
  type ArtistSearchQuery,
  type ClaimArtistParams,
  type ClaimArtistBody,
} from "./schema.js";
import { getArtistsSummary, searchArtists, claimArtist } from "./handlers.js";

/**
 * Artists routes. Registered in v1/index.ts with prefix "/artists".
 *
 * All routes require authentication; /summary additionally stays
 * ADMIN-only (it powers the admin Artists tab), enforced per-route since
 * /search and /:id/claim (identity foundation) are for any authenticated
 * user. Route generics are pinned at the registration site (see the typing
 * convention in middleware/authenticate.ts) because routes combine schema
 * with preHandler hooks.
 */
const artistsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  // GET /artists/summary - Global per-artist airplay aggregation (admin only)
  fastify.get<{ Querystring: ArtistsSummaryQuery }>(
    "/summary",
    {
      preHandler: [requireRole("ADMIN")],
      schema: {
        querystring: ArtistsSummaryQuerySchema,
      },
    },
    getArtistsSummary,
  );

  // GET /artists/search?q= - Canonical artist lookup (claim flow)
  fastify.get<{ Querystring: ArtistSearchQuery }>(
    "/search",
    {
      schema: {
        querystring: ArtistSearchQuerySchema,
      },
    },
    searchArtists,
  );

  // POST /artists/:id/claim - File an artist claim for the caller's org
  fastify.post<{ Params: ClaimArtistParams; Body: ClaimArtistBody }>(
    "/:id/claim",
    {
      schema: {
        params: ClaimArtistParamsSchema,
        body: ClaimArtistBodySchema,
      },
    },
    claimArtist,
  );
};

export default artistsRoutes;
