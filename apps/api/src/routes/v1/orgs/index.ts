import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../../middleware/authenticate.js";
import { getMyOrgs } from "./handlers.js";

/**
 * Organization routes (identity foundation, Phase 2).
 * Registered in v1/index.ts with prefix "/orgs".
 */
const orgsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  // GET /orgs/me - the caller's organizations + entities + membership role
  fastify.get("/me", getMyOrgs);
};

export default orgsRoutes;
