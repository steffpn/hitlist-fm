import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Prisma mock ----
const mockUserFindUnique = vi.fn();
const mockStationFindUnique = vi.fn();
const mockStationFindMany = vi.fn();
const mockDetectionGroupBy = vi.fn();
const mockNoMatchGroupBy = vi.fn();
const mockGapFindMany = vi.fn();

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $disconnect: vi.fn().mockResolvedValue(undefined),
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      count: vi.fn().mockResolvedValue(1),
    },
    station: {
      findUnique: (...args: unknown[]) => mockStationFindUnique(...args),
      findMany: (...args: unknown[]) => mockStationFindMany(...args),
    },
    detection: {
      groupBy: (...args: unknown[]) => mockDetectionGroupBy(...args),
    },
    noMatchCallback: {
      groupBy: (...args: unknown[]) => mockNoMatchGroupBy(...args),
    },
    monitoringGap: {
      findMany: (...args: unknown[]) => mockGapFindMany(...args),
    },
    airplayEvent: {
      findUnique: vi.fn(),
    },
  },
}));

// ---- R2 mock ----
vi.mock("../../src/lib/r2.js", () => ({
  getPresignedUrl: vi.fn(),
  r2Client: null,
  uploadToR2: vi.fn(),
}));

// ---- Redis mock ----
vi.mock("../../src/lib/redis.js", () => ({
  createRedisConnection: vi.fn().mockReturnValue({
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  }),
  redis: {
    ping: vi.fn().mockResolvedValue("PONG"),
    disconnect: vi.fn(),
    get: vi.fn().mockResolvedValue(null),
    set: vi.fn().mockResolvedValue("OK"),
  },
}));

// ---- BullMQ mock ----
vi.mock("bullmq", () => ({
  Queue: vi.fn().mockImplementation(() => ({
    add: vi.fn().mockResolvedValue({ id: "mock-job-id" }),
    close: vi.fn().mockResolvedValue(undefined),
  })),
  Worker: vi.fn().mockImplementation(() => ({
    on: vi.fn(),
    close: vi.fn().mockResolvedValue(undefined),
  })),
}));

const mockAdminUser = {
  id: 1,
  email: "admin@test.com",
  name: "Admin",
  role: "ADMIN",
  isActive: true,
  scopes: [],
  subscriptions: [],
};

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

