import {
  clearSession,
  getRefreshToken,
  getToken,
  setTokens,
} from "@/lib/auth";
import { getImpersonation } from "@/lib/impersonation";

export const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";

type FetchOptions = RequestInit & {
  token?: string;
};

// ─── Transparent token refresh ─────────────────────────────────────────
// Single in-flight refresh shared across concurrent 401s: the first failed
// request kicks off POST /auth/refresh (rotating — both tokens replaced) and
// every other caller awaits the same promise.

let refreshPromise: Promise<boolean> | null = null;

async function performRefresh(): Promise<boolean> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return false;
  try {
    const res = await fetch(`${API_BASE}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (!res.ok) return false;
    const body = (await res.json()) as {
      accessToken?: string;
      refreshToken?: string;
    };
    if (!body.accessToken || !body.refreshToken) return false;
    setTokens(body.accessToken, body.refreshToken);
    return true;
  } catch {
    return false;
  }
}

function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function handleSessionExpired(): never {
  clearSession();
  if (typeof window !== "undefined") {
    window.location.href = "/login";
  }
  throw new Error("Session expired. Redirecting to login...");
}

function buildHeaders(
  token: string | undefined,
  extra: HeadersInit | undefined,
  withJson: boolean,
): Record<string, string> {
  const auth = token ?? getToken() ?? undefined;
  const impersonation = getImpersonation();
  return {
    ...(withJson ? { "Content-Type": "application/json" } : {}),
    ...(auth ? { Authorization: `Bearer ${auth}` } : {}),
    // Admin "view as role" — attached on every request; the API only honors
    // it for real ADMINs and ignores it on /admin/* routes.
    ...(impersonation
      ? { "X-Impersonate-User-Id": String(impersonation.userId) }
      : {}),
    ...(extra as Record<string, string>),
  };
}

/**
 * Fetch with auth + impersonation headers and a single transparent retry on
 * 401 (refresh the token pair, replay the request once). If the refresh
 * fails the session is cleared and the user is redirected to /login.
 */
async function authorizedFetch(
  path: string,
  opts: FetchOptions,
  withJson: boolean,
): Promise<Response> {
  const { token, headers, ...rest } = opts;

  let res = await fetch(`${API_BASE}${path}`, {
    headers: buildHeaders(token, headers, withJson),
    ...rest,
  });

  // Never try to refresh for auth endpoints themselves (login/refresh/…):
  // a 401 there is a real credential failure, not an expired access token.
  const isAuthPath = path.startsWith("/auth/");

  if (res.status === 401 && !isAuthPath && typeof window !== "undefined") {
    const refreshed = await refreshSession();
    if (!refreshed) handleSessionExpired();
    // Replay exactly once with the fresh access token (ignore any stale
    // explicit token the caller captured before the refresh).
    res = await fetch(`${API_BASE}${path}`, {
      headers: buildHeaders(undefined, headers, withJson),
      ...rest,
    });
    if (res.status === 401) handleSessionExpired();
  }

  return res;
}

export async function apiFetch<T>(
  path: string,
  opts: FetchOptions = {},
): Promise<T> {
  const res = await authorizedFetch(path, opts, true);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `API error ${res.status}`);
  }

  return res.json();
}

/**
 * Download a file (CSV/PDF export) with the Authorization header attached:
 * fetch → blob → synthetic <a download> click.
 */
export async function apiDownload(
  path: string,
  fallbackFilename: string,
): Promise<void> {
  const res = await authorizedFetch(path, {}, false);

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || body.message || `Export failed (${res.status})`);
  }

  // Prefer the server-provided filename when present.
  const disposition = res.headers.get("Content-Disposition") ?? "";
  const match = /filename="?([^";]+)"?/.exec(disposition);
  const filename = match?.[1] ?? fallbackFilename;

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
