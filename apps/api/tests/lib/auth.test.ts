import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from "vitest";
import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";

// ---- Prisma mock (tests run without a real database) ----
const { mockRefreshTokenCreate, mockUserCount, mockUserCreate } = vi.hoisted(
  () => ({
    mockRefreshTokenCreate: vi.fn(),
    mockUserCount: vi.fn(),
    mockUserCreate: vi.fn(),
  }),
);

vi.mock("../../src/lib/prisma.js", () => ({
  prisma: {
    $disconnect: vi.fn().mockResolvedValue(undefined),
    user: {
      count: (...args: unknown[]) => mockUserCount(...args),
      create: (...args: unknown[]) => mockUserCreate(...args),
    },
    refreshToken: {
      create: (...args: unknown[]) => mockRefreshTokenCreate(...args),
    },
  },
}));

import {
  hashPassword,
  verifyPassword,
  generateInviteCode,
  generateTokenPair,
  bootstrapAdmin,
} from "../../src/lib/auth.js";

describe("Auth Library", () => {
  // generateTokenPair only needs a Fastify instance with @fastify/jwt
  // registered (it calls fastify.jwt.sign), so use a lightweight local app.
  const app = Fastify({ logger: false });

  beforeAll(async () => {
    await app.register(fastifyJwt, { secret: "test-secret-auth-lib" });
    await app.ready();
  });

  afterAll(async () => {
    await app.close();
  });

  describe("hashPassword", () => {
    it("returns an argon2id hash string", async () => {
      const hash = await hashPassword("test123");
      expect(hash).toMatch(/^\$argon2id\$/);
    });

    it("returns different hashes for same password (salted)", async () => {
      const hash1 = await hashPassword("test123");
      const hash2 = await hashPassword("test123");
      expect(hash1).not.toBe(hash2);
    });
  });

  describe("verifyPassword", () => {
    it("returns true for matching password", async () => {
      const hash = await hashPassword("test123");
      const result = await verifyPassword("test123", hash);
      expect(result).toBe(true);
    });

    it("returns false for wrong password", async () => {
      const hash = await hashPassword("test123");
      const result = await verifyPassword("wrong-password", hash);
      expect(result).toBe(false);
    });
  });

  describe("generateInviteCode", () => {
    it("returns a 14-character string in XXXX-XXXX-XXXX format", () => {
      const code = generateInviteCode();
      expect(code).toHaveLength(14);
      expect(code).toMatch(/^[0-9A-F]{4}-[0-9A-F]{4}-[0-9A-F]{4}$/);
    });

    it("generates unique codes", () => {
      const codes = new Set(Array.from({ length: 100 }, () => generateInviteCode()));
      expect(codes.size).toBe(100);
    });
  });

  describe("generateTokenPair", () => {
    beforeEach(() => {
      mockRefreshTokenCreate.mockReset();
      mockRefreshTokenCreate.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({
          id: 1,
          createdAt: new Date(),
          ...data,
        }),
      );
    });

    it("returns accessToken and refreshToken strings", async () => {
      const tokens = await generateTokenPair(app, 42);

      expect(tokens.accessToken).toBeDefined();
      expect(typeof tokens.accessToken).toBe("string");
      expect(tokens.refreshToken).toBeDefined();
      expect(typeof tokens.refreshToken).toBe("string");

      // Access token is a valid JWT signed for the user
      const decoded = app.jwt.verify<{ sub: number }>(tokens.accessToken);
      expect(decoded.sub).toBe(42);
    });

    it("stores the refresh token via prisma.refreshToken.create", async () => {
      const tokens = await generateTokenPair(app, 42);

      expect(mockRefreshTokenCreate).toHaveBeenCalledTimes(1);
      const { data } = mockRefreshTokenCreate.mock.calls[0][0];
      expect(data.userId).toBe(42);
      expect(data.token).toBe(tokens.refreshToken);
      // Opaque 32-byte hex token
      expect(data.token).toMatch(/^[0-9a-f]{64}$/);
      // Expiry parsed from JWT_REFRESH_EXPIRY ("30d")
      expect(data.expiresAt).toBeInstanceOf(Date);
      const msFromNow = data.expiresAt.getTime() - Date.now();
      expect(msFromNow).toBeGreaterThan(29 * 24 * 60 * 60 * 1000);
      expect(msFromNow).toBeLessThanOrEqual(30 * 24 * 60 * 60 * 1000);
    });
  });

  describe("bootstrapAdmin", () => {
    beforeEach(() => {
      mockUserCount.mockReset();
      mockUserCreate.mockReset();
      mockUserCreate.mockImplementation(
        async ({ data }: { data: Record<string, unknown> }) => ({ id: 1, ...data }),
      );
    });

    it("creates admin user when no users exist and env vars set", async () => {
      mockUserCount.mockResolvedValue(0);

      const origEmail = process.env.ADMIN_EMAIL;
      const origPassword = process.env.ADMIN_PASSWORD;
      process.env.ADMIN_EMAIL = "admin@test.com";
      process.env.ADMIN_PASSWORD = "AdminPass123";

      await bootstrapAdmin();

      expect(mockUserCreate).toHaveBeenCalledTimes(1);
      const { data } = mockUserCreate.mock.calls[0][0];
      expect(data.email).toBe("admin@test.com");
      expect(data.name).toBe("Admin");
      expect(data.role).toBe("ADMIN");
      expect(data.isActive).toBe(true);
      expect(data.passwordHash).toMatch(/^\$argon2id\$/);

      process.env.ADMIN_EMAIL = origEmail;
      process.env.ADMIN_PASSWORD = origPassword;
    });

    it("does nothing when users already exist", async () => {
      mockUserCount.mockResolvedValue(1);

      const origEmail = process.env.ADMIN_EMAIL;
      const origPassword = process.env.ADMIN_PASSWORD;
      process.env.ADMIN_EMAIL = "admin-skip@test.com";
      process.env.ADMIN_PASSWORD = "AdminPass123";

      await bootstrapAdmin();

      expect(mockUserCreate).not.toHaveBeenCalled();

      process.env.ADMIN_EMAIL = origEmail;
      process.env.ADMIN_PASSWORD = origPassword;
    });

    it("does nothing when ADMIN_EMAIL/ADMIN_PASSWORD are not set", async () => {
      mockUserCount.mockResolvedValue(0);

      const origEmail = process.env.ADMIN_EMAIL;
      const origPassword = process.env.ADMIN_PASSWORD;
      delete process.env.ADMIN_EMAIL;
      delete process.env.ADMIN_PASSWORD;

      await bootstrapAdmin();

      expect(mockUserCreate).not.toHaveBeenCalled();

      if (origEmail !== undefined) process.env.ADMIN_EMAIL = origEmail;
      if (origPassword !== undefined) process.env.ADMIN_PASSWORD = origPassword;
    });
  });
});
