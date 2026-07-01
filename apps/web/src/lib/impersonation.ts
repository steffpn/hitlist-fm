/**
 * Admin "view as role" state.
 *
 * When an admin configures an impersonation (POST /admin/impersonation/configure)
 * we persist the returned persona here (sessionStorage — survives reloads,
 * scoped to the tab) and the API client attaches `X-Impersonate-User-Id`
 * on every request. The API only honors it for real ADMINs and ignores it on
 * /admin/* routes, so it is safe to send it unconditionally.
 */

const IMPERSONATION_KEY = "onair_impersonation";
const IMPERSONATION_EVENT = "onair:impersonation";

export interface ImpersonationState {
  userId: number;
  role: "ARTIST" | "LABEL" | "STATION";
  displayName: string;
}

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(IMPERSONATION_EVENT));
  }
}

export function subscribeImpersonation(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(IMPERSONATION_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(IMPERSONATION_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

// Snapshot cache for useSyncExternalStore (must be referentially stable).
let cachedRaw: string | null = null;
let cachedState: ImpersonationState | null = null;

export function getImpersonation(): ImpersonationState | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(IMPERSONATION_KEY);
  if (raw === cachedRaw) return cachedState;
  cachedRaw = raw;
  if (!raw) {
    cachedState = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as ImpersonationState;
    cachedState =
      parsed && typeof parsed.userId === "number" && typeof parsed.role === "string"
        ? parsed
        : null;
  } catch {
    cachedState = null;
  }
  return cachedState;
}

export function setImpersonation(state: ImpersonationState): void {
  sessionStorage.setItem(IMPERSONATION_KEY, JSON.stringify(state));
  emitChange();
}

export function clearImpersonation(): void {
  sessionStorage.removeItem(IMPERSONATION_KEY);
  emitChange();
}
