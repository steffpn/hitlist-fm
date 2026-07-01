import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../../middleware/authenticate.js";
import { requireRole } from "../../../middleware/authorize.js";
import { ArtistsSummaryQuerySchema } from "./schema.js";
import { getArtistsSummary } from "./handlers.js";

/**
 * Global artists aggregation (admin Artists tab).
 * Registered in v1/index.ts with prefix "/artists".
 */
const artistsRoutes: FastifyPluginAsync = async (fastify) => {
  // Admin-only: this powers the admin Artists tab (labels have their own comparison)
  fastify.addHook("preHandler", authenticate);
  fastify.addHook("preHandler", requireRole("ADMIN"));

  // GET /artists/summary - Global per-artist airplay aggregation
  fastify.get(
    "/summary",
    {
      schema: {
        querystring: ArtistsSummaryQuerySchema,
      },
    },
    getArtistsSummary,
  );
};

export default artistsRoutes;
