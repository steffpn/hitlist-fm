const TOKEN_KEY = "onair_admin_token";
// Pre-rebrand key — read as fallback and migrate so existing sessions survive.
const LEGACY_TOKEN_KEY = "mfm_admin_token";
const REFRESH_TOKEN_KEY = "onair_refresh_token";
const USER_KEY = "onair_user";

export type UserRole = "ADMIN" | "ARTIST" | "LABEL" | "STATION";

export interface StoredUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

const AUTH_EVENT = "onair:auth";

function emitAuthChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

/** Subscribe to auth/session changes (login, logout, user update). */
export function subscribeAuth(callback: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(AUTH_EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    window.removeEventListener(AUTH_EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) return token;
  const legacy = localStorage.getItem(LEGACY_TOKEN_KEY);
  if (legacy) {
    localStorage.setItem(TOKEN_KEY, legacy);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    return legacy;
  }
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  emitAuthChange();
}

/** Store a rotated token pair (used by the transparent refresh flow). */
export function setTokens(accessToken: string, refreshToken: string): void {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  emitAuthChange();
}

/** Store the complete session returned by POST /auth/login. */
export function setSession(session: {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}): void {
  localStorage.setItem(TOKEN_KEY, session.accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, session.refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  emitAuthChange();
}

// Cache the parsed user so getStoredUser can be used as a
// useSyncExternalStore snapshot (must return referentially stable values).
let cachedUserRaw: string | null = null;
let cachedUser: StoredUser | null = null;

export function getStoredUser(): StoredUser | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(USER_KEY);
  if (raw === cachedUserRaw) return cachedUser;
  cachedUserRaw = raw;
  if (!raw) {
    cachedUser = null;
    return null;
  }
  try {
    const parsed = JSON.parse(raw) as StoredUser;
    cachedUser =
      parsed && typeof parsed.id === "number" && typeof parsed.role === "string"
        ? parsed
        : null;
  } catch {
    cachedUser = null;
  }
  return cachedUser;
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  emitAuthChange();
}

/** Alias with a clearer name — clears the whole stored session. */
export function clearSession(): void {
  clearToken();
}

export function isAuthenticated(): boolean {
  return !!getToken();
}
