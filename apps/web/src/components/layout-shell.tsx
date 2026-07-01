"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { clearSession, getStoredUser, getToken } from "@/lib/auth";
import { useCurrentUser, useImpersonation } from "@/lib/use-current-user";
import { getImpersonation } from "@/lib/impersonation";
import { ViewAsRoleMenu, ImpersonationBanner } from "@/components/view-as-role";
import { cn } from "@/lib/cn";

const NO_SHELL_PATHS = ["/login"];

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
        <div className="flex-1 flex">
          <PortalSidebar role={portalRole} pathname={pathname} />
          <main className="flex-1 p-8 overflow-x-auto">{children}</main>
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
      <Link href="/" className="block mb-8">
        <h1 className="text-lg font-bold text-white">onair.music</h1>
        <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Ops Console</p>
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
// The per-role dashboards land in the next step; the nav structure is
// prepared here so those pages only have to flip `soon: false`.

type PortalRole = "ARTIST" | "LABEL" | "STATION";

const PORTAL_ROLE_LABELS: Record<PortalRole, string> = {
  ARTIST: "Artist",
  LABEL: "Label",
  STATION: "Stație",
};

const PORTAL_NAV: Record<
  PortalRole,
  Array<{ label: string; items: Array<{ href: string; label: string; soon?: boolean }> }>
> = {
  ARTIST: [
    {
      label: "Muzica ta",
      items: [
        { href: "/portal", label: "Acasă" },
        { href: "/portal/airplay", label: "Difuzări", soon: true },
        { href: "/portal/songs", label: "Piesele mele", soon: true },
        { href: "/portal/charts", label: "Topuri", soon: true },
      ],
    },
    {
      label: "Cont",
      items: [{ href: "/portal/billing", label: "Abonament", soon: true }],
    },
  ],
  LABEL: [
    {
      label: "Roster",
      items: [
        { href: "/portal", label: "Acasă" },
        { href: "/portal/artists", label: "Artiști", soon: true },
        { href: "/portal/airplay", label: "Difuzări", soon: true },
        { href: "/portal/reports", label: "Rapoarte", soon: true },
      ],
    },
    {
      label: "Cont",
      items: [{ href: "/portal/billing", label: "Abonament", soon: true }],
    },
  ],
  STATION: [
    {
      label: "Stația ta",
      items: [
        { href: "/portal", label: "Acasă" },
        { href: "/portal/playout", label: "Playout", soon: true },
        { href: "/portal/competitors", label: "Competitori", soon: true },
        { href: "/portal/reports", label: "Rapoarte", soon: true },
      ],
    },
    {
      label: "Cont",
      items: [{ href: "/portal/billing", label: "Abonament", soon: true }],
    },
  ],
};

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
      <Link href="/portal" className="flex items-baseline gap-3">
        <span className="text-base font-bold text-white">onair.music</span>
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
    <aside className="w-56 shrink-0 bg-zinc-900/50 border-r border-zinc-800 p-6">
      <nav className="flex flex-col gap-1">
        {PORTAL_NAV[role].map((group, idx) => (
          <div key={group.label} className={idx === 0 ? "" : "mt-4"}>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500 px-3">
              {group.label}
            </span>
            <div className="mt-1 flex flex-col gap-1">
              {group.items.map((item) =>
                item.soon ? (
                  <span
                    key={item.href}
                    className="flex items-center justify-between px-3 py-2 rounded-lg text-sm text-zinc-600 cursor-default select-none"
                  >
                    {item.label}
                    <span className="text-[9px] font-mono uppercase tracking-wider text-zinc-600 border border-zinc-800 rounded-full px-1.5 py-0.5">
                      curând
                    </span>
                  </span>
                ) : (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "block px-3 py-2 rounded-lg text-sm transition-colors",
                      pathname === item.href
                        ? "bg-brand-500/10 text-brand-400 font-medium"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/50",
                    )}
                  >
                    {item.label}
                  </Link>
                ),
              )}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
