"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clearSession, getStoredUser, getToken } from "@/lib/auth";
import { useCurrentUser, useImpersonation } from "@/lib/use-current-user";
import { getImpersonation } from "@/lib/impersonation";
import { ViewAsRoleMenu, ImpersonationBanner } from "@/components/view-as-role";
import { GaugeMark, Wordmark } from "@/components/brand";
import { cn } from "@/lib/cn";

// Pages rendered without shell/auth: the public auth screens (login, invite
// register, password recovery) + the public marketing chart.
const NO_SHELL_PATHS = [
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/top",
];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const user = useCurrentUser();
  const impersonation = useImpersonation();

  const isNoShell = NO_SHELL_PATHS.some((p) => pathname.startsWith(p));
  const isPortalPath = pathname.startsWith("/portal");

  useEffect(() => {
    if (isNoShell) return;

    // Read the session synchronously so redirects don't flash stale UI.
    const token = getToken();
    const storedUser = getStoredUser();
    const imp = getImpersonation();

    if (!token) {
      router.replace("/login");
      return;
    }
    // Legacy session (token without a stored user): we can't determine the
    // role, so re-login once. The login now stores the full session.
    if (!storedUser) {
      clearSession();
      router.replace("/login");
      return;
    }

    const isAdmin = storedUser.role === "ADMIN";
    if (!isAdmin && !isPortalPath) {
      // Non-admins never see the operations console.
      router.replace("/portal");
      return;
    }
    if (isAdmin && imp && !isPortalPath) {
      // While "viewing as", the admin sees exactly what the user sees.
      router.replace("/portal");
      return;
    }
    if (isAdmin && !imp && isPortalPath) {
      router.replace("/");
      return;
    }
    setReady(true);
  }, [pathname, router, isNoShell, isPortalPath, user, impersonation]);

  if (isNoShell) {
    return <>{children}</>;
  }

  if (!ready || !user) return null;

  // ── Portal shell (non-admin users, or admin impersonating) ──────────
  const portalRole =
    user.role !== "ADMIN"
      ? (user.role as PortalRole)
      : impersonation
        ? impersonation.role
        : null;

  if (portalRole) {
    return (
      <div className="min-h-screen flex flex-col">
        {user.role === "ADMIN" && impersonation && (
          <ImpersonationBanner impersonation={impersonation} />
        )}
        <PortalHeader
          role={portalRole}
          displayName={impersonation?.displayName ?? user.name}
          onLogout={() => {
            clearSession();
            router.push("/login");
          }}
        />
        <PortalMobileNav role={portalRole} pathname={pathname} />
        <div className="flex-1 flex">
          <PortalSidebar role={portalRole} pathname={pathname} />
          <main className="flex-1 p-4 md:p-8 overflow-x-auto min-w-0">{children}</main>
        </div>
      </div>
    );
  }

  // ── Admin operations console ─────────────────────────────────────────
  return (
    <div className="min-h-screen flex">
      <AdminSidebar pathname={pathname} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-40 h-14 shrink-0 bg-zinc-950/80 backdrop-blur border-b border-zinc-800 flex items-center justify-end gap-4 px-6">
          <ViewAsRoleMenu />
          <span className="text-xs text-zinc-500 font-mono truncate max-w-[220px]">
            {user.email}
          </span>
        </header>
        <main className="flex-1 p-8 overflow-x-auto">{children}</main>
      </div>
    </div>
  );
}

// ─── Admin sidebar ──────────────────────────────────────────────────────

const ADMIN_NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { href: "/", label: "Overview", match: (p: string) => p === "/" },
      { href: "/stations", label: "Stations", match: (p: string) => p.startsWith("/stations") },
      { href: "/detections", label: "Detections", match: (p: string) => p.startsWith("/detections") },
      { href: "/missing-songs", label: "Missing songs", match: (p: string) => p.startsWith("/missing-songs") },
      { href: "/acrcloud-search", label: "ACRCloud search", match: (p: string) => p.startsWith("/acrcloud-search") },
    ],
  },
  {
    label: "Access",
    items: [
      { href: "/users", label: "Users", match: (p: string) => p === "/users" },
      { href: "/invitations", label: "Invitations", match: (p: string) => p === "/invitations" },
    ],
  },
  {
    label: "Billing",
    items: [
      { href: "/features", label: "Feature Matrix", match: (p: string) => p === "/features" },
      { href: "/plans", label: "Plans & Pricing", match: (p: string) => p === "/plans" },
      { href: "/subscriptions", label: "Subscriptions", match: (p: string) => p === "/subscriptions" },
    ],
  },
];

