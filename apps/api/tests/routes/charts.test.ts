import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Prisma mock ----
const mockQueryRaw = vi.fn();
const mockUserFindUnique = vi.fn();

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      count: vi.fn().mockResolvedValue(1),
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
const mockRedisGet = vi.fn();
const mockRedisSet = vi.fn();

vi.mock("../../src/lib/redis.js", () => ({
  createRedisConnection: vi.fn().mockReturnValue({
    subscribe: vi.fn().mockResolvedValue(undefined),
    on: vi.fn(),
    disconnect: vi.fn(),
    removeAllListeners: vi.fn(),
  }),
  redis: {
    get: (...args: unknown[]) => mockRedisGet(...args),
    set: (...args: unknown[]) => mockRedisSet(...args),
    ping: vi.fn().mockResolvedValue("PONG"),
    disconnect: vi.fn(),
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

// ---- Fixtures ----

function chartRow(
  isrc: string,
  plays: number,
  stationCount: number,
  overrides: Partial<{ song_title: string; artist_name: string; artwork_url: string | null }> = {},
) {
  return {
    isrc,
    plays: BigInt(plays),
    station_count: BigInt(stationCount),
    song_title: overrides.song_title ?? `Song ${isrc}`,
    artist_name: overrides.artist_name ?? `Artist ${isrc}`,
    artwork_url: overrides.artwork_url ?? null,
  };
}

describe("Public Charts Routes", () => {
  let server: Awaited<typeof import("../../src/index.js")>["server"];

  beforeEach(async () => {
    mockQueryRaw.mockReset();
    mockRedisGet.mockReset().mockResolvedValue(null);
    mockRedisSet.mockReset().mockResolvedValue("OK");

    const mod = await import("../../src/index.js");
    server = mod.server;
    await server.ready();
  });

  describe("GET /api/v1/charts/airplay", () => {
    it("is public (no Authorization header required)", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay",
      });

      expect(response.statusCode).toBe(200);
    });

    it("aggregates the current period and computes rank/delta/peak/isNew", async () => {
      // Current week aggregation (rank order): A(1), B(2), C(3)
      mockQueryRaw
        .mockResolvedValueOnce([
          chartRow("ISRC-A", 120, 8, { artwork_url: "https://img/a.jpg" }),
          chartRow("ISRC-B", 90, 5),
          chartRow("ISRC-C", 40, 2),
        ])
        // Previous week ranking: B was #1, A was #2, C absent (new)
        .mockResolvedValueOnce([{ isrc: "ISRC-B" }, { isrc: "ISRC-A" }]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay?period=week&limit=100",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.period).toBe("week");
      expect(body.entries).toHaveLength(3);

      // A: climbed 2 -> 1
      expect(body.entries[0]).toMatchObject({
        rank: 1,
        isrc: "ISRC-A",
        songTitle: "Song ISRC-A",
        artistName: "Artist ISRC-A",
        plays: 120,
        stationCount: 8,
        artworkUrl: "https://img/a.jpg",
        delta: 1, // previous #2 - current #1
        peakPosition: 1,
        isNew: false,
      });

      // B: dropped 1 -> 2, peak stays 1 (previous week best)
      expect(body.entries[1]).toMatchObject({
        rank: 2,
        isrc: "ISRC-B",
        delta: -1,
        peakPosition: 1,
        isNew: false,
      });

      // C: new entry
      expect(body.entries[2]).toMatchObject({
        rank: 3,
        isrc: "ISRC-C",
        delta: null,
        peakPosition: 3,
        isNew: true,
      });
    });

    it("caches the computed response in Redis for 15 minutes (period+limit key)", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay?period=week&limit=50",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["x-cache"]).toBe("miss");
      expect(mockRedisGet).toHaveBeenCalledWith("charts:airplay:week:50");
      expect(mockRedisSet).toHaveBeenCalledWith(
        "charts:airplay:week:50",
        expect.any(String),
        "EX",
        15 * 60,
      );
    });

    it("serves from cache without querying the database", async () => {
      const cached = {
        period: "week",
        periodStart: "2026-06-29T00:00:00.000Z",
        generatedAt: "2026-07-01T10:00:00.000Z",
        entries: [{ rank: 1, isrc: "ISRC-A", plays: 7 }],
      };
      mockRedisGet.mockResolvedValue(JSON.stringify(cached));

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay",
      });

      expect(response.statusCode).toBe(200);
      expect(response.headers["x-cache"]).toBe("hit");
      expect(JSON.parse(response.payload)).toEqual(cached);
      expect(mockQueryRaw).not.toHaveBeenCalled();
      expect(mockRedisSet).not.toHaveBeenCalled();
    });

    it("omits peakPosition for the month period (documented: cheap peak is week-only)", async () => {
      mockQueryRaw
        .mockResolvedValueOnce([chartRow("ISRC-A", 300, 10)])
        .mockResolvedValueOnce([{ isrc: "ISRC-A" }]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay?period=month",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.period).toBe("month");
      expect(body.entries[0].peakPosition).toBeNull();
      expect(body.entries[0].delta).toBe(0); // #1 -> #1
      expect(mockRedisGet).toHaveBeenCalledWith("charts:airplay:month:100");
    });

    it("rejects invalid period and out-of-range limit", async () => {
      const badPeriod = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay?period=year",
      });
      expect(badPeriod.statusCode).toBe(400);

      const badLimit = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay?limit=500",
      });
      expect(badLimit.statusCode).toBe(400);
    });

    it("is rate limited per IP (60/min)", async () => {
      mockQueryRaw.mockResolvedValue([]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay",
      });

      expect(response.headers["x-ratelimit-limit"]).toBeDefined();
      expect(String(response.headers["x-ratelimit-limit"])).toBe("60");
    });
  });

  describe("GET /api/v1/charts/airplay/song/:isrc", () => {
    it("returns the weekly position history for the song", async () => {
      mockQueryRaw.mockResolvedValueOnce([
        { week_start: new Date("2026-06-15T00:00:00.000Z"), plays: BigInt(12), position: BigInt(4) },
        { week_start: new Date("2026-06-22T00:00:00.000Z"), plays: BigInt(30), position: BigInt(1) },
      ]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay/song/ROA231600001",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.isrc).toBe("ROA231600001");
      expect(body.weeks).toEqual([
        { weekStart: "2026-06-15", plays: 12, position: 4 },
        { weekStart: "2026-06-22", plays: 30, position: 1 },
      ]);
    });

    it("returns an empty history when the song never charted", async () => {
      mockQueryRaw.mockResolvedValueOnce([]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/charts/airplay/song/ROA231699999",
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.weeks).toEqual([]);
    });
  });
});
