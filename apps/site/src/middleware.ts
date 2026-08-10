import { NextRequest, NextResponse } from "next/server";

/**
 * Optional site-wide password gate (HTTP Basic Auth).
 *
 * - Set `SITE_PASSWORD` in Railway → every page/route requires that password
 *   (browser shows a native login prompt; any username, the password must match).
 * - Leave `SITE_PASSWORD` unset → the whole site is public (fail-open). Nothing
 *   changes until you set the variable, and removing it re-opens the site.
 *
 * Runs in the Node runtime under `next start`, so it reads the variable at
 * request time — set/unset it in Railway and redeploy, no rebuild needed.
 */
/**
 * Legal documents stay reachable even while the gate is on. App Review (and Beta
 * App Review for TestFlight external testing) has to be able to open the privacy
 * policy without a password, and these pages are public documents by nature.
 */
const ALWAYS_PUBLIC = [
  "/privacy",
  "/terms",
  "/cookie-policy",
  "/copyright-policy",
  "/data-policy",
  "/submission-terms",
  "/subscription-terms",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (ALWAYS_PUBLIC.some((p) => pathname === p || pathname.startsWith(`${p}/`))) {
    return NextResponse.next();
  }

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

// Gate everything except Next internals and static brand assets.
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml).*)"],
};
