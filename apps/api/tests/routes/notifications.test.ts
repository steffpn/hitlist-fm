import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Prisma mock ----
const mockQueryRaw = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserSettingsFindUnique = vi.fn();
const mockUserSettingsUpsert = vi.fn();
const mockDailyReportFindFirst = vi.fn();
const mockDeviceTokenUpsert = vi.fn();
const mockDeviceTokenDeleteMany = vi.fn();

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      count: vi.fn().mockResolvedValue(1),
    },
    userSettings: {
      findUnique: (...args: unknown[]) => mockUserSettingsFindUnique(...args),
      upsert: (...args: unknown[]) => mockUserSettingsUpsert(...args),
    },
    dailyReport: {
      findFirst: (...args: unknown[]) => mockDailyReportFindFirst(...args),
    },
    deviceToken: {
      upsert: (...args: unknown[]) => mockDeviceTokenUpsert(...args),
      deleteMany: (...args: unknown[]) => mockDeviceTokenDeleteMany(...args),
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
  },
}));

// ---- Auth mock helper ----
const mockUser = {
  id: 1,
  email: "user@test.com",
  name: "Test User",
  role: "ADMIN",
  isActive: true,
  scopes: [{ id: 1, userId: 1, entityType: "STATION", entityId: 1 }],
  subscriptions: [],
};

