import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

// ---- Prisma mock ----
const mockQueryRaw = vi.fn();
const mockUserFindUnique = vi.fn();
const mockUserCount = vi.fn();
const mockUserUpdate = vi.fn();
const mockUserDelete = vi.fn();
const mockResetTokenFindUnique = vi.fn();
const mockResetTokenCreate = vi.fn();
const mockResetTokenDeleteMany = vi.fn();
const mockResetTokenUpdate = vi.fn();
const mockRefreshTokenUpdateMany = vi.fn();
const mockInvitationDeleteMany = vi.fn();
const mockMissingSongReportDeleteMany = vi.fn();
const mockLabelArtistUpdateMany = vi.fn();

vi.mock("../../src/lib/prisma.js", () => {
  const prisma = {
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
    $disconnect: vi.fn().mockResolvedValue(undefined),
    $transaction: (arg: unknown) =>
      Array.isArray(arg)
        ? Promise.all(arg)
        : (arg as (tx: unknown) => unknown)(prisma),
    user: {
      findUnique: (...args: unknown[]) => mockUserFindUnique(...args),
      count: (...args: unknown[]) => mockUserCount(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
      delete: (...args: unknown[]) => mockUserDelete(...args),
    },
    passwordResetToken: {
      findUnique: (...args: unknown[]) => mockResetTokenFindUnique(...args),
      create: (...args: unknown[]) => mockResetTokenCreate(...args),
      deleteMany: (...args: unknown[]) => mockResetTokenDeleteMany(...args),
      update: (...args: unknown[]) => mockResetTokenUpdate(...args),
    },
    refreshToken: {
      updateMany: (...args: unknown[]) => mockRefreshTokenUpdateMany(...args),
    },
    invitation: {
      deleteMany: (...args: unknown[]) => mockInvitationDeleteMany(...args),
    },
    missingSongReport: {
      deleteMany: (...args: unknown[]) =>
        mockMissingSongReportDeleteMany(...args),
    },
    labelArtist: {
      updateMany: (...args: unknown[]) => mockLabelArtistUpdateMany(...args),
    },
    airplayEvent: {
      findUnique: vi.fn(),
    },
  };
  return { prisma };
});

// ---- Email mock ----
const mockSendEmail = vi.fn();

vi.mock("../../src/lib/email.js", () => ({
  sendEmail: (...args: unknown[]) => mockSendEmail(...args),
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
const artistUser = {
  id: 10,
  email: "artist@test.com",
  name: "Artist User",
  role: "ARTIST",
  isActive: true,
  scopes: [],
  subscriptions: [],
};

const adminUser = {
  id: 11,
  email: "admin@test.com",
  name: "Admin User",
  role: "ADMIN",
  isActive: true,
  scopes: [],
  subscriptions: [],
};

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

describe("Auth password reset & account deletion", () => {
  let server: Awaited<typeof import("../../src/index.js")>["server"];

  beforeEach(async () => {
    mockQueryRaw.mockClear();
    mockUserFindUnique.mockReset();
    mockUserCount.mockReset().mockResolvedValue(5);
    mockUserUpdate.mockReset().mockResolvedValue(artistUser);
    mockUserDelete.mockReset().mockResolvedValue(artistUser);
    mockResetTokenFindUnique.mockReset();
    mockResetTokenCreate.mockReset().mockResolvedValue({ id: 1 });
    mockResetTokenDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    mockResetTokenUpdate.mockReset().mockResolvedValue({ id: 1 });
    mockRefreshTokenUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockInvitationDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    mockMissingSongReportDeleteMany.mockReset().mockResolvedValue({ count: 0 });
    mockLabelArtistUpdateMany.mockReset().mockResolvedValue({ count: 0 });
    mockSendEmail.mockReset().mockResolvedValue(undefined);

    const mod = await import("../../src/index.js");
    server = mod.server;
    await server.ready();

    // Default lookup for the authenticate middleware (by id) and the
    // forgot-password handler (by email).
    mockUserFindUnique.mockImplementation(
      ({ where }: { where: { id?: number; email?: string } }) => {
        if (where.id === artistUser.id || where.email === artistUser.email) {
          return Promise.resolve(artistUser);
        }
        if (where.id === adminUser.id || where.email === adminUser.email) {
          return Promise.resolve(adminUser);
        }
        return Promise.resolve(null);
      }
    );
  });

  // --- POST /api/v1/auth/forgot-password ---

  describe("POST /api/v1/auth/forgot-password", () => {
    const genericMessage =
      "If an account exists for that email, a password reset link has been sent.";

    it("returns generic 200, stores a hashed token, and sends the email when the user exists", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        remoteAddress: "10.1.0.1",
        payload: { email: artistUser.email },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ message: genericMessage });

      // Previous unused tokens invalidated
      expect(mockResetTokenDeleteMany).toHaveBeenCalledWith({
        where: { userId: artistUser.id, usedAt: null },
      });

      // Only the SHA-256 hash is stored, with a ~1h expiry
      expect(mockResetTokenCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: artistUser.id,
          tokenHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          expiresAt: expect.any(Date),
        }),
      });
      const createArgs = mockResetTokenCreate.mock.calls[0][0] as {
        data: { tokenHash: string; expiresAt: Date };
      };
      const ttlMs = createArgs.data.expiresAt.getTime() - Date.now();
      expect(ttlMs).toBeGreaterThan(55 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000);

      // Email contains a reset link whose raw token hashes to the stored hash
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      const emailArgs = mockSendEmail.mock.calls[0][0] as {
        to: string;
        subject: string;
        text: string;
      };
      expect(emailArgs.to).toBe(artistUser.email);
      const tokenMatch = emailArgs.text.match(/reset-password\?token=([0-9a-f]{64})/);
      expect(tokenMatch).not.toBeNull();
      expect(sha256(tokenMatch![1])).toBe(createArgs.data.tokenHash);
    });

    it("returns the identical generic 200 and does nothing when the user does not exist", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        remoteAddress: "10.1.0.2",
        payload: { email: "nobody@test.com" },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ message: genericMessage });
      expect(mockResetTokenCreate).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("returns the identical generic 200 and does nothing for a deactivated user", async () => {
      mockUserFindUnique.mockResolvedValueOnce({
        ...artistUser,
        isActive: false,
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/forgot-password",
        remoteAddress: "10.1.0.3",
        payload: { email: artistUser.email },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({ message: genericMessage });
      expect(mockResetTokenCreate).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("rate limits to 3 requests per hour per IP", async () => {
      const inject = () =>
        server.inject({
          method: "POST",
          url: "/api/v1/auth/forgot-password",
          remoteAddress: "10.1.0.4",
          payload: { email: "nobody@test.com" },
        });

      expect((await inject()).statusCode).toBe(200);
      expect((await inject()).statusCode).toBe(200);
      expect((await inject()).statusCode).toBe(200);
      expect((await inject()).statusCode).toBe(429);
    });
  });

  // --- POST /api/v1/auth/reset-password ---

  describe("POST /api/v1/auth/reset-password", () => {
    const rawToken = "b".repeat(64);

    it("resets the password, marks the token used, and revokes all refresh tokens", async () => {
      mockResetTokenFindUnique.mockResolvedValueOnce({
        id: 77,
        userId: artistUser.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        usedAt: null,
        user: { ...artistUser },
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: { token: rawToken, newPassword: "NewSecurePass123!" },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        message: "Password has been reset",
      });

      // Token looked up by its SHA-256 hash, never the raw value
      expect(mockResetTokenFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { tokenHash: sha256(rawToken) } })
      );

      // Password stored as an argon2 hash (same hashing as register)
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: artistUser.id },
        data: { passwordHash: expect.stringMatching(/^\$argon2/) },
      });

      // Token single-use
      expect(mockResetTokenUpdate).toHaveBeenCalledWith({
        where: { id: 77 },
        data: { usedAt: expect.any(Date) },
      });

      // All active sessions killed
      expect(mockRefreshTokenUpdateMany).toHaveBeenCalledWith({
        where: { userId: artistUser.id, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
    });

    it("returns 400 for an expired token", async () => {
      mockResetTokenFindUnique.mockResolvedValueOnce({
        id: 78,
        userId: artistUser.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() - 1000), // expired
        usedAt: null,
        user: { ...artistUser },
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: { token: rawToken, newPassword: "NewSecurePass123!" },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error).toBe(
        "Invalid or expired reset token"
      );
      expect(mockUserUpdate).not.toHaveBeenCalled();
      expect(mockRefreshTokenUpdateMany).not.toHaveBeenCalled();
    });

    it("returns 400 for an already-used token", async () => {
      mockResetTokenFindUnique.mockResolvedValueOnce({
        id: 79,
        userId: artistUser.id,
        tokenHash: sha256(rawToken),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
        usedAt: new Date(), // already used
        user: { ...artistUser },
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: { token: rawToken, newPassword: "NewSecurePass123!" },
      });

      expect(response.statusCode).toBe(400);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("returns 400 for an unknown token", async () => {
      mockResetTokenFindUnique.mockResolvedValueOnce(null);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: { token: "deadbeef", newPassword: "NewSecurePass123!" },
      });

      expect(response.statusCode).toBe(400);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("returns 400 when the new password is shorter than 8 characters", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/reset-password",
        payload: { token: rawToken, newPassword: "short" },
      });

      expect(response.statusCode).toBe(400);
      expect(mockResetTokenFindUnique).not.toHaveBeenCalled();
    });
  });

  // --- DELETE /api/v1/auth/account ---

  describe("DELETE /api/v1/auth/account", () => {
    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/auth/account",
      });

      expect(response.statusCode).toBe(401);
      expect(mockUserDelete).not.toHaveBeenCalled();
    });

    it("deletes the account and its non-cascading relations, returns 204", async () => {
      const token = server.jwt.sign({ sub: artistUser.id });

      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/auth/account",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(204);

      expect(mockInvitationDeleteMany).toHaveBeenCalledWith({
        where: { createdById: artistUser.id },
      });
      expect(mockMissingSongReportDeleteMany).toHaveBeenCalledWith({
        where: { reportedBy: artistUser.id },
      });
      expect(mockLabelArtistUpdateMany).toHaveBeenCalledWith({
        where: { artistUserId: artistUser.id },
        data: { artistUserId: null },
      });
      expect(mockUserDelete).toHaveBeenCalledWith({
        where: { id: artistUser.id },
      });
    });

    it("refuses to delete the last active admin account with 409", async () => {
      const token = server.jwt.sign({ sub: adminUser.id });
      mockUserCount.mockResolvedValueOnce(1); // only one active admin left

      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/auth/account",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.payload).error).toBe(
        "Cannot delete the last active admin account"
      );
      expect(mockUserCount).toHaveBeenCalledWith({
        where: { role: "ADMIN", isActive: true },
      });
      expect(mockUserDelete).not.toHaveBeenCalled();
    });

    it("deletes an admin account when another active admin remains", async () => {
      const token = server.jwt.sign({ sub: adminUser.id });
      mockUserCount.mockResolvedValueOnce(2);

      const response = await server.inject({
        method: "DELETE",
        url: "/api/v1/auth/account",
        headers: { authorization: `Bearer ${token}` },
      });

      expect(response.statusCode).toBe(204);
      expect(mockUserDelete).toHaveBeenCalledWith({
        where: { id: adminUser.id },
      });
    });
  });
});
