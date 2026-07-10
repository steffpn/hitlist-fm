import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma.js";
import { getEffectivePlan, clampHistoryFrom } from "../../../lib/entitlements.js";
import type { ReportQuery } from "./schema.js";

/**
 * GET /reports - List user's daily reports.
 */
export async function listReports(
  request: FastifyRequest<{ Querystring: ReportQuery }>,
  reply: FastifyReply,
): Promise<void> {
  const user = request.currentUser;
  const { from, to, limit = 7 } = request.query;

  // Clamp the history window to the user's effective plan: they can never read
  // reports older than `now - plan.maxHistoryDays`, even by supplying `from`.
  const plan = await getEffectivePlan(user.id, user.role);
  const gte = clampHistoryFrom(from ? new Date(from) : undefined, plan.maxHistoryDays);

  const where: Record<string, unknown> = { userId: user.id };
  const reportDate: Record<string, unknown> = { gte };
  if (to) reportDate.lte = new Date(to);
  where.reportDate = reportDate;

  const reports = await prisma.dailyReport.findMany({
    where,
    orderBy: { reportDate: "desc" },
    take: limit,
  });

  return reply.send(reports);
}

/**
 * GET /reports/today - Get today's report for the current user.
 */
export async function todayReport(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const user = request.currentUser;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const report = await prisma.dailyReport.findFirst({
    where: { userId: user.id, reportDate: today, reportType: "daily" },
  });

  if (!report) {
    return reply.send({ report: null, message: "Report not generated yet" });
  }

  return reply.send({ report, message: null });
}
