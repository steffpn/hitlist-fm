import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";

// ---- Prisma mock (tests run without a real database) ----
// The authenticate middleware loads the user via prisma.user.findUnique
// with { include: { scopes, subscriptions (active/trialing, incl. plan) } }.
const { mockUserFindUnique } = vi.hoisted(() => ({
  mockUserFindUnique: vi.fn(),
}));

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $disconnect: vi.fn().mockResolvedValue(undefined),
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
    },
  },
}));

import { authenticate } from "../../src/middleware/authenticate.js";
import { requireRole } from "../../src/middleware/authorize.js";

// Shape returned by prisma.user.findUnique({ include: { scopes, subscriptions } })
function dbUser(overrides: Record<string, unknown> = {}) {
  return {
    id: 1,
    email: "auth@test.com",
    name: "Auth User",
    role: "ADMIN",
    isActive: true,
    scopes: [{ id: 1, userId: 1, entityType: "station", entityId: 1 }],
    subscriptions: [],
    ...overrides,
  };
}

describe("Authentication & Authorization Middleware", () => {
  const app = Fastify({ logger: false });

  beforeAll(async () => {
    await app.register(fastifyJwt, {
      secret: "test-secret-for-middleware",
    });

    // Protected route for testing authenticate
    app.get(
      "/protected",
      { preHandler: [authenticate] },
      async (request) => {
        return { user: request.currentUser, realUser: request.realUser };
      }
    );

    // Admin-only route for testing requireRole
    app.get(
      "/admin-only",
      { preHandler: [authenticate, requireRole("ADMIN")] },
      async (request) => {
        return { user: request.currentUser };
      }
    );

    await app.ready();
  });

  beforeEach(() => {
    mockUserFindUnique.mockReset();
    mockUserFindUnique.mockResolvedValue(null);
  });

  afterAll(async () => {
    await app.close();
  });

  describe("authenticate middleware", () => {
    it("attaches currentUser (and realUser) for valid JWT with active user", async () => {
      mockUserFindUnique.mockImplementation(({ where }: { where: { id: number } }) =>
        Promise.resolve(where.id === 1 ? dbUser() : null),
      );

      const token = app.jwt.sign({ sub: 1 });

      const response = await app.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.user.id).toBe(1);
      expect(body.user.email).toBe("auth@test.com");
      expect(body.user.role).toBe("ADMIN");
      expect(body.user.isActive).toBe(true);
      // No active subscription -> not premium
      expect(body.user.isPremium).toBe(false);
      expect(body.user.scopes).toHaveLength(1);
      expect(body.user.scopes[0].entityType).toBe("station");
      expect(body.user.scopes[0].entityId).toBe(1);
      // Without impersonation, realUser === currentUser
      expect(body.realUser).toEqual(body.user);
    });

    it("computes isPremium from an active PREMIUM subscription", async () => {
      mockUserFindUnique.mockResolvedValue(
        dbUser({
          subscriptions: [
            { id: 1, status: "active", plan: { id: 1, tier: "PREMIUM" } },
          ],
        }),
      );

      const token = app.jwt.sign({ sub: 1 });

      const response = await app.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.user.isPremium).toBe(true);
    });

    it("returns 401 for missing authorization header", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/protected",
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for invalid JWT", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: "Bearer invalid-token-here" },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for expired JWT", async () => {
      mockUserFindUnique.mockResolvedValue(dbUser());

      // Sign with explicit past expiry using iat and exp claims
      const now = Math.floor(Date.now() / 1000);
      const token = app.jwt.sign(
        { sub: 1, iat: now - 3600, exp: now - 1800 }
      );

      const response = await app.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for deactivated user with valid JWT", async () => {
      mockUserFindUnique.mockResolvedValue(dbUser({ isActive: false }));

      const token = app.jwt.sign({ sub: 1 });

      const response = await app.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(401);
    });

    it("returns 401 for JWT with non-existent user", async () => {
      mockUserFindUnique.mockResolvedValue(null);

      const token = app.jwt.sign({ sub: 99999 });

      const response = await app.inject({
        method: "GET",
        url: "/protected",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe("admin impersonation (x-impersonate-user-id)", () => {
    const persona = dbUser({
      id: 2,
      email: "persona-artist@onair.internal",
      name: "Persona Artist",
      role: "ARTIST",
      scopes: [{ id: 2, userId: 2, entityType: "artist", entityId: 7 }],
    });

    it("swaps currentUser to the persona target for a real ADMIN, keeping realUser", async () => {
      mockUserFindUnique.mockImplementation(({ where }: { where: { id: number } }) => {
        if (where.id === 1) return Promise.resolve(dbUser());
        if (where.id === 2) return Promise.resolve(persona);
        return Promise.resolve(null);
      });

      const token = app.jwt.sign({ sub: 1 });

      const response = await app.inject({
        method: "GET",
        url: "/protected",
        headers: {
          authorization: `Bearer ${token}`,
          "x-impersonate-user-id": "2",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.user.id).toBe(2);
      expect(body.user.role).toBe("ARTIST");
      // Personas get full (premium) access so every feature is demoable
      expect(body.user.isPremium).toBe(true);
      expect(body.realUser.id).toBe(1);
      expect(body.realUser.role).toBe("ADMIN");
    });

    it("ignores impersonation when target is not an @onair.internal persona", async () => {
      mockUserFindUnique.mockImplementation(({ where }: { where: { id: number } }) => {
        if (where.id === 1) return Promise.resolve(dbUser());
        if (where.id === 3) {
          return Promise.resolve(
            dbUser({ id: 3, email: "real-user@example.com", role: "ARTIST" }),
          );
        }
        return Promise.resolve(null);
      });

      const token = app.jwt.sign({ sub: 1 });

      const response = await app.inject({
        method: "GET",
        url: "/protected",
        headers: {
          authorization: `Bearer ${token}`,
          "x-impersonate-user-id": "3",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.user.id).toBe(1);
      expect(body.user.role).toBe("ADMIN");
    });

    it("ignores impersonation when the real user is not an ADMIN", async () => {
      mockUserFindUnique.mockImplementation(({ where }: { where: { id: number } }) => {
        if (where.id === 4) {
          return Promise.resolve(
            dbUser({ id: 4, email: "artist@test.com", role: "ARTIST" }),
          );
        }
        if (where.id === 2) return Promise.resolve(persona);
        return Promise.resolve(null);
      });

      const token = app.jwt.sign({ sub: 4 });

      const response = await app.inject({
        method: "GET",
        url: "/protected",
        headers: {
          authorization: `Bearer ${token}`,
          "x-impersonate-user-id": "2",
        },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.user.id).toBe(4);
      expect(body.user.role).toBe("ARTIST");
    });
  });

  describe("requireRole middleware", () => {
    it("allows ADMIN user to access admin-only route", async () => {
      mockUserFindUnique.mockResolvedValue(
        dbUser({ email: "admin-role@test.com", name: "Admin Role" }),
      );

      const token = app.jwt.sign({ sub: 1 });

      const response = await app.inject({
        method: "GET",
        url: "/admin-only",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(200);
    });

    it("returns 403 for non-ADMIN user on admin-only route", async () => {
      mockUserFindUnique.mockResolvedValue(
        dbUser({ email: "artist-role@test.com", name: "Artist Role", role: "ARTIST" }),
      );

      const token = app.jwt.sign({ sub: 1 });

      const response = await app.inject({
        method: "GET",
        url: "/admin-only",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.error).toBe("Insufficient permissions");
    });
  });
});
