import type { FastifyPluginAsync } from "fastify";
import {
  DashboardSummaryQuerySchema,
  TopStationsQuerySchema,
} from "./schema.js";
import type { DashboardSummaryQuery, TopStationsQuery } from "./schema.js";
import { getDashboardSummary, getTopStations } from "./handlers.js";
import { authenticate } from "../../../middleware/authenticate.js";

const dashboardRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /dashboard/summary - Aggregated play counts by period
  fastify.get<{ Querystring: DashboardSummaryQuery }>(
    "/summary",
    {
      preHandler: [authenticate],
      schema: {
        querystring: DashboardSummaryQuerySchema,
      },
    },
    getDashboardSummary,
  );

  // GET /dashboard/top-stations - Ranked station list by play count
  fastify.get<{ Querystring: TopStationsQuery }>(
    "/top-stations",
    {
      preHandler: [authenticate],
      schema: {
        querystring: TopStationsQuerySchema,
      },
    },
    getTopStations,
  );
};

export default dashboardRoutes;
