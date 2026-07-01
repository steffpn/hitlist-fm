import type { FastifyPluginAsync } from "fastify";
import { authenticate } from "../../../middleware/authenticate.js";
import { requireRole } from "../../../middleware/authorize.js";
import { requireFeature } from "../../../middleware/require-feature.js";
import {
  AddWatchedStationBodySchema,
  StationIdParamsSchema,
  PeriodQuerySchema,
} from "./schema.js";
import {
  getWatchedStations,
  getOwnStations,
  addWatchedStation,
  removeWatchedStation,
  getCompetitorSummary,
  getCompetitorDetail,
} from "./handlers.js";

const competitorRoutes: FastifyPluginAsync = async (fastify) => {
  // Plugin-level hooks: authenticate + require STATION or ADMIN role
  fastify.addHook("preHandler", authenticate);
  fastify.addHook("preHandler", requireRole("STATION", "ADMIN"));

  // GET /competitors/watched - List watched competitor stations
  fastify.get(
    "/watched",
    {},
    getWatchedStations,
  );

  // GET /competitors/own - Current user's own station ids (to exclude in picker)
  fastify.get("/own", getOwnStations);

  // POST /competitors/watched - Add a competitor station to watch list
  fastify.post(
    "/watched",
    {
      schema: {
        body: AddWatchedStationBodySchema,
      },
    },
    addWatchedStation,
  );

  // DELETE /competitors/watched/:stationId - Remove a competitor station
  fastify.delete(
    "/watched/:stationId",
    {
      schema: {
        params: StationIdParamsSchema,
      },
    },
    removeWatchedStation,
  );

  // GET /competitors/summary - Summary cards for all watched competitors
  fastify.get(
    "/summary",
    {
      schema: {
        querystring: PeriodQuerySchema,
      },
    },
    getCompetitorSummary,
  );

  // GET /competitors/:stationId/detail - Detailed competitor intelligence (premium)
  fastify.get(
    "/:stationId/detail",
    {
      preHandler: requireFeature("analytics.competitor_intel"),
      schema: {
        params: StationIdParamsSchema,
        querystring: PeriodQuerySchema,
      },
    },
    getCompetitorDetail,
  );
};

export default competitorRoutes;
