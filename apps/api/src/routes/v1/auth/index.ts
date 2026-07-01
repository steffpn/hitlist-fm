import type { FastifyPluginAsync } from "fastify";
import rateLimit from "@fastify/rate-limit";
import { authenticate } from "../../../middleware/authenticate.js";
import {
  RegisterSchema,
  LoginSchema,
  RefreshSchema,
  LogoutSchema,
} from "./schema.js";
import { register, login, refresh, logout } from "./handlers.js";

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
};

export default authRoutes;