describe("Notification Routes", () => {
  let server: Awaited<typeof import("../../src/index.js")>["server"];
  let authToken: string;

  beforeEach(async () => {
    mockQueryRaw.mockClear();
    mockUserFindUnique.mockClear();
    mockUserSettingsFindUnique.mockClear();
    mockUserSettingsUpsert.mockClear();
    mockDailyReportFindFirst.mockClear();
    mockDeviceTokenUpsert.mockClear();
    mockDeviceTokenDeleteMany.mockClear();

    const mod = await import("../../src/index.js");
    server = mod.server;
    await server.ready();

    authToken = server.jwt.sign({ sub: mockUser.id });

    // Mock user lookup for authenticate middleware
    mockUserFindUnique.mockImplementation(({ where }: { where: { id: number } }) => {
      if (where.id === mockUser.id) return Promise.resolve(mockUser);
      return Promise.resolve(null);
    });
  });

  // --- GET /api/v1/notifications/preferences ---

  describe("GET /api/v1/notifications/preferences", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/notifications/preferences",
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns defaults (both true) when the user has no settings row", async () => {
      mockUserSettingsFindUnique.mockResolvedValueOnce(null);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/notifications/preferences",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        dailyDigestEnabled: true,
        weeklyDigestEnabled: true,
      });
    });

    it("maps UserSettings report flags to digest wire format", async () => {
      mockUserSettingsFindUnique.mockResolvedValueOnce({
        dailyReportEnabled: false,
        weeklyReportEnabled: true,
      });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/notifications/preferences",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        dailyDigestEnabled: false,
        weeklyDigestEnabled: true,
      });
    });
  });

  // --- PUT /api/v1/notifications/preferences ---

  describe("PUT /api/v1/notifications/preferences", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "PUT",
        url: "/api/v1/notifications/preferences",
        payload: { dailyDigestEnabled: false },
      });

      expect(response.statusCode).toBe(401);
    });

    it("updates daily digest preference only", async () => {
      mockUserSettingsUpsert.mockResolvedValueOnce({
        dailyReportEnabled: false,
        weeklyReportEnabled: true,
      });

      const response = await server.inject({
        method: "PUT",
        url: "/api/v1/notifications/preferences",
        headers: { authorization: `Bearer ${authToken}` },
        payload: { dailyDigestEnabled: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        dailyDigestEnabled: false,
        weeklyDigestEnabled: true,
      });
      expect(mockUserSettingsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: mockUser.id },
          update: { dailyReportEnabled: false },
        }),
      );
    });

    it("updates weekly digest preference only", async () => {
      mockUserSettingsUpsert.mockResolvedValueOnce({
        dailyReportEnabled: true,
        weeklyReportEnabled: false,
      });

      const response = await server.inject({
        method: "PUT",
        url: "/api/v1/notifications/preferences",
        headers: { authorization: `Bearer ${authToken}` },
        payload: { weeklyDigestEnabled: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        dailyDigestEnabled: true,
        weeklyDigestEnabled: false,
      });
      expect(mockUserSettingsUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: { weeklyReportEnabled: false },
        }),
      );
    });

    it("updates both preferences", async () => {
      mockUserSettingsUpsert.mockResolvedValueOnce({
        dailyReportEnabled: false,
        weeklyReportEnabled: false,
      });

      const response = await server.inject({
        method: "PUT",
        url: "/api/v1/notifications/preferences",
        headers: { authorization: `Bearer ${authToken}` },
        payload: { dailyDigestEnabled: false, weeklyDigestEnabled: false },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toMatchObject({
        dailyDigestEnabled: false,
        weeklyDigestEnabled: false,
      });
    });
  });

  // --- GET /api/v1/notifications/digest/:date ---

  describe("GET /api/v1/notifications/digest/:date", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/notifications/digest/2026-03-15",
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 400 for a malformed date", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/notifications/digest/not-a-date",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(400);
    });

    it("returns 404 when no report exists for the date", async () => {
      mockDailyReportFindFirst.mockResolvedValueOnce(null);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/notifications/digest/2026-03-15?type=daily",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.error).toContain("No daily report found for 2026-03-15");
    });

    it("maps an artist daily report to the DigestDetail shape", async () => {
      mockDailyReportFindFirst.mockResolvedValueOnce({
        id: 1,
        userId: mockUser.id,
        reportDate: new Date("2026-03-15T00:00:00"),
        reportType: "daily",
        content: {
          totalPlays: 42,
          yesterdayPlays: 42,
          dayBeforePlays: 30,
          weekOverWeekPercent: 40,
          topSong: { title: "My Song", plays: 12, station: "Kiss FM", peakHour: "14:00", delta: 12 },
        },
        tips: ["tip"],
        isPremium: true,
        deliveredVia: ["push"],
        sentAt: new Date(),
      });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/notifications/digest/2026-03-15?type=daily",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toEqual({
        playCount: 42,
        topSong: { title: "My Song", artist: null, name: null, count: 12 },
        topStation: { title: "Kiss FM", artist: null, name: "Kiss FM", count: 12 },
        weekOverWeekChange: null,
        newStationsCount: null,
      });
      expect(mockDailyReportFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId: mockUser.id,
            reportType: "daily",
          }),
        }),
      );
    });

    it("maps a weekly report including week-over-week stats", async () => {
      mockDailyReportFindFirst.mockResolvedValueOnce({
        id: 2,
        userId: mockUser.id,
        reportDate: new Date("2026-03-16T00:00:00"),
        reportType: "weekly",
        content: {
          totalPlays: 210,
          prevWeekPlays: 180,
          weekOverWeekPercent: 17,
          topSong: { title: "My Song", plays: 80, station: "Virgin Radio" },
          topStation: { name: "Virgin Radio", plays: 95 },
          newStationsCount: 3,
        },
        tips: ["tip"],
        isPremium: true,
        deliveredVia: ["push"],
        sentAt: new Date(),
      });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/notifications/digest/2026-03-16?type=weekly",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toEqual({
        playCount: 210,
        topSong: { title: "My Song", artist: null, name: null, count: 80 },
        topStation: { title: "Virgin Radio", artist: null, name: "Virgin Radio", count: 95 },
        weekOverWeekChange: 17,
        newStationsCount: 3,
      });
      expect(mockDailyReportFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ reportType: "weekly" }),
        }),
      );
    });
  });

  // --- POST /api/v1/notifications/device-token ---

  describe("POST /api/v1/notifications/device-token", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/notifications/device-token",
        payload: { token: "abc123" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("creates a new device token and returns 201", async () => {
      mockDeviceTokenUpsert.mockResolvedValueOnce({
        id: 1,
        userId: mockUser.id,
        token: "new-token-abc",
        environment: "production",
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/notifications/device-token",
        headers: { authorization: `Bearer ${authToken}` },
        payload: { token: "new-token-abc" },
      });

      expect(response.statusCode).toBe(201);
      expect(mockDeviceTokenUpsert).toHaveBeenCalled();
    });

    it("upserts existing token to reassign to current user", async () => {
      mockDeviceTokenUpsert.mockResolvedValueOnce({
        id: 2,
        userId: mockUser.id,
        token: "existing-token",
        environment: "sandbox",
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/notifications/device-token",
        headers: { authorization: `Bearer ${authToken}` },
        payload: { token: "existing-token", environment: "sandbox" },
      });

      expect(response.statusCode).toBe(201);
      expect(mockDeviceTokenUpsert).toHaveBeenCalled();
    });

    it("returns 400 with empty token", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/notifications/device-token",
        headers: { authorization: `Bearer ${authToken}` },
        payload: { token: "" },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // --- DELETE /api/v1/notifications/device-token ---

  describe("DELETE /api/v1/notifications/device-token", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/notifications/device-token",
        payload: { token: "some-token" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("deletes own device token and returns 204", async () => {
      mockDeviceTokenDeleteMany.mockResolvedValueOnce({ count: 1 });

      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/notifications/device-token",
        headers: { authorization: `Bearer ${authToken}` },
        payload: { token: "my-token" },
      });

      expect(response.statusCode).toBe(204);
      expect(mockDeviceTokenDeleteMany).toHaveBeenCalledWith({
        where: { token: "my-token", userId: mockUser.id },
      });
    });
  });
});