describe("Station coverage transparency", () => {
  let server: Awaited<typeof import("../../src/index.js")>["server"];
  let adminToken: string;
  let computeCoveragePercent: typeof import("../../src/routes/v1/stations/handlers.js").computeCoveragePercent;

  beforeEach(async () => {
    vi.clearAllMocks();

    const mod = await import("../../src/index.js");
    server = mod.server;
    await server.ready();
    ({ computeCoveragePercent } = await import(
      "../../src/routes/v1/stations/handlers.js"
    ));

    adminToken = server.jwt.sign({ sub: mockAdminUser.id });
    mockUserFindUnique.mockResolvedValue(mockAdminUser);
  });

  // ---- Pure coverage math ----

  describe("computeCoveragePercent", () => {
    const now = new Date("2026-07-01T12:00:00.000Z");

    it("returns 100 with no gaps", () => {
      expect(
        computeCoveragePercent([], new Date(now.getTime() - 7 * DAY), now),
      ).toBe(100);
    });

    it("subtracts a closed gap from the window", () => {
      const windowStart = new Date(now.getTime() - 4 * HOUR);
      const gaps = [
        {
          startedAt: new Date(now.getTime() - 2 * HOUR),
          endedAt: new Date(now.getTime() - 1 * HOUR),
        },
      ];
      // 1h downtime of a 4h window -> 75%
      expect(computeCoveragePercent(gaps, windowStart, now)).toBe(75);
    });

    it("counts an open gap (endedAt null) up to now", () => {
      const windowStart = new Date(now.getTime() - 2 * HOUR);
      const gaps = [
        { startedAt: new Date(now.getTime() - 30 * 60 * 1000), endedAt: null },
      ];
      // 0.5h of 2h -> 75%
      expect(computeCoveragePercent(gaps, windowStart, now)).toBe(75);
    });

    it("clamps gaps that started before the window", () => {
      const windowStart = new Date(now.getTime() - 4 * HOUR);
      const gaps = [
        {
          startedAt: new Date(now.getTime() - 10 * HOUR), // long before window
          endedAt: new Date(now.getTime() - 3 * HOUR),
        },
      ];
      // Only 1h inside the window counts -> 75%
      expect(computeCoveragePercent(gaps, windowStart, now)).toBe(75);
    });

    it("merges overlapping gaps so downtime is not double counted", () => {
      const windowStart = new Date(now.getTime() - 6 * HOUR);
      const gaps = [
        {
          startedAt: new Date(now.getTime() - 6 * HOUR),
          endedAt: new Date(now.getTime() - 5 * HOUR),
        },
        {
          startedAt: new Date(now.getTime() - 5.5 * HOUR),
          endedAt: new Date(now.getTime() - 4.5 * HOUR),
        },
      ];
      // Merged interval spans 1.5h of a 6h window -> 75%
      expect(computeCoveragePercent(gaps, windowStart, now)).toBe(75);
    });

    it("never returns less than 0 (window fully gapped)", () => {
      const windowStart = new Date(now.getTime() - 1 * HOUR);
      const gaps = [
        { startedAt: new Date(now.getTime() - 2 * HOUR), endedAt: null },
      ];
      expect(computeCoveragePercent(gaps, windowStart, now)).toBe(0);
    });

    it("rounds to two decimals", () => {
      const windowStart = new Date(now.getTime() - 7 * DAY);
      const gaps = [
        {
          startedAt: new Date(now.getTime() - 1 * DAY),
          endedAt: new Date(now.getTime() - 23 * HOUR),
        },
      ];
      // 1h of 168h = 0.5952...% downtime -> 99.4%
      expect(computeCoveragePercent(gaps, windowStart, now)).toBeCloseTo(99.4, 1);
    });
  });

  // ---- GET /api/v1/stations/:id/coverage ----

  describe("GET /api/v1/stations/:id/coverage", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/stations/1/coverage",
      });
      expect(response.statusCode).toBe(401);
    });

    it("returns 404 for an unknown station", async () => {
      mockStationFindUnique.mockResolvedValue(null);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/stations/999/coverage",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(404);
    });

    it("rejects an out-of-range days value", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/stations/1/coverage?days=0",
        headers: { authorization: `Bearer ${adminToken}` },
      });
      expect(response.statusCode).toBe(400);
    });

    it("computes coveragePercent from the station's gaps and returns them", async () => {
      mockStationFindUnique.mockResolvedValue({ id: 5 });
      const gapStart = new Date(Date.now() - 24 * HOUR);
      const gapEnd = new Date(Date.now() - 12 * HOUR);
      mockGapFindMany.mockResolvedValue([
        { startedAt: gapStart, endedAt: gapEnd, reason: "acr_silent" },
      ]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/stations/5/coverage?days=2",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.stationId).toBe(5);
      expect(body.days).toBe(2);
      // 12h downtime of a 48h window -> 75%
      expect(body.coveragePercent).toBeCloseTo(75, 1);
      expect(body.gaps).toEqual([
        {
          startedAt: gapStart.toISOString(),
          endedAt: gapEnd.toISOString(),
          reason: "acr_silent",
        },
      ]);
    });

    it("treats an open gap as downtime up to now", async () => {
      mockStationFindUnique.mockResolvedValue({ id: 5 });
      mockGapFindMany.mockResolvedValue([
        {
          startedAt: new Date(Date.now() - 12 * HOUR),
          endedAt: null,
          reason: "stream_error",
        },
      ]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/stations/5/coverage?days=1",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      // 12h open gap of a 24h window -> 50%
      expect(body.coveragePercent).toBeCloseTo(50, 1);
      expect(body.gaps[0].endedAt).toBeNull();
      expect(body.gaps[0].reason).toBe("stream_error");
    });

    it("defaults to a 7 day window with 100% coverage when there are no gaps", async () => {
      mockStationFindUnique.mockResolvedValue({ id: 5 });
      mockGapFindMany.mockResolvedValue([]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/stations/5/coverage",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.days).toBe(7);
      expect(body.coveragePercent).toBe(100);
      expect(body.gaps).toEqual([]);
    });
  });

  // ---- GET /api/v1/stations includes coveragePercent7d ----

  describe("GET /api/v1/stations coveragePercent7d", () => {
    it("adds coveragePercent7d per station from one aggregate gap query", async () => {
      mockStationFindMany.mockResolvedValue([
        {
          id: 1,
          name: "Radio A",
          streamUrl: "http://a",
          stationType: "radio",
          acrcloudStreamId: "sa",
          country: "RO",
          status: "ACTIVE",
          lastHeartbeat: null,
          restartCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 2,
          name: "Radio B",
          streamUrl: "http://b",
          stationType: "radio",
          acrcloudStreamId: "sb",
          country: "RO",
          status: "DEGRADED",
          lastHeartbeat: null,
          restartCount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      mockDetectionGroupBy.mockResolvedValue([]);
      mockNoMatchGroupBy.mockResolvedValue([]);
      // Station 2 has an open gap covering half of the 7-day window
      mockGapFindMany.mockResolvedValue([
        {
          stationId: 2,
          startedAt: new Date(Date.now() - 3.5 * DAY),
          endedAt: null,
        },
      ]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/stations",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toHaveLength(2);
      expect(body[0].coveragePercent7d).toBe(100);
      expect(body[1].coveragePercent7d).toBeCloseTo(50, 1);
      expect(mockGapFindMany).toHaveBeenCalledTimes(1);
    });
  });
});
