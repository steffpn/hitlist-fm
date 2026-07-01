import { describe, it, expect, vi, beforeEach } from "vitest";

// ---- Prisma mock ----
const mockUserFindUnique = vi.fn();
const mockUserFindMany = vi.fn();
const mockMembershipFindMany = vi.fn();
const mockOrgFindMany = vi.fn();
const mockArtistFindUnique = vi.fn();
const mockArtistFindMany = vi.fn();
const mockArtistUpdate = vi.fn();
const mockOrgEntityFindFirst = vi.fn();
const mockOrgEntityCreate = vi.fn();
const mockClaimFindMany = vi.fn();
const mockClaimFindUnique = vi.fn();
const mockClaimFindFirst = vi.fn();
const mockClaimCreate = vi.fn();
const mockClaimUpdate = vi.fn();

vi.mock("../../src/lib/prisma.js", () => {
  const prisma = {
    $queryRaw: vi.fn(),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: (arg: unknown) =>
      Array.isArray(arg)
        ? Promise.all(arg)
        : (arg as (tx: unknown) => unknown)(prisma),
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      findMany: (...args: unknown[]) => mockUserFindMany(...args),
    },
    membership: {
      findMany: (...args: unknown[]) => mockMembershipFindMany(...args),
    },
    organization: {
      findMany: (...args: unknown[]) => mockOrgFindMany(...args),
    },
    artist: {
      findUnique: (...args: unknown[]) => mockArtistFindUnique(...args),
      findMany: (...args: unknown[]) => mockArtistFindMany(...args),
      update: (...args: unknown[]) => mockArtistUpdate(...args),
    },
    orgEntity: {
      findFirst: (...args: unknown[]) => mockOrgEntityFindFirst(...args),
      create: (...args: unknown[]) => mockOrgEntityCreate(...args),
    },
    artistClaim: {
      findMany: (...args: unknown[]) => mockClaimFindMany(...args),
      findUnique: (...args: unknown[]) => mockClaimFindUnique(...args),
      findFirst: (...args: unknown[]) => mockClaimFindFirst(...args),
      create: (...args: unknown[]) => mockClaimCreate(...args),
      update: (...args: unknown[]) => mockClaimUpdate(...args),
    },
  };
  return { prisma };
});

