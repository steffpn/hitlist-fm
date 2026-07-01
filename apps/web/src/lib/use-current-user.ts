"use client";

import { useSyncExternalStore } from "react";
import { getStoredUser, subscribeAuth, type StoredUser } from "@/lib/auth";
import {
  getImpersonation,
  subscribeImpersonation,
  type ImpersonationState,
} from "@/lib/impersonation";

const serverSnapshot = () => null;

/**
 * The logged-in user, as returned by POST /auth/login and stored in
 * localStorage. Reactive: updates on login/logout/role changes in this or
 * other tabs. `null` while logged out or during SSR.
 */
export function useCurrentUser(): StoredUser | null {
  return useSyncExternalStore(subscribeAuth, getStoredUser, serverSnapshot);
}

/**
 * The active admin "view as role" impersonation (sessionStorage), or null.
 */
export function useImpersonation(): ImpersonationState | null {
  return useSyncExternalStore(
    subscribeImpersonation,
    getImpersonation,
    serverSnapshot,
  );
}
