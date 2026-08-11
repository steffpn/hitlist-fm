import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../../middleware/authenticate.js";
import { SongsQuerySchema } from "./schema.js";
import type { SongsQuery } from "./schema.js";
import { listSongs } from "./handlers.js";

const songRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("preHandler", authenticate);

  // GET / - role-scoped song list for the current period
  fastify.get<{ Querystring: SongsQuery }>(
    "/",
    { schema: { querystring: SongsQuerySchema } },
    listSongs,
  );
};

export default songRoutes;