// ---- Email mock ----
vi.mock("../../src/lib/email.js", () => ({
  sendEmail: vi.fn().mockResolvedValue(undefined),
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

// ---- Test users (shape matches authenticate's include) ----
const ownerUser = {
  id: 10,
  email: "owner@test.com",
  name: "Org Owner",
  role: "ARTIST",
  isActive: true,
  emailVerified: true,
  scopes: [],
  subscriptions: [],
};

const memberlessUser = {
  id: 12,
  email: "loner@test.com",
  name: "No Org",
  role: "ARTIST",
  isActive: true,
  emailVerified: true,
  scopes: [],
  subscriptions: [],
};

const adminUser = {
  id: 11,
  email: "admin@test.com",
  name: "Admin",
  role: "ADMIN",
  isActive: true,
  emailVerified: true,
  scopes: [],
  subscriptions: [],
};

const artistRow = {
  id: 77,
  name: "Ștefan Bănică",
  nameNormalized: "stefan banica",
  aliases: [],
  verified: false,
};

describe("Orgs & artist claim flow", () => {
  let server: Awaited<typeof import("../../src/index.js")>["server"];
  let ownerToken: string;
  let adminToken: string;
  let lonerToken: string;

  beforeEach(async () => {
    mockUserFindUnique.mockReset();
    mockUserFindMany.mockReset().mockResolvedValue([]);
    mockMembershipFindMany.mockReset().mockResolvedValue([]);
    mockOrgFindMany.mockReset().mockResolvedValue([]);
    mockArtistFindUnique.mockReset().mockResolvedValue(artistRow);
    mockArtistFindMany.mockReset().mockResolvedValue([]);
    mockArtistUpdate.mockReset().mockResolvedValue({ ...artistRow, verified: true });
    mockOrgEntityFindFirst.mockReset().mockResolvedValue(null);
    mockOrgEntityCreate.mockReset().mockResolvedValue({ id: 900 });
    mockClaimFindMany.mockReset().mockResolvedValue([]);
    mockClaimFindUnique.mockReset();
    mockClaimFindFirst.mockReset().mockResolvedValue(null);
    mockClaimCreate.mockReset();
    mockClaimUpdate.mockReset();

    const mod = await import("../../src/index.js");
    server = mod.server;
    await server.ready();

    mockUserFindUnique.mockImplementation(
      ({ where }: { where: { id?: number; email?: string } }) => {
        if (where.id === ownerUser.id) return Promise.resolve(ownerUser);
        if (where.id === adminUser.id) return Promise.resolve(adminUser);
        if (where.id === memberlessUser.id) return Promise.resolve(memberlessUser);
        return Promise.resolve(null);
      }
    );

    ownerToken = server.jwt.sign({ sub: ownerUser.id });
    adminToken = server.jwt.sign({ sub: adminUser.id });
    lonerToken = server.jwt.sign({ sub: memberlessUser.id });
  });

  // --- GET /api/v1/orgs/me ---

  describe("GET /api/v1/orgs/me", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/orgs/me",
      });
      expect(response.statusCode).toBe(401);
    });

    it("returns the caller's organizations with role and entities", async () => {
      mockMembershipFindMany.mockResolvedValueOnce([
        {
          id: 1,
          organizationId: 200,
          userId: ownerUser.id,
          role: "OWNER",
          organization: {
            id: 200,
            name: "Org Owner",
            type: "ARTIST_TEAM",
            entities: [
              {
                id: 500,
                entityType: "ARTIST",
                artist: { id: 77, name: "Ștefan Bănică", verified: true },
                station: null,
              },
              {
                id: 501,
                entityType: "STATION",
                artist: null,
                station: { id: 3, name: "Kiss FM" },
              },
            ],
          },
        },
      ]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/orgs/me",
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        organizations: [
          {
            id: 200,
            name: "Org Owner",
            type: "ARTIST_TEAM",
            role: "OWNER",
            entities: [
              {
                id: 500,
                entityType: "ARTIST",
                artist: { id: 77, name: "Ștefan Bănică", verified: true },
                station: null,
              },
              {
                id: 501,
                entityType: "STATION",
                artist: null,
                station: { id: 3, name: "Kiss FM" },
              },
            ],
          },
        ],
      });

      expect(mockMembershipFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: ownerUser.id } })
      );
    });

    it("returns an empty list for a user with no memberships", async () => {
      mockMembershipFindMany.mockResolvedValueOnce([]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/orgs/me",
        headers: { authorization: `Bearer ${lonerToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ organizations: [] });
    });
  });

  // --- GET /api/v1/artists/search ---

  describe("GET /api/v1/artists/search", () => {
    it("normalizes the query (diacritics, case) before matching", async () => {
      mockArtistFindMany.mockResolvedValueOnce([
        { id: 77, name: "Ștefan Bănică", verified: false },
      ]);

      const response = await server.inject({
        method: "GET",
        url: `/api/v1/artists/search?q=${encodeURIComponent("Ștefan BĂNICĂ")}`,
        headers: { authorization: `Bearer ${ownerToken}` },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        artists: [{ id: 77, name: "Ștefan Bănică", verified: false }],
      });
      expect(mockArtistFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { nameNormalized: { contains: "stefan banica" } },
        })
      );
    });

    it("requires authentication", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/artists/search?q=test",
      });
      expect(response.statusCode).toBe(401);
    });
  });

  // --- POST /api/v1/artists/:id/claim ---

  describe("POST /api/v1/artists/:id/claim", () => {
    it("returns 403 when the caller has no OWNER/ADMIN membership", async () => {
      mockMembershipFindMany.mockResolvedValueOnce([]);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/artists/77/claim",
        headers: { authorization: `Bearer ${lonerToken}` },
        payload: { evidence: "https://artists.spotify.com/..." },
      });

      expect(response.statusCode).toBe(403);
      expect(mockClaimCreate).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown artist", async () => {
      mockArtistFindUnique.mockResolvedValueOnce(null);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/artists/999/claim",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(404);
      expect(mockClaimCreate).not.toHaveBeenCalled();
    });

    it("creates a PENDING claim for the caller's single org", async () => {
      mockMembershipFindMany.mockResolvedValueOnce([
        { id: 1, organizationId: 200, userId: ownerUser.id, role: "OWNER" },
      ]);
      mockClaimCreate.mockResolvedValueOnce({
        id: 600,
        artistId: 77,
        organizationId: 200,
        requestedById: ownerUser.id,
        evidence: "https://artists.spotify.com/...",
        status: "PENDING",
        createdAt: new Date("2026-07-02T12:00:00Z"),
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/artists/77/claim",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { evidence: "https://artists.spotify.com/..." },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.claim).toMatchObject({
        id: 600,
        artistId: 77,
        organizationId: 200,
        requestedById: ownerUser.id,
        status: "PENDING",
      });

      expect(mockClaimCreate).toHaveBeenCalledWith({
        data: {
          artistId: 77,
          organizationId: 200,
          requestedById: ownerUser.id,
          evidence: "https://artists.spotify.com/...",
          status: "PENDING",
        },
      });
    });

    it("returns 400 when the caller has several orgs and none is specified", async () => {
      mockMembershipFindMany.mockResolvedValueOnce([
        { id: 1, organizationId: 200, userId: ownerUser.id, role: "OWNER" },
        { id: 2, organizationId: 201, userId: ownerUser.id, role: "ADMIN" },
      ]);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/artists/77/claim",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      expect(mockClaimCreate).not.toHaveBeenCalled();
    });

    it("honors an explicit organizationId the caller belongs to", async () => {
      mockMembershipFindMany.mockResolvedValueOnce([
        { id: 1, organizationId: 200, userId: ownerUser.id, role: "OWNER" },
        { id: 2, organizationId: 201, userId: ownerUser.id, role: "ADMIN" },
      ]);
      mockClaimCreate.mockResolvedValueOnce({
        id: 601,
        artistId: 77,
        organizationId: 201,
        requestedById: ownerUser.id,
        evidence: null,
        status: "PENDING",
        createdAt: new Date(),
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/artists/77/claim",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { organizationId: 201 },
      });

      expect(response.statusCode).toBe(201);
      expect(mockClaimCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ organizationId: 201 }),
      });
    });

    it("returns 403 for an organizationId the caller is not OWNER/ADMIN of", async () => {
      mockMembershipFindMany.mockResolvedValueOnce([
        { id: 1, organizationId: 200, userId: ownerUser.id, role: "OWNER" },
      ]);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/artists/77/claim",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: { organizationId: 999 },
      });

      expect(response.statusCode).toBe(403);
      expect(mockClaimCreate).not.toHaveBeenCalled();
    });

    it("returns 409 when the artist is already linked to the org", async () => {
      mockMembershipFindMany.mockResolvedValueOnce([
        { id: 1, organizationId: 200, userId: ownerUser.id, role: "OWNER" },
      ]);
      mockOrgEntityFindFirst.mockResolvedValueOnce({ id: 500 });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/artists/77/claim",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(409);
      expect(mockClaimCreate).not.toHaveBeenCalled();
    });

    it("returns 409 when a claim is already pending", async () => {
      mockMembershipFindMany.mockResolvedValueOnce([
        { id: 1, organizationId: 200, userId: ownerUser.id, role: "OWNER" },
      ]);
      mockClaimFindFirst.mockResolvedValueOnce({ id: 600, status: "PENDING" });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/artists/77/claim",
        headers: { authorization: `Bearer ${ownerToken}` },
        payload: {},
      });

      expect(response.statusCode).toBe(409);
      expect(mockClaimCreate).not.toHaveBeenCalled();
    });
  });

  // --- GET /api/v1/admin/artist-claims ---

  describe("GET /api/v1/admin/artist-claims", () => {
    it("returns 403 for a non-admin", async () => {
      const response = await server.inject({
        method: "GET",
        url: "/api/v1/admin/artist-claims",
        headers: { authorization: `Bearer ${ownerToken}` },
      });
      expect(response.statusCode).toBe(403);
    });

    it("lists claims filtered by status, enriched with artist/org/requester", async () => {
      mockClaimFindMany.mockResolvedValueOnce([
        {
          id: 600,
          artistId: 77,
          organizationId: 200,
          requestedById: ownerUser.id,
          evidence: "https://artists.spotify.com/...",
          status: "PENDING",
          decidedById: null,
          decidedAt: null,
          createdAt: new Date("2026-07-02T12:00:00Z"),
          artist: { id: 77, name: "Ștefan Bănică", verified: false },
        },
      ]);
      mockOrgFindMany.mockResolvedValueOnce([
        { id: 200, name: "Org Owner", type: "ARTIST_TEAM" },
      ]);
      mockUserFindMany.mockResolvedValueOnce([
        { id: ownerUser.id, name: ownerUser.name, email: ownerUser.email },
      ]);

      const response = await server.inject({
        method: "GET",
        url: "/api/v1/admin/artist-claims?status=PENDING",
        headers: { authorization: `Bearer ${adminToken}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.claims).toHaveLength(1);
      expect(body.claims[0]).toMatchObject({
        id: 600,
        status: "PENDING",
        artist: { id: 77, name: "Ștefan Bănică", verified: false },
        organization: { id: 200, name: "Org Owner", type: "ARTIST_TEAM" },
        requestedBy: {
          id: ownerUser.id,
          name: ownerUser.name,
          email: ownerUser.email,
        },
      });

      expect(mockClaimFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: "PENDING" } })
      );
    });
  });

  // --- PATCH /api/v1/admin/artist-claims/:id ---

  describe("PATCH /api/v1/admin/artist-claims/:id", () => {
    const pendingClaim = {
      id: 600,
      artistId: 77,
      organizationId: 200,
      requestedById: ownerUser.id,
      evidence: null,
      status: "PENDING",
      decidedById: null,
      decidedAt: null,
      createdAt: new Date("2026-07-02T12:00:00Z"),
    };

    it("APPROVED creates the OrgEntity link and marks the artist verified", async () => {
      mockClaimFindUnique.mockResolvedValueOnce(pendingClaim);
      mockClaimUpdate.mockResolvedValueOnce({
        ...pendingClaim,
        status: "APPROVED",
        decidedById: adminUser.id,
        decidedAt: new Date(),
      });

      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/admin/artist-claims/600",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: "APPROVED" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.claim).toMatchObject({
        id: 600,
        status: "APPROVED",
        decidedById: adminUser.id,
      });

      expect(mockOrgEntityCreate).toHaveBeenCalledWith({
        data: { organizationId: 200, entityType: "ARTIST", artistId: 77 },
      });
      expect(mockArtistUpdate).toHaveBeenCalledWith({
        where: { id: 77 },
        data: { verified: true },
      });
      expect(mockClaimUpdate).toHaveBeenCalledWith({
        where: { id: 600 },
        data: {
          status: "APPROVED",
          decidedById: adminUser.id,
          decidedAt: expect.any(Date),
        },
      });
    });

    it("APPROVED does not duplicate an existing OrgEntity link", async () => {
      mockClaimFindUnique.mockResolvedValueOnce(pendingClaim);
      mockOrgEntityFindFirst.mockResolvedValueOnce({ id: 500 });
      mockClaimUpdate.mockResolvedValueOnce({
        ...pendingClaim,
        status: "APPROVED",
        decidedById: adminUser.id,
        decidedAt: new Date(),
      });

      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/admin/artist-claims/600",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: "APPROVED" },
      });

      expect(response.statusCode).toBe(200);
      expect(mockOrgEntityCreate).not.toHaveBeenCalled();
      expect(mockArtistUpdate).toHaveBeenCalled(); // still marked verified
    });

    it("REJECTED only updates the claim", async () => {
      mockClaimFindUnique.mockResolvedValueOnce(pendingClaim);
      mockClaimUpdate.mockResolvedValueOnce({
        ...pendingClaim,
        status: "REJECTED",
        decidedById: adminUser.id,
        decidedAt: new Date(),
      });

      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/admin/artist-claims/600",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: "REJECTED" },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload).claim.status).toBe("REJECTED");
      expect(mockOrgEntityCreate).not.toHaveBeenCalled();
      expect(mockArtistUpdate).not.toHaveBeenCalled();
    });

    it("returns 409 for an already-decided claim", async () => {
      mockClaimFindUnique.mockResolvedValueOnce({
        ...pendingClaim,
        status: "APPROVED",
      });

      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/admin/artist-claims/600",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: "REJECTED" },
      });

      expect(response.statusCode).toBe(409);
      expect(mockClaimUpdate).not.toHaveBeenCalled();
    });

    it("returns 404 for an unknown claim", async () => {
      mockClaimFindUnique.mockResolvedValueOnce(null);

      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/admin/artist-claims/999",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: "APPROVED" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("rejects an invalid status value with 400", async () => {
      const response = await server.inject({
        method: "PATCH",
        url: "/api/v1/admin/artist-claims/600",
        headers: { authorization: `Bearer ${adminToken}` },
        payload: { status: "MAYBE" },
      });

      expect(response.statusCode).toBe(400);
      expect(mockClaimFindUnique).not.toHaveBeenCalled();
    });
  });
});
