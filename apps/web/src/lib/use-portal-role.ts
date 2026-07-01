"use client";

import { useCurrentUser, useImpersonation } from "@/lib/use-current-user";

export type PortalRole = "ARTIST" | "LABEL" | "STATION";

/**
 * The role whose portal is being shown: the user's own role for non-admins,
 * or the impersonated persona's role while an admin is in "view as role".
 * `null` while logged out / before hydration / admin without impersonation.
 */
export function usePortalRole(): {
  role: PortalRole | null;
  displayName: string;
} {
  const user = useCurrentUser();
  const impersonation = useImpersonation();

  if (!user) return { role: null, displayName: "" };

  if (user.role === "ADMIN") {
    return impersonation
      ? { role: impersonation.role, displayName: impersonation.displayName }
      : { role: null, displayName: user.name };
  }

  return { role: user.role as PortalRole, displayName: user.name };
}
