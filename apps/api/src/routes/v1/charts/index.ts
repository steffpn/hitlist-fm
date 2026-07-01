import type { FastifyPluginAsync } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { AirplayChartQuerySchema, SongIsrcParamsSchema } from "./schema.js";
import type { AirplayChartQuery, SongIsrcParams } from "./schema.js";
import { getAirplayChart, getSongChartHistory } from "./handlers.js";

/**
 * Public chart routes — NO authentication. The plugin is encapsulated, so the
 * per-IP rate limit registered here (60 req/min) applies only to /charts/*.
 */
const chartRoutes: FastifyPluginAsync = async (fastify) => {
  await fastify.register(rateLimit, {
    max: 60,
    timeWindow: 60 * 1000,
  });

  // GET /charts/airplay - public "onair.music Airplay Top"
  fastify.get<{ Querystring: AirplayChartQuery }>(
    "/airplay",
    {
      schema: {
        querystring: AirplayChartQuerySchema,
      },
    },
    getAirplayChart,
  );

  // GET /charts/airplay/song/:isrc - weekly position history (last 12 weeks)
  fastify.get<{ Params: SongIsrcParams }>(
    "/airplay/song/:isrc",
    {
      schema: {
        params: SongIsrcParamsSchema,
      },
    },
    getSongChartHistory,
  );
};

export default chartRoutes;
