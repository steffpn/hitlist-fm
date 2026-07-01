import type { FastifyPluginAsync } from "fastify";
import { ExportCSVQuerySchema, ExportPDFQuerySchema } from "./schema.js";
import { exportCSV, exportPDF } from "./handlers.js";
import { authenticate } from "../../../middleware/authenticate.js";
import { requireFeature } from "../../../middleware/require-feature.js";

const exportRoutes: FastifyPluginAsync = async (fastify) => {
  // All export routes require authentication
  fastify.addHook("preHandler", authenticate);

  // GET /csv - Export filtered airplay events as CSV
  fastify.get(
    "/csv",
    {
      schema: {
        querystring: ExportCSVQuerySchema,
      },
    },
    exportCSV,
  );

  // GET /pdf - Export filtered airplay events as branded PDF report (premium)
  fastify.get(
    "/pdf",
    {
      preHandler: requireFeature("exports.pdf"),
      schema: {
        querystring: ExportPDFQuerySchema,
      },
    },
    exportPDF,
  );
};

export default exportRoutes;
