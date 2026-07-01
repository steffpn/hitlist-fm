import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../../../middleware/authenticate.js";
import { requireRole } from "../../../../middleware/authorize.js";
import { ConfigureSchema } from "./schema.js";
import {
  getImpersonationOptions,
  configureImpersonation,
} from "./handlers.js";

const adminImpersonationRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);
  fastify.addHook("preHandler", requireRole("ADMIN"));

  // GET /options - selectable artists (recent, by plays) + stations
  fastify.get("/options", getImpersonationOptions);

  // POST /configure - provision the per-role persona from the selection
  fastify.post(
    "/configure",
    { schema: { body: ConfigureSchema } },
    configureImpersonation,
  );
};

export default adminImpersonationRoutes;
