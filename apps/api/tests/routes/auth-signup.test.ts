import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "node:crypto";

// ---- Prisma mock ----
const mockUserFindUnique = vi.fn();
const mockUserCreate = vi.fn();
const mockUserUpdate = vi.fn();
const mockPlanFindFirst = vi.fn();
const mockOrgCreate = vi.fn();
const mockMembershipCreate = vi.fn();
const mockSubscriptionCreate = vi.fn();
const mockVerificationCodeCreate = vi.fn();
const mockVerificationCodeFindFirst = vi.fn();
const mockVerificationCodeUpdate = vi.fn();
const mockRefreshTokenCreate = vi.fn();

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
      create: (...args: unknown[]) => mockUserCreate(...args),
      update: (...args: unknown[]) => mockUserUpdate(...args),
    },
    plan: {
      findFirst: (...args: unknown[]) => mockPlanFindFirst(...args),
    },
    organization: {
      create: (...args: unknown[]) => mockOrgCreate(...args),
    },
    membership: {
      create: (...args: unknown[]) => mockMembershipCreate(...args),
    },
    subscription: {
      create: (...args: unknown[]) => mockSubscriptionCreate(...args),
    },
    emailVerificationCode: {
      create: (...args: unknown[]) => mockVerificationCodeCreate(...args),
      findFirst: (...args: unknown[]) => mockVerificationCodeFindFirst(...args),
      update: (...args: unknown[]) => mockVerificationCodeUpdate(...args),
    },
    refreshToken: {
      create: (...args: unknown[]) => mockRefreshTokenCreate(...args),
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

function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

const premiumPlan = {
  id: 42,
  name: "Artist Premium",
  slug: "artist-premium",
  role: "ARTIST",
  tier: "PREMIUM",
  trialDays: 7,
  isActive: true,
};

const createdUser = {
  id: 100,
  email: "newartist@test.com",
  name: "New Artist",
  role: "ARTIST",
  isActive: true,
  emailVerified: false,
};

const createdOrg = {
  id: 200,
  name: "New Artist",
  type: "ARTIST_TEAM",
};

// Existing (post-signup) user used by the verify-email tests. Shape matches
// the authenticate middleware's include.
const unverifiedUser = {
  id: 100,
  email: "newartist@test.com",
  name: "New Artist",
  role: "ARTIST",
  isActive: true,
  emailVerified: false,
  scopes: [],
  subscriptions: [],
};

describe("Self-serve signup & email verification", () => {
  let server: Awaited<typeof import("../../src/index.js")>["server"];

  beforeEach(async () => {
    mockUserFindUnique.mockReset().mockResolvedValue(null);
    mockUserCreate.mockReset().mockResolvedValue(createdUser);
    mockUserUpdate.mockReset().mockResolvedValue({
      ...createdUser,
      emailVerified: true,
    });
    mockPlanFindFirst.mockReset().mockResolvedValue(premiumPlan);
    mockOrgCreate.mockReset().mockResolvedValue(createdOrg);
    mockMembershipCreate.mockReset().mockResolvedValue({ id: 300 });
    mockSubscriptionCreate.mockReset().mockResolvedValue({ id: 400 });
    mockVerificationCodeCreate.mockReset().mockResolvedValue({ id: 500 });
    mockVerificationCodeFindFirst.mockReset();
    mockVerificationCodeUpdate.mockReset().mockResolvedValue({ id: 500 });
    mockRefreshTokenCreate.mockReset().mockResolvedValue({ id: 600 });
    mockSendEmail.mockReset().mockResolvedValue(undefined);

    const mod = await import("../../src/index.js");
    server = mod.server;
    await server.ready();
  });

  // --- POST /api/v1/auth/signup ---

  describe("POST /api/v1/auth/signup", () => {
    it("creates user + organization + OWNER membership + trial subscription and emails a 6-digit code", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/signup",
        remoteAddress: "10.2.0.1",
        payload: {
          email: "newartist@test.com",
          password: "SecurePass123!",
          name: "New Artist",
          accountType: "artist",
        },
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);

      // Response contract
      expect(body.user).toMatchObject({
        id: 100,
        email: "newartist@test.com",
        name: "New Artist",
        role: "ARTIST",
        emailVerified: false,
      });
      expect(body.organization).toEqual({
        id: 200,
        name: "New Artist",
        type: "ARTIST_TEAM",
      });
      expect(typeof body.accessToken).toBe("string");
      expect(typeof body.refreshToken).toBe("string");

      // User: role from accountType, argon2-hashed password, unverified email
      expect(mockUserCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          email: "newartist@test.com",
          name: "New Artist",
          role: "ARTIST",
          isActive: true,
          emailVerified: false,
          passwordHash: expect.stringMatching(/^\$argon2/),
        }),
      });

      // Organization: type derived from role
      expect(mockOrgCreate).toHaveBeenCalledWith({
        data: { name: "New Artist", type: "ARTIST_TEAM" },
      });

      // OWNER membership linking user <-> org
      expect(mockMembershipCreate).toHaveBeenCalledWith({
        data: { organizationId: 200, userId: 100, role: "OWNER" },
      });

      // Trial on the role's PREMIUM plan, no Stripe fields
      expect(mockPlanFindFirst).toHaveBeenCalledWith({
        where: { role: "ARTIST", tier: "PREMIUM", isActive: true },
      });
      expect(mockSubscriptionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 100,
          organizationId: 200,
          planId: 42,
          status: "trialing",
          billingInterval: "monthly",
          trialEndsAt: expect.any(Date),
        }),
      });
      const subData = mockSubscriptionCreate.mock.calls[0][0] as {
        data: { trialEndsAt: Date; stripeCustomerId?: string };
      };
      expect(subData.data.stripeCustomerId).toBeUndefined();
      const trialMs = subData.data.trialEndsAt.getTime() - Date.now();
      expect(trialMs).toBeGreaterThan(6.9 * 24 * 60 * 60 * 1000);
      expect(trialMs).toBeLessThanOrEqual(7 * 24 * 60 * 60 * 1000);

      // Verification code: only the SHA-256 hash stored, ~24h TTL
      expect(mockVerificationCodeCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          userId: 100,
          codeHash: expect.stringMatching(/^[0-9a-f]{64}$/),
          expiresAt: expect.any(Date),
        }),
      });
      const codeData = mockVerificationCodeCreate.mock.calls[0][0] as {
        data: { codeHash: string; expiresAt: Date };
      };
      const ttlMs = codeData.data.expiresAt.getTime() - Date.now();
      expect(ttlMs).toBeGreaterThan(23 * 60 * 60 * 1000);
      expect(ttlMs).toBeLessThanOrEqual(24 * 60 * 60 * 1000);

      // Email carries the raw 6-digit code that hashes to the stored hash
      expect(mockSendEmail).toHaveBeenCalledTimes(1);
      const emailArgs = mockSendEmail.mock.calls[0][0] as {
        to: string;
        text: string;
      };
      expect(emailArgs.to).toBe("newartist@test.com");
      const codeMatch = emailArgs.text.match(/\b(\d{6})\b/);
      expect(codeMatch).not.toBeNull();
      expect(sha256(codeMatch![1])).toBe(codeData.data.codeHash);
    });

    it("maps accountType station -> STATION role and STATION_GROUP org", async () => {
      mockUserCreate.mockResolvedValueOnce({
        ...createdUser,
        role: "STATION",
      });
      mockOrgCreate.mockResolvedValueOnce({
        ...createdOrg,
        type: "STATION_GROUP",
      });
      mockPlanFindFirst.mockResolvedValueOnce({
        ...premiumPlan,
        role: "STATION",
      });

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/signup",
        remoteAddress: "10.2.0.2",
        payload: {
          email: "station@test.com",
          password: "SecurePass123!",
          name: "Radio X",
          accountType: "station",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(mockUserCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ role: "STATION" }),
      });
      expect(mockOrgCreate).toHaveBeenCalledWith({
        data: { name: "Radio X", type: "STATION_GROUP" },
      });
      expect(mockPlanFindFirst).toHaveBeenCalledWith({
        where: { role: "STATION", tier: "PREMIUM", isActive: true },
      });
    });

    it("returns 409 for an already-registered email without creating anything", async () => {
      mockUserFindUnique.mockResolvedValueOnce(unverifiedUser);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/signup",
        remoteAddress: "10.2.0.3",
        payload: {
          email: "newartist@test.com",
          password: "SecurePass123!",
          name: "Dup",
          accountType: "artist",
        },
      });

      expect(response.statusCode).toBe(409);
      expect(JSON.parse(response.payload).error).toBe("Email already registered");
      expect(mockUserCreate).not.toHaveBeenCalled();
      expect(mockOrgCreate).not.toHaveBeenCalled();
      expect(mockSendEmail).not.toHaveBeenCalled();
    });

    it("rejects accountType admin with 400 (schema-level, handler never runs)", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/signup",
        remoteAddress: "10.2.0.4",
        payload: {
          email: "sneaky@test.com",
          password: "SecurePass123!",
          name: "Sneaky",
          accountType: "admin",
        },
      });

      expect(response.statusCode).toBe(400);
      expect(mockUserFindUnique).not.toHaveBeenCalled();
      expect(mockUserCreate).not.toHaveBeenCalled();
    });

    it("still creates the account (without subscription) when the premium plan is not seeded", async () => {
      mockPlanFindFirst.mockResolvedValueOnce(null);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/signup",
        remoteAddress: "10.2.0.5",
        payload: {
          email: "newartist@test.com",
          password: "SecurePass123!",
          name: "New Artist",
          accountType: "artist",
        },
      });

      expect(response.statusCode).toBe(201);
      expect(mockUserCreate).toHaveBeenCalled();
      expect(mockMembershipCreate).toHaveBeenCalled();
      expect(mockSubscriptionCreate).not.toHaveBeenCalled();
    });

    it("rate limits to 3 signups per hour per IP", async () => {
      // Duplicate-email path keeps the mock choreography trivial: the rate
      // limiter counts requests regardless of the handler outcome.
      mockUserFindUnique.mockResolvedValue(unverifiedUser);

      const inject = () =>
        server.inject({
          method: "POST",
          url: "/api/v1/auth/signup",
          remoteAddress: "10.2.0.6",
          payload: {
            email: "newartist@test.com",
            password: "SecurePass123!",
            name: "Rate Limited",
            accountType: "artist",
          },
        });

      expect((await inject()).statusCode).toBe(409);
      expect((await inject()).statusCode).toBe(409);
      expect((await inject()).statusCode).toBe(409);
      expect((await inject()).statusCode).toBe(429);
    });
  });

  // --- POST /api/v1/auth/verify-email ---

  describe("POST /api/v1/auth/verify-email", () => {
    const rawCode = "123456";

    it("returns 401 without authentication", async () => {
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/verify-email",
        remoteAddress: "10.3.0.1",
        payload: { code: rawCode },
      });

      expect(response.statusCode).toBe(401);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("verifies the email with a valid code and marks the code used", async () => {
      mockUserFindUnique.mockResolvedValue(unverifiedUser);
      mockVerificationCodeFindFirst.mockResolvedValueOnce({
        id: 500,
        userId: unverifiedUser.id,
        codeHash: sha256(rawCode),
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
        usedAt: null,
      });

      const token = server.jwt.sign({ sub: unverifiedUser.id });
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/verify-email",
        remoteAddress: "10.3.0.2",
        headers: { authorization: `Bearer ${token}` },
        payload: { code: rawCode },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        message: "Email verified",
        emailVerified: true,
      });

      // Looked up by owner + hash — never by code alone
      expect(mockVerificationCodeFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            userId: unverifiedUser.id,
            codeHash: sha256(rawCode),
            usedAt: null,
          },
        })
      );
      expect(mockUserUpdate).toHaveBeenCalledWith({
        where: { id: unverifiedUser.id },
        data: { emailVerified: true },
      });
      expect(mockVerificationCodeUpdate).toHaveBeenCalledWith({
        where: { id: 500 },
        data: { usedAt: expect.any(Date) },
      });
    });

    it("returns 400 for a wrong code", async () => {
      mockUserFindUnique.mockResolvedValue(unverifiedUser);
      mockVerificationCodeFindFirst.mockResolvedValueOnce(null);

      const token = server.jwt.sign({ sub: unverifiedUser.id });
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/verify-email",
        remoteAddress: "10.3.0.3",
        headers: { authorization: `Bearer ${token}` },
        payload: { code: "000000" },
      });

      expect(response.statusCode).toBe(400);
      expect(JSON.parse(response.payload).error).toBe(
        "Invalid or expired verification code"
      );
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("returns 400 for an expired code", async () => {
      mockUserFindUnique.mockResolvedValue(unverifiedUser);
      mockVerificationCodeFindFirst.mockResolvedValueOnce({
        id: 501,
        userId: unverifiedUser.id,
        codeHash: sha256(rawCode),
        expiresAt: new Date(Date.now() - 1000), // expired
        usedAt: null,
      });

      const token = server.jwt.sign({ sub: unverifiedUser.id });
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/verify-email",
        remoteAddress: "10.3.0.4",
        headers: { authorization: `Bearer ${token}` },
        payload: { code: rawCode },
      });

      expect(response.statusCode).toBe(400);
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("is idempotent: an already-verified user gets 200 without a code lookup", async () => {
      mockUserFindUnique.mockResolvedValue({
        ...unverifiedUser,
        emailVerified: true,
      });

      const token = server.jwt.sign({ sub: unverifiedUser.id });
      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/verify-email",
        remoteAddress: "10.3.0.5",
        headers: { authorization: `Bearer ${token}` },
        payload: { code: rawCode },
      });

      expect(response.statusCode).toBe(200);
      expect(JSON.parse(response.payload)).toEqual({
        message: "Email already verified",
        emailVerified: true,
      });
      expect(mockVerificationCodeFindFirst).not.toHaveBeenCalled();
      expect(mockUserUpdate).not.toHaveBeenCalled();
    });

    it("login is NOT blocked by emailVerified=false and exposes the flag", async () => {
      // The user from signup is active but unverified — login must succeed.
      const passwordHash = await (
        await import("../../src/lib/auth.js")
      ).hashPassword("SecurePass123!");
      mockUserFindUnique.mockResolvedValue({
        ...unverifiedUser,
        passwordHash,
      });
      mockUserUpdate.mockResolvedValue(unverifiedUser);

      const response = await server.inject({
        method: "POST",
        url: "/api/v1/auth/login",
        remoteAddress: "10.3.0.6",
        payload: { email: unverifiedUser.email, password: "SecurePass123!" },
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.user.emailVerified).toBe(false);
      expect(typeof body.accessToken).toBe("string");
    });
  });
});
