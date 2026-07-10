// v2.1.0 — role-based views, improved detection, admin tools
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyCors from "@fastify/cors";
import { prisma } from "./lib/prisma.js";
import { redis } from "./lib/redis.js";
import { bootstrapAdmin } from "./lib/auth.js";
import { startSupervisor } from "./services/supervisor/index.js";
import { startDailyReportWorker } from "./workers/daily-report.js";
import { startChartAlertsWorker } from "./workers/chart-alerts.js";
import { startStationHealthWorker } from "./workers/station-health.js";
import { startRotationAlertsWorker } from "./workers/rotation-alerts.js";
import { startSubscriptionReconcileWorker } from "./workers/subscription-reconcile.js";

const server = Fastify({ logger: true });

// CORS for web app
server.register(fastifyCors, {
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true);
    // Allow localhost, Railway domains, and custom WEB_APP_URL
    const allowed = [
      "http://localhost:3001",
      process.env.WEB_APP_URL || "",
    ];
    if (
      allowed.includes(origin) ||
      origin === "https://hitlist.fm" ||
      origin.endsWith(".hitlist.fm") ||
      origin.endsWith(".railway.app") ||
      origin.endsWith(".up.railway.app")
    ) {
      return cb(null, true);
    }
    return cb(null, false);
  },
  credentials: true,
});

// JWT authentication.
//
// Fail-closed in production: the historic hardcoded fallback must never sign
// real tokens. When NODE_ENV is "production" (and we're not inside the test
// runner) abort startup if JWT_SECRET is missing or still equal to the public
// dev default. Dev/test keep working with the explicit dev secret.
const DEV_JWT_SECRET = "dev-secret-change-me";
const jwtSecret = process.env.JWT_SECRET || DEV_JWT_SECRET;
const underTest = !!process.env.VITEST || process.env.NODE_ENV === "test";

if (
  process.env.NODE_ENV === "production" &&
  !underTest &&
  (!process.env.JWT_SECRET || process.env.JWT_SECRET === DEV_JWT_SECRET)
) {
  throw new Error(
    "JWT_SECRET must be set to a strong, non-default value in production. " +
      "Refusing to start with a missing or default JWT secret.",
  );
}

server.register(fastifyJwt, {
  secret: jwtSecret,
  sign: { expiresIn: "1h" },
});

// Health check -- verifies DB and Redis connections
server.get("/health", async () => {
  const dbOk = await prisma
    .$queryRaw`SELECT 1 as ok`
    .then(() => true)
    .catch(() => false);
  const redisOk = await redis
    .ping()
    .then((r) => r === "PONG")
    .catch(() => false);
  return {
    status: dbOk && redisOk ? "ok" : "degraded",
    db: dbOk ? "connected" : "disconnected",
    redis: redisOk ? "connected" : "disconnected",
  };
});

// Graceful shutdown
const shutdown = async () => {
  await prisma.$disconnect();
  redis.disconnect();
  await server.close();
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

// API v1 routes
server.register(import("./routes/v1/index.js"), { prefix: "/api/v1" });

export { server };

const start = async () => {
  try {
    await server.ready();
    await bootstrapAdmin();
    const port = Number(process.env.PORT) || 3000;
    await server.listen({ port, host: "0.0.0.0" });

    // Start background services -- don't await so the API is ready immediately
    startSupervisor().catch((err) =>
      server.log.error(err, "Supervisor failed to start"),
    );
    startDailyReportWorker().catch((err) =>
      server.log.error(err, "Daily report worker failed to start"),
    );
    startChartAlertsWorker().catch((err) =>
      server.log.error(err, "Chart alerts worker failed to start"),
    );
    startStationHealthWorker().catch((err) =>
      server.log.error(err, "Station health worker failed to start"),
    );
    startRotationAlertsWorker().catch((err) =>
      server.log.error(err, "Rotation alerts worker failed to start"),
    );
    startSubscriptionReconcileWorker().catch((err) =>
      server.log.error(err, "Subscription reconcile worker failed to start"),
    );
  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

// Always start in normal execution — but guard against test imports: tests
// drive the exported `server` through inject()/ready() and must not bind
// ports, bootstrap the admin against a live DB, or spin up background
// workers. Vitest sets VITEST=true (and NODE_ENV=test) for every test file.
if (!process.env.VITEST && process.env.NODE_ENV !== "test") {
  start();
}
