import { NextRequest, NextResponse } from "next/server";

/**
 * Optional site-wide password gate (HTTP Basic Auth) for the Hitlist Pro web app.
 *
 * - Set `SITE_PASSWORD` in Railway → every page requires that password before the
 *   app (including /login) is reachable — a simple private-preview gate.
 * - Leave `SITE_PASSWORD` unset → the app behaves exactly as before (fail-open).
 *
 * This only gates loading this app's own pages/assets; it does not affect calls
 * to the separate API origin. Runs under `next start` (Node runtime), so it reads
 * the variable at request time — set/unset in Railway, no rebuild needed.
 */
export function middleware(req: NextRequest) {
  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next(); // public when unset

  const header = req.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const supplied = decoded.slice(decoded.indexOf(":") + 1);
      if (supplied === password) return NextResponse.next();
    } catch {
      // fall through to challenge
    }
  }

  return new NextResponse("Authentication required.", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="hitlist.fm", charset="UTF-8"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
