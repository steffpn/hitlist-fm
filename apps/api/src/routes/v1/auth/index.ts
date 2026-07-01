import type { FastifyPluginAsync } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { authenticate } from "../../../middleware/authenticate.js";
import {
  RegisterSchema,
  SignupSchema,
  VerifyEmailSchema,
  type VerifyEmailBody,
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "./schema.js";
import {
  register,
  signup,
  verifyEmail,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  deleteAccount,
} from "./handlers.js";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Rate limiter registered locally with global:false so ONLY routes that
  // set config.rateLimit are limited.
  await fastify.register(rateLimit, { global: false });

  // POST /register - Public (no auth). Invitation-code flow, kept for
  // enterprise/admin onboarding.
  fastify.post(
    "/register",
    {
      schema: { body: RegisterSchema },
    },
    register
  );

  // POST /signup - Public (no auth). Self-serve signup (no invitation code),
  // strictly rate limited: 3 signups/hour per IP.
  fastify.post(
    "/signup",
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "1 hour",
        },
      },
      schema: { body: SignupSchema },
    },
    signup
  );

  // POST /verify-email - Requires authentication (signup hands out tokens
  // immediately). Rate limited as brute-force insurance on 6-digit codes.
  // Generic pinned at the registration site (see typing convention in
  // middleware/authenticate.ts) because the route has schema + preHandler.
  fastify.post<{ Body: VerifyEmailBody }>(
    "/verify-email",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 hour",
        },
      },
      preHandler: [authenticate],
      schema: { body: VerifyEmailSchema },
    },
    verifyEmail
  );

  // POST /login - Public (no auth), rate limited: 10 attempts/minute per IP
  fastify.post(
    "/login",
    {
      config: {
        rateLimit: {
          max: 10,
          timeWindow: "1 minute",
        },
      },
      schema: { body: LoginSchema },
    },
    login
  );

  // POST /refresh - Public (no auth)
  fastify.post(
    "/refresh",
    {
      schema: { body: RefreshSchema },
    },
    refresh
  );

  // POST /logout - Requires authentication
  fastify.post(
    "/logout",
    {
      preHandler: [authenticate],
      schema: { body: LogoutSchema },
    },
    logout
  );

  // POST /forgot-password - Public (no auth), always 200 generic,
  // rate limited: 3 requests/hour per IP
  fastify.post(
    "/forgot-password",
    {
      config: {
        rateLimit: {
          max: 3,
          timeWindow: "1 hour",
        },
      },
      schema: { body: ForgotPasswordSchema },
    },
    forgotPassword
  );

  // POST /reset-password - Public (no auth), consumes a reset token
  fastify.post(
    "/reset-password",
    {
      schema: { body: ResetPasswordSchema },
    },
    resetPassword
  );

  // DELETE /account - Requires authentication, permanently deletes the account
  fastify.delete(
    "/account",
    {
      preHandler: [authenticate],
    },
    deleteAccount
  );
};

export default authRoutes;
