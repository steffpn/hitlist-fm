import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Prisma mock ----
const mockQueryRaw = vi.fn();
const mockUserFindUnique = vi.fn();
const mockMonitoredSongFindFirst = vi.fn();
const mockMonitoredSongDelete = vi.fn();

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      count: vi.fn().mockResolvedValue(1),
    },
    monitoredSong: {
      findFirst: (...args: unknown[]) => mockMonitoredSongFindFirst(...args),
      delete: (...args: unknown[]) => mockMonitoredSongDelete(...args),
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

// ---- Fetch mock (Deezer) ----
const mockFetch = vi.fn();

// ---- Auth mock helper ----
const mockUser = {
  id: 1,
  email: "artist@test.com",
  name: "Test Artist",
  role: "ARTIST",
  isActive: true,
  scopes: [],
  subscriptions: [],
};

describe("Artist Catalog Routes", () => {
  let server: Awaited<typeof import("../../src/index.js")>["server"];
  let authToken: string;

  beforeEach(async () => {
    mockQueryRaw.mockClear();
    mockUserFindUnique.mockClear();
    mockMonitoredSongFindFirst.mockClear();
    mockMonitoredSongDelete.mockClear();
    mockFetch.mockReset();
    vi.stubGlobal("fetch", mockFetch);

    const mod = await import("../../src/index.js");
    server = mod.server;
    await server.ready();

    authToken = server.jwt.sign({ sub: mockUser.id });

    // Mock user lookup for authenticate middleware
    mockUserFindUnique.mockImplementation(
      ({ where }: { where: { id: number } }) => {
        if (where.id === mockUser.id) return Promise.resolve(mockUser);
        return Promise.resolve(null);
      },
    );
  });

  // --- GET /api/v1/artist/browse-tracks ---

  describe("GET /api/v1/artist/browse-tracks", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/artist/browse-tracks?q=hello",
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns an empty array when q is missing or blank", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/artist/browse-tracks",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual([]);
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it("searches Deezer and returns only tracks with a non-null ISRC", async () => {
      mockFetch.mockImplementation((url: string | URL) => {
        const u = String(url);
        if (u.includes("/search/track")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              data: [
                {
                  id: 101,
                  title: "Song One",
                  artist: { name: "Test Artist" },
                  album: { cover_medium: "https://cdn.deezer.com/101.jpg" },
                },
                {
                  id: 102,
                  title: "Song Without ISRC",
                  artist: { name: "Test Artist" },
                  album: { cover_medium: "https://cdn.deezer.com/102.jpg" },
                },
                {
                  id: 103,
                  title: "Song Three",
                  artist: { name: "Featured Guy" },
                  album: {},
                },
              ],
            }),
          });
        }
        if (u.includes("/track/101")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ isrc: "ROABC2400001" }),
          });
        }
        if (u.includes("/track/102")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ isrc: null }),
          });
        }
        if (u.includes("/track/103")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ isrc: "USXYZ2500003" }),
          });
        }
        return Promise.resolve({ ok: false, json: async () => ({}) });
      });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/artist/browse-tracks?q=song",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body).toEqual([
        {
          title: "Song One",
          artist: "Test Artist",
          isrc: "ROABC2400001",
          coverUrl: "https://cdn.deezer.com/101.jpg",
          deezerTrackId: 101,
        },
        {
          title: "Song Three",
          artist: "Featured Guy",
          isrc: "USXYZ2500003",
          coverUrl: null,
          deezerTrackId: 103,
        },
      ]);

      // Search call uses the Deezer track search with limit 25
      const searchUrl = String(mockFetch.mock.calls[0][0]);
      expect(searchUrl).toContain("https://api.deezer.com/search/track");
      expect(searchUrl).toContain("q=song");
      expect(searchUrl).toContain("limit=25");
    });

    it("returns 502 when the Deezer search fails", async () => {
      mockFetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/artist/browse-tracks?q=song",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(502);
      expect(JSON.parse(response.payload)).toEqual({
        error: "Deezer API error",
      });
    });

    it("returns 502 when fetch throws", async () => {
      mockFetch.mockRejectedValueOnce(new Error("network down"));

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/artist/browse-tracks?q=song",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(502);
      expect(JSON.parse(response.payload)).toEqual({
        error: "Failed to search tracks",
      });
    });
  });

  // --- DELETE /api/v1/artist/songs/:id ---

  describe("DELETE /api/v1/artist/songs/:id", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/artist/songs/5",
      });

      expect(response.statusCode).toBe(401);
    });

    it("deletes an owned song and returns 204", async () => {
      mockMonitoredSongFindFirst.mockResolvedValueOnce({
        id: 5,
        userId: mockUser.id,
        songTitle: "My Song",
        artistName: "Test Artist",
        isrc: "ROABC2400001",
        status: "active",
      });
      mockMonitoredSongDelete.mockResolvedValueOnce({ id: 5 });

      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/artist/songs/5",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(204);
      expect(mockMonitoredSongFindFirst).toHaveBeenCalledWith({
        where: { id: 5, userId: mockUser.id },
      });
      expect(mockMonitoredSongDelete).toHaveBeenCalledWith({
        where: { id: 5 },
      });
    });

    it("returns 404 when the song does not belong to the artist", async () => {
      mockMonitoredSongFindFirst.mockResolvedValueOnce(null);

      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/artist/songs/99",
        headers: { authorization: `Bearer ${authToken}` },
      });

      expect(response.statusCode).toBe(404);
      expect(JSON.parse(response.payload)).toEqual({
        error: "Song not found",
      });
      expect(mockMonitoredSongDelete).not.toHaveBeenCalled();
    });
  });
});
