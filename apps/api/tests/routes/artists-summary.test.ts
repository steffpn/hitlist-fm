import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyJwt from "@fastify/jwt";

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
  },
}));

// ---- Auth mock users ----
const adminUser = {
  id: 1,
  email: "admin@test.com",
  name: "Admin",
  role: "ADMIN",
  isActive: true,
  scopes: [],
  subscriptions: [],
};

const artistUser = {
  id: 2,
  email: "artist@test.com",
  name: "Artist",
  role: "ARTIST",
  isActive: true,
  scopes: [],
  subscriptions: [],
};

describe("GET /api/v1/artists/summary", () => {
  // The artists module is registered standalone here (it is wired into
  // v1/index.ts separately), so the plugin is mounted on a fresh Fastify
  // instance with JWT, mirroring the production prefix.
  let server: FastifyInstance;
  let adminToken: string;
  let artistToken: string;

  beforeEach(async () => {
    mockQueryRaw.mockClear();
    mockUserFindUnique.mockClear();

    server = Fastify();
    await server.register(fastifyJwt, { secret: "test-secret" });
    const artistsRoutes = (
      await import("../../src/routes/v1/artists/index.js")
    ).default;
    await server.register(artistsRoutes, { prefix: "/api/v1/artists" });
    await server.ready();

    adminToken = server.jwt.sign({ sub: adminUser.id });
    artistToken = server.jwt.sign({ sub: artistUser.id });

    mockUserFindUnique.mockImplementation(
      ({ where }: { where: { id: number } }) => {
        if (where.id === adminUser.id) return Promise.resolve(adminUser);
        if (where.id === artistUser.id) return Promise.resolve(artistUser);
        return Promise.resolve(null);
      },
    );
  });

  afterEach(async () => {
    await server.close();
  });

  it("returns 401 without authentication", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/artists/summary",
    });

    expect(response.statusCode).toBe(401);
  });

  it("returns 403 for non-admin roles", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/artists/summary",
      headers: { authorization: `Bearer ${artistToken}` },
    });

    expect(response.statusCode).toBe(403);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });

  it("aggregates artists globally and maps SQL rows to camelCase", async () => {
    mockQueryRaw.mockResolvedValueOnce([
      {
        artist_name: "Smiley",
        play_count: BigInt(420),
        song_count: BigInt(7),
        station_count: BigInt(12),
        last_play_at: new Date("2026-07-01T12:34:56.000Z"),
      },
      {
        artist_name: "Delia",
        play_count: 133,
        song_count: 4,
        station_count: 9,
        last_play_at: new Date("2026-07-01T10:00:00.000Z"),
      },
    ]);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/artists/summary",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    const body = JSON.parse(response.payload);
    expect(body).toEqual([
      {
        artistName: "Smiley",
        playCount: 420,
        songCount: 7,
        stationCount: 12,
        lastPlayAt: "2026-07-01T12:34:56.000Z",
      },
      {
        artistName: "Delia",
        playCount: 133,
        songCount: 4,
        stationCount: 9,
        lastPlayAt: "2026-07-01T10:00:00.000Z",
      },
    ]);
  });

  it("excludes partial plays and groups by artist in the SQL", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/artists/summary",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    expect(mockQueryRaw).toHaveBeenCalledTimes(1);

    // $queryRaw is a tagged template: first arg = template strings
    const sql = (mockQueryRaw.mock.calls[0][0] as readonly string[]).join("?");
    expect(sql).toContain("partial_play = false");
    expect(sql).toContain("GROUP BY artist_name");
    expect(sql).toContain("ORDER BY play_count DESC");
    expect(sql).toContain("COUNT(DISTINCT isrc)");
    expect(sql).toContain("COUNT(DISTINCT station_id)");
  });

  it("defaults to period=week and limit=50", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    await server.inject({
      method: "GET",
      url: "/api/v1/artists/summary",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    const args = mockQueryRaw.mock.calls[0];
    const since = args[1] as Date;
    const limit = args[2] as number;

    expect(limit).toBe(50);
    expect(since).toBeInstanceOf(Date);
    const expectedSince = Date.now() - 7 * 24 * 60 * 60 * 1000;
    expect(Math.abs(since.getTime() - expectedSince)).toBeLessThan(5000);
  });

  it("honors period=day and a custom limit", async () => {
    mockQueryRaw.mockResolvedValueOnce([]);

    const response = await server.inject({
      method: "GET",
      url: "/api/v1/artists/summary?period=day&limit=10",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(200);
    const args = mockQueryRaw.mock.calls[0];
    const since = args[1] as Date;
    const limit = args[2] as number;

    expect(limit).toBe(10);
    const expectedSince = Date.now() - 24 * 60 * 60 * 1000;
    expect(Math.abs(since.getTime() - expectedSince)).toBeLessThan(5000);
  });

  it("rejects an invalid period", async () => {
    const response = await server.inject({
      method: "GET",
      url: "/api/v1/artists/summary?period=year",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(response.statusCode).toBe(400);
    expect(mockQueryRaw).not.toHaveBeenCalled();
  });
});
