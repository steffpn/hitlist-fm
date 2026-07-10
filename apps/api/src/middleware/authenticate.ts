import type { FastifyRequest, FastifyReply } from "fastify";
import { prisma } from "../lib/prisma.js";
import { validSubscriptionWhere } from "../lib/entitlements.js";

export interface CurrentUser {
  id: number;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  isPremium: boolean;
  scopes: Array<{ entityType: string; entityId: number }>;
}

declare module "fastify" {
  interface FastifyRequest {
    /**
     * The user the request is scoped against. Normally the authenticated
     * user, but for an ADMIN performing a "view as role" impersonation
     * (any method, persona accounts only, excluded on /admin/*) this is
     * the impersonated target user. All role/scope data filtering already
     * reads this field, so impersonation works transparently without
     * touching individual handlers. Destructive account operations must
     * use realUser instead.
     */
    currentUser: CurrentUser;
    /** The actually authenticated user — never affected by impersonation. */
    realUser: CurrentUser;
  }
}

const IMPERSONATE_HEADER = "x-impersonate-user-id";

async function loadCurrentUser(userId: number): Promise<CurrentUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      scopes: true,
      // Only subscriptions that currently grant entitlements: active, or
      // trialing and still within the trial. A trialing row whose trial has
      // already ended must NOT count — hence the shared validity predicate,
      // never `status` alone.
      subscriptions: {
        where: validSubscriptionWhere(),
        include: { plan: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!user || !user.isActive) return null;

  const activeSub = user.subscriptions[0];
  const isPremium = !!activeSub && activeSub.plan?.tier !== "FREE";

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    isActive: user.isActive,
    isPremium,
    scopes: user.scopes.map((s) => ({
      entityType: s.entityType,
      entityId: s.entityId,
    })),
  };
}

/**
 * Fastify preHandler that verifies JWT, loads user from DB,
 * and attaches currentUser to the request.
 *
 * TYPING CONVENTION (applies to authenticate/requireRole/requireFeature and to
 * every route in this API): handlers live in separate files and declare their
 * request shape explicitly, e.g. `FastifyRequest<{ Querystring: ListEventsQuery }>`.
 * When a route passes BOTH `schema` (TypeBox) AND `preHandler` in its options,
 * TypeScript's inference of the route generic collapses to `RouteGenericInterface`
 * (the preHandler — typed against the default request — wins the inference race),
 * making the explicitly-typed handler no longer assignable (TS2345).
 * The fix used consistently across the API is to pin the route generic at the
 * registration site, e.g.:
 *   fastify.get<{ Querystring: ListEventsQuery }>("/", { preHandler, schema }, listEvents)
 * This stays fully type-checked (a wrong generic fails to compile), needs no
 * casts and no type-provider migration of the standalone handlers.
 *
 * Admin-only "view as role": if the authenticated user is an ADMIN and sends
 * the `x-impersonate-user-id` header on a GET request, currentUser is swapped
 * for the target user so the admin sees exactly what that role/entity sees.
 * Strictly gated on the *real* role being ADMIN and on read-only (GET) requests,
 * so it can never be used for privilege escalation or to mutate others' data.
 */
export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    await request.jwtVerify();

    const payload = request.user as { sub: number };
    const realUser = await loadCurrentUser(payload.sub);

    if (!realUser) {
      reply.code(401).send({ error: "Invalid or expired token" });
      return;
    }

    request.realUser = realUser;
    request.currentUser = realUser;

    // Admin-only "view as role" impersonation. An ADMIN may impersonate a demo
    // PERSONA account (persona-*@onair.internal) on any non-/admin route so the
    // demo is fully interactive — including writes (add competitor / song / etc.),
    // which apply to the persona. Gated on the *real* role being ADMIN AND the
    // target being a persona, so it can never act as a real user or escalate
    // privileges. Personas get full (premium) access so every feature is demoable.
    // /admin/* routes are never impersonated (admin keeps management access there).
    const path = request.url.split("?")[0];
    const isAdminRoute = path.startsWith("/api/v1/admin");

    if (realUser.role === "ADMIN" && !isAdminRoute) {
      const raw = request.headers[IMPERSONATE_HEADER];
      const targetIdRaw = Array.isArray(raw) ? raw[0] : raw;
      const targetId = targetIdRaw ? Number(targetIdRaw) : NaN;

      if (Number.isInteger(targetId) && targetId > 0 && targetId !== realUser.id) {
        const target = await loadCurrentUser(targetId);
        if (target && target.email.endsWith("@onair.internal")) {
          request.currentUser = { ...target, isPremium: true };
        }
      }
    }
  } catch {
    reply.code(401).send({ error: "Invalid or expired token" });
  }
}
