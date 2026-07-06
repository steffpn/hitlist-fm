import crypto from "node:crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import { prisma } from "../../../lib/prisma.js";
import {
  hashPassword,
  verifyPassword,
  generateTokenPair,
} from "../../../lib/auth.js";
import { sendEmail } from "../../../lib/email.js";
import type {
  RegisterBody,
  SignupBody,
  VerifyEmailBody,
  LoginBody,
  RefreshBody,
  LogoutBody,
  ForgotPasswordBody,
  ResetPasswordBody,
} from "./schema.js";

const RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour
const VERIFICATION_CODE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/** accountType (public signup vocabulary) -> users.role / Plan.role */
const ACCOUNT_TYPE_TO_ROLE: Record<SignupBody["accountType"], string> = {
  artist: "ARTIST",
  label: "LABEL",
  station: "STATION",
};

/** users.role -> Organization.type */
const ROLE_TO_ORG_TYPE: Record<string, string> = {
  ARTIST: "ARTIST_TEAM",
  LABEL: "LABEL",
  STATION: "STATION_GROUP",
};

/** SHA-256 hex digest — used so raw reset tokens / verify codes are never stored. */
function sha256(value: string): string {
  return crypto.createHash("sha256").update(value).digest("hex");
}

/**
 * Format a user record for API responses.
 * Only returns public fields -- never passwordHash.
 * emailVerified is informational only (login is never blocked by it);
 * clients may show a "verify your email" banner while it is false.
 */
function formatUser(user: {
  id: number;
  email: string;
  name: string;
  role: string;
  emailVerified?: boolean;
}) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    emailVerified: user.emailVerified ?? false,
  };
}

/**
 * POST /auth/register
 *
 * Validates invitation code, creates user, generates tokens.
 * Creates UserScope if the invitation has a scopeId.
 */