function AdminSidebar({ pathname }: { pathname: string }) {
  const router = useRouter();

  return (
    <aside className="w-60 shrink-0 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <GaugeMark size={30} />
        <div>
          <Wordmark className="text-lg" />
          <p className="text-[11px] text-zinc-400 uppercase tracking-wider font-mono">Pro Console</p>
        </div>
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {ADMIN_NAV_GROUPS.map((group, idx) => (
          <div key={group.label} className={idx === 0 ? "" : "mt-4"}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-3">
              {group.label}
            </span>
            <div className="mt-1 flex flex-col gap-1">
              {group.items.map((item) => (
                <NavLink key={item.href} href={item.href} active={item.match(pathname)}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <button
        onClick={() => {
          clearSession();
          router.push("/login");
        }}
        className="mt-4 px-3 py-2 text-sm text-zinc-400 hover:text-brand-400 transition-colors text-left"
      >
        Log out
      </button>
    </aside>
  );
}

function NavLink({ href, active, children }: { href: string; active: boolean; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
        active
          ? "bg-brand-500/10 text-brand-400 font-medium"
          : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
      }`}
    >
      {children}
    </Link>
  );
}

// ─── Portal shell (per-role, /portal/*) ─────────────────────────────────

type PortalRole = "ARTIST" | "LABEL" | "STATION";

const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  ARTIST: "Artist",
  LABEL: "Label",
  STATION: "Stație",
};

const PORTAL_NAV: Record<
  PortalRole,
  Array<{ label: string; items: Array<{ href: string; label: string }> }>
> = {
  ARTIST: [
    {
      label: "Muzica ta",
      items: [
        { href: "/portal", label: "Acasă" },
        { href: "/portal/songs", label: "Piesele mele" },
        { href: "/portal/airplay", label: "Difuzări" },
        { href: "/portal/charts", label: "Topuri" },
      ],
    },
    {
      label: "Cont",
      items: [
        { href: "/portal/reports", label: "Rapoarte" },
        { href: "/portal/billing", label: "Abonament" },
        { href: "/portal/settings", label: "Setări" },
      ],
    },
  ],
  LABEL: [
    {
      label: "Roster",
      items: [
        { href: "/portal", label: "Acasă" },
        { href: "/portal/artists", label: "Artiști" },
        { href: "/portal/airplay", label: "Difuzări" },
        { href: "/portal/insights", label: "Insights" },
        { href: "/portal/charts", label: "Topuri" },
      ],
    },
    {
      label: "Cont",
      items: [
        { href: "/portal/reports", label: "Rapoarte" },
        { href: "/portal/billing", label: "Abonament" },
        { href: "/portal/settings", label: "Setări" },
      ],
    },
  ],
  STATION: [
    {
      label: "Stația ta",
      items: [
        { href: "/portal", label: "Stația mea" },
        { href: "/portal/competitors", label: "Competitori" },
        { href: "/portal/analytics", label: "Analiză" },
        { href: "/portal/airplay", label: "Difuzări" },
      ],
    },
    {
      label: "Cont",
      items: [
        { href: "/portal/reports", label: "Rapoarte" },
        { href: "/portal/billing", label: "Abonament" },
        { href: "/portal/settings", label: "Setări" },
      ],
    },
  ],
};

function isPortalItemActive(href: string, pathname: string): boolean {
  return href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
}

function PortalHeader({
  role,
  displayName,
  onLogout,
}: {
  role: PortalRole;
  displayName: string;
  onLogout: () => void;
}) {
  return (
    <header className="h-14 shrink-0 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between px-6">
      <Link href="/portal" className="flex items-center gap-2.5">
        <GaugeMark size={22} />
        <Wordmark className="text-base" />
        <span className="text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-400 border border-brand-500/30 bg-brand-500/10 rounded-full px-2 py-0.5">
          {PORTAL_ROLE_LABELS[role]}
        </span>
      </Link>
      <div className="flex items-center gap-4">
        <span className="text-xs text-zinc-400 truncate max-w-[200px]">{displayName}</span>
        <button
          onClick={onLogout}
          className="text-xs text-zinc-500 hover:text-brand-400 transition-colors"
        >
          Ieși din cont
        </button>
      </div>
    </header>
  );
}

function PortalSidebar({ role, pathname }: { role: PortalRole; pathname: string }) {
  return (
    <aside className="w-56 shrink-0 bg-zinc-900/50 border-r border-zinc-800 p-6 hidden md:block">
      <nav className="flex flex-col gap-1">
        {PORTAL_NAV[role].map((group, idx) => (
          <div key={group.label} className={idx === 0 ? "" : "mt-4"}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-3">
              {group.label}
            </span>
            <div className="mt-1 flex flex-col gap-1">
              {group.items.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "block px-3 py-2 rounded-lg text-sm transition-colors",
                    isPortalItemActive(item.href, pathname)
                      ? "bg-brand-500/10 text-brand-400 font-medium"
                      : "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

/** Horizontal scrollable nav for small screens (sidebar is hidden there). */
function PortalMobileNav({ role, pathname }: { role: PortalRole; pathname: string }) {
  const items = PORTAL_NAV[role].flatMap((g) => g.items);
  return (
    <nav className="md:hidden bg-zinc-950/90 border-b border-zinc-800 overflow-x-auto">
      <div className="flex gap-1 px-3 py-2 w-max">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors",
              isPortalItemActive(item.href, pathname)
                ? "bg-brand-500/10 text-brand-400"
                : "text-zinc-400 hover:text-white",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
