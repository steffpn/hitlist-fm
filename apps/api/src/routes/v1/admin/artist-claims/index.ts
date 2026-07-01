import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../../../middleware/authenticate.js";
import { requireRole } from "../../../../middleware/authorize.js";
import {
  ListClaimsQuerySchema,
  ClaimParamsSchema,
  DecideClaimSchema,
} from "./schema.js";
import { listClaims, decideClaim } from "./handlers.js";

/**
 * Admin review of artist claims (identity foundation, Phase 2).
 * Registered in v1/index.ts with prefix "/admin/artist-claims".
 */
const adminArtistClaimsRoutes: FastifyPluginAsync = async (fastify) => {
  // All routes in this plugin require admin auth
  fastify.addHook("preHandler", authenticate);
  fastify.addHook("preHandler", requireRole("ADMIN"));

  // GET / - List claims, optionally filtered by ?status=
  fastify.get(
    "/",
    {
      schema: {
        querystring: ListClaimsQuerySchema,
      },
    },
    listClaims,
  );

  // PATCH /:id - Approve or reject a pending claim
  fastify.patch(
    "/:id",
    {
      schema: {
        params: ClaimParamsSchema,
        body: DecideClaimSchema,
      },
    },
    decideClaim,
  );
};

export default adminArtistClaimsRoutes;