export async function register(
  request: FastifyRequest<{ Body: RegisterBody }>,
  reply: FastifyReply
): Promise<void> {
  const { code, email, password, name } = request.body;

  // Find invitation by code
  const invitation = await prisma.invitation.findUnique({
    where: { code },
  });

  if (!invitation) {
    return reply.code(400).send({ error: "Invalid invitation code" });
  }

  // Validate invitation status
  if (invitation.status !== "PENDING") {
    return reply.code(400).send({ error: "Invitation code is no longer valid" });
  }

  // Check expiry
  if (invitation.expiresAt < new Date()) {
    return reply.code(400).send({ error: "Invitation code has expired" });
  }

  // Check maxUses
  if (invitation.usedCount >= invitation.maxUses) {
    return reply.code(400).send({ error: "Invitation code has been fully used" });
  }

  // Check email uniqueness
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    return reply.code(409).send({ error: "Email already registered" });
  }

  // Hash password
  const passwordHash = await hashPassword(password);

  // Create user, update invitation, and optionally create scope in a transaction
  const newUsedCount = invitation.usedCount + 1;
  const newStatus = newUsedCount >= invitation.maxUses ? "REDEEMED" : "PENDING";

  const user = await prisma.$transaction(async (tx) => {
    // Create user with role from invitation
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        role: invitation.role,
        isActive: true,
      },
    });

    // Create UserScope if invitation has scopeId
    if (invitation.scopeId !== null) {
      await tx.userScope.create({
        data: {
          userId: createdUser.id,
          entityType: invitation.role,
          entityId: invitation.scopeId,
        },
      });
    }

    // Update invitation usage
    await tx.invitation.update({
      where: { id: invitation.id },
      data: {
        usedCount: newUsedCount,
        status: newStatus,
      },
    });

    return createdUser;
  });

  // Generate token pair
  const tokens = await generateTokenPair(request.server, user.id);

  return reply.code(201).send({
    user: formatUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

/**
 * POST /auth/signup
 *
 * Self-serve signup — no invitation code (invitations remain the
 * enterprise/admin path). In one transaction creates:
 *   - User (role from accountType; "admin" is unrepresentable in the schema),
 *     emailVerified=false but active immediately (login is NOT blocked),
 *   - Organization (type from role) + OWNER Membership,
 *   - trial Subscription on the role's PREMIUM plan (status "trialing",
 *     trialEndsAt = now + plan.trialDays, no Stripe objects). If the premium
 *     plan is not seeded, signup still succeeds without a subscription
 *     (logged) — feature gating then treats the user as free tier.
 *
 * A 6-digit verification code (SHA-256 hash stored in
 * email_verification_codes, 24h TTL) is emailed via lib/email.ts, which is
 * env-gated: without RESEND_API_KEY it logs the email instead of sending.
 *
 * Rate limited at the route level: 3 signups/hour/IP.
 */
export async function signup(
  request: FastifyRequest<{ Body: SignupBody }>,
  reply: FastifyReply
): Promise<void> {
  const { email, password, name, accountType } = request.body;
  const role = ACCOUNT_TYPE_TO_ROLE[accountType];

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    return reply.code(409).send({ error: "Email already registered" });
  }

  const passwordHash = await hashPassword(password);

  // The role's premium plan drives the trial. Missing plan (unseeded env)
  // must not block account creation.
  const premiumPlan = await prisma.plan.findFirst({
    where: { role, tier: "PREMIUM", isActive: true },
  });
  if (!premiumPlan) {
    request.log.warn(
      { role },
      "signup: no active PREMIUM plan for role — user created without trial subscription"
    );
  }

  // 6-digit verification code; only its hash is persisted.
  const verificationCode = crypto.randomInt(0, 1_000_000).toString().padStart(6, "0");

  const { user, organization } = await prisma.$transaction(async (tx) => {
    const createdUser = await tx.user.create({
      data: {
        email,
        passwordHash,
        name,
        role,
        isActive: true,
        emailVerified: false,
      },
    });

    const createdOrg = await tx.organization.create({
      data: {
        name,
        type: ROLE_TO_ORG_TYPE[role],
      },
    });

    await tx.membership.create({
      data: {
        organizationId: createdOrg.id,
        userId: createdUser.id,
        role: "OWNER",
      },
    });

    if (premiumPlan) {
      await tx.subscription.create({
        data: {
          userId: createdUser.id,
          organizationId: createdOrg.id,
          planId: premiumPlan.id,
          status: "trialing",
          billingInterval: "monthly",
          trialEndsAt: new Date(
            Date.now() + premiumPlan.trialDays * 24 * 60 * 60 * 1000
          ),
        },
      });
    }

    await tx.emailVerificationCode.create({
      data: {
        userId: createdUser.id,
        codeHash: sha256(verificationCode),
        expiresAt: new Date(Date.now() + VERIFICATION_CODE_TTL_MS),
      },
    });

    return { user: createdUser, organization: createdOrg };
  });

  // sendEmail never throws (env-gated: logs the email without RESEND_API_KEY).
  await sendEmail({
    to: user.email,
    subject: "Verify your hitlist.fm email",
    text: [
      `Hi ${user.name},`,
      "",
      "Welcome to hitlist.fm! Your email verification code is:",
      "",
      verificationCode,
      "",
      "The code is valid for 24 hours.",
      "If you didn't create this account, you can safely ignore this email.",
    ].join("\n"),
    html: [
      `<p>Hi ${user.name},</p>`,
      "<p>Welcome to hitlist.fm! Your email verification code is:</p>",
      `<p style="font-size:24px;font-weight:bold;letter-spacing:4px">${verificationCode}</p>`,
      "<p>The code is valid for 24 hours.</p>",
      "<p>If you didn't create this account, you can safely ignore this email.</p>",
    ].join("\n"),
  });

  const tokens = await generateTokenPair(request.server, user.id);

  return reply.code(201).send({
    user: formatUser(user),
    organization: {
      id: organization.id,
      name: organization.name,
      type: organization.type,
    },
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

/**
 * POST /auth/verify-email
 *
 * Authenticated (signup returns tokens immediately, so the client already
 * has a session): consumes the 6-digit code and sets emailVerified=true.
 * Requiring auth scopes the lookup to the caller's own codes, so a 6-digit
 * code can never verify (or be brute-forced against) another account.
 * Operates on realUser — admin persona impersonation must never flip a
 * persona's verification state.
 *
 * Idempotent: an already-verified user gets 200 without needing a code row.
 * Rate limited at the route level (10/hour/IP) as brute-force insurance on
 * the 1e6 code space.
 */
export async function verifyEmail(
  request: FastifyRequest<{ Body: VerifyEmailBody }>,
  reply: FastifyReply
): Promise<void> {
  const { code } = request.body;
  const user = request.realUser ?? request.currentUser;

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) {
    return reply.code(401).send({ error: "Invalid or expired token" });
  }

  if (dbUser.emailVerified) {
    return reply
      .code(200)
      .send({ message: "Email already verified", emailVerified: true });
  }

  const storedCode = await prisma.emailVerificationCode.findFirst({
    where: { userId: user.id, codeHash: sha256(code), usedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!storedCode || storedCode.expiresAt < new Date()) {
    return reply
      .code(400)
      .send({ error: "Invalid or expired verification code" });
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true },
    }),
    prisma.emailVerificationCode.update({
      where: { id: storedCode.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return reply
    .code(200)
    .send({ message: "Email verified", emailVerified: true });
}

/**
 * POST /auth/login
 *
 * Authenticates user by email + password, returns tokens.
 */
export async function login(
  request: FastifyRequest<{ Body: LoginBody }>,
  reply: FastifyReply
): Promise<void> {
  const { email, password } = request.body;

  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email },
  });

  // Opaque error for both missing user and wrong password
  if (!user || !user.isActive) {
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  // Verify password
  const passwordValid = await verifyPassword(password, user.passwordHash);
  if (!passwordValid) {
    return reply.code(401).send({ error: "Invalid credentials" });
  }

  // Update lastLoginAt
  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  // Generate token pair
  const tokens = await generateTokenPair(request.server, user.id);

  return reply.code(200).send({
    user: formatUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

/**
 * POST /auth/refresh
 *
 * Accepts a valid refresh token, rotates it (revokes old, creates new).
 */
export async function refresh(
  request: FastifyRequest<{ Body: RefreshBody }>,
  reply: FastifyReply
): Promise<void> {
  const { refreshToken } = request.body;

  // Find the refresh token in DB
  const storedToken = await prisma.refreshToken.findUnique({
    where: { token: refreshToken },
    include: { user: true },
  });

  // Validate token
  if (!storedToken) {
    return reply.code(401).send({ error: "Invalid refresh token" });
  }

  if (storedToken.revokedAt !== null) {
    return reply.code(401).send({ error: "Invalid refresh token" });
  }

  if (storedToken.expiresAt < new Date()) {
    return reply.code(401).send({ error: "Invalid refresh token" });
  }

  if (!storedToken.user.isActive) {
    return reply.code(401).send({ error: "Invalid refresh token" });
  }

  // Revoke old token
  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  // Generate new token pair
  const tokens = await generateTokenPair(request.server, storedToken.userId);

  return reply.code(200).send({
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  });
}

/**
 * POST /auth/logout
 *
 * Revokes the provided refresh token. Requires authentication.
 */
export async function logout(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const { refreshToken } = request.body as LogoutBody;
  const userId = request.currentUser.id;

  // Find the refresh token belonging to the current user
  const storedToken = await prisma.refreshToken.findFirst({
    where: {
      token: refreshToken,
      userId,
    },
  });

  if (storedToken) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
  }

  return reply.code(200).send({ message: "Logged out" });
}

/**
 * POST /auth/forgot-password
 *
 * Always answers with the same generic 200 so the endpoint cannot be used
 * for user enumeration. When the email belongs to an active user, a
 * single-use reset token (1h TTL) is created — only its SHA-256 hash is
 * stored — and a reset link is emailed.
 */
export async function forgotPassword(
  request: FastifyRequest<{ Body: ForgotPasswordBody }>,
  reply: FastifyReply
): Promise<void> {
  const { email } = request.body;
  const genericResponse = {
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user || !user.isActive) {
    return reply.code(200).send(genericResponse);
  }

  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = sha256(token);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS);

  // Invalidate any previous unused tokens, then store only the hash.
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({
      where: { userId: user.id, usedAt: null },
    }),
    prisma.passwordResetToken.create({
      data: { userId: user.id, tokenHash, expiresAt },
    }),
  ]);

  const baseUrl =
    process.env.APP_BASE_URL || process.env.WEB_APP_URL || "http://localhost:3001";
  const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;

  // sendEmail never throws — a delivery failure cannot alter the generic 200.
  await sendEmail({
    to: user.email,
    subject: "Reset your hitlist.fm password",
    text: [
      `Hi ${user.name},`,
      "",
      "We received a request to reset your hitlist.fm password.",
      "Open the link below to choose a new one (valid for 1 hour):",
      "",
      resetUrl,
      "",
      "If you didn't request this, you can safely ignore this email.",
    ].join("\n"),
    html: [
      `<p>Hi ${user.name},</p>`,
      "<p>We received a request to reset your hitlist.fm password.</p>",
      `<p><a href="${resetUrl}">Reset your password</a> (link valid for 1 hour)</p>`,
      "<p>If you didn't request this, you can safely ignore this email.</p>",
    ].join("\n"),
  });

  return reply.code(200).send(genericResponse);
}

/**
 * POST /auth/reset-password
 *
 * Validates the reset token (hash match, unexpired, unused), sets the new
 * password with the same argon2id hashing as register, marks the token as
 * used, and revokes ALL of the user's refresh tokens so stolen sessions die.
 */
export async function resetPassword(
  request: FastifyRequest<{ Body: ResetPasswordBody }>,
  reply: FastifyReply
): Promise<void> {
  const { token, newPassword } = request.body;

  const storedToken = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: sha256(token) },
    include: { user: true },
  });

  if (
    !storedToken ||
    storedToken.usedAt !== null ||
    storedToken.expiresAt < new Date() ||
    !storedToken.user.isActive
  ) {
    return reply.code(400).send({ error: "Invalid or expired reset token" });
  }

  const passwordHash = await hashPassword(newPassword);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: storedToken.userId },
      data: { passwordHash },
    }),
    prisma.passwordResetToken.update({
      where: { id: storedToken.id },
      data: { usedAt: new Date() },
    }),
    prisma.refreshToken.updateMany({
      where: { userId: storedToken.userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);

  return reply.code(200).send({ message: "Password has been reset" });
}

/**
 * DELETE /auth/account
 *
 * Permanently deletes the authenticated user's account and all their data.
 * Most relations cascade at the DB level; the three that don't are handled
 * explicitly in the same transaction:
 *   - Invitation.createdBy      -> invitations created by the user are deleted
 *   - MissingSongReport.reporter -> the user's reports are deleted
 *   - LabelArtist.artistUser     -> nullable link, set to NULL (the label's
 *                                   roster entry survives, just unlinked)
 *
 * Always operates on the *real* authenticated user (never an impersonated
 * persona), and refuses to delete the last active ADMIN account.
 */
export async function deleteAccount(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Deletion is destructive — never let admin "view as role" impersonation
  // redirect it to another account.
  const user = request.realUser ?? request.currentUser;

  if (user.role === "ADMIN") {
    const activeAdminCount = await prisma.user.count({
      where: { role: "ADMIN", isActive: true },
    });
    if (activeAdminCount <= 1) {
      return reply
        .code(409)
        .send({ error: "Cannot delete the last active admin account" });
    }
  }

  await prisma.$transaction([
    prisma.invitation.deleteMany({ where: { createdById: user.id } }),
    prisma.missingSongReport.deleteMany({ where: { reportedBy: user.id } }),
    prisma.labelArtist.updateMany({
      where: { artistUserId: user.id },
      data: { artistUserId: null },
    }),
    // Everything else (refresh/device/reset tokens, scopes, watched stations,
    // monitored songs, label rosters, subscriptions, alerts, reports,
    // settings) cascades via onDelete: Cascade.
    prisma.user.delete({ where: { id: user.id } }),
  ]);

  return reply.code(204).send();
}
