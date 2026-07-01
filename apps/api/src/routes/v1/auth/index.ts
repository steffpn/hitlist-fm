import type { FastifyPluginAsync } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { authenticate } from "../../../middleware/authenticate.js";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
  ForgotPasswordSchema,
  ResetPasswordSchema,
} from "./schema.js";
import {
  register,
  login,
  refresh,
  logout,
  forgotPassword,
  resetPassword,
  deleteAccount,
} from "./handlers.js";

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Rate limiter registered locally with global:false so ONLY routes that
  // set config.rateLimit are limited (currently just /login).
  await fastify.register(rateLimit, { global: false });

  // POST /register - Public (no auth)
  fastify.post(
    "/register",
    {
      schema: { body: RegisterSchema },
    },
    register
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
