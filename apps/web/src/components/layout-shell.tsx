"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { isAuthenticated, clearToken } from "@/lib/auth";

const NO_SHELL_PATHS = ["/login"];

export function LayoutShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  const isNoShell = NO_SHELL_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (!isNoShell && !isAuthenticated()) {
      router.replace("/login");
    } else {
      setReady(true);
    }
  }, [pathname, router, isNoShell]);

  if (isNoShell) {
    return <>{children}</>;
  }

  if (!ready) return null;

  return (
    <div className="min-h-screen flex">
      <Sidebar pathname={pathname} />
      <main className="flex-1 p-8 overflow-x-auto">{children}</main>
    </div>
  );
}

const NAV_GROUPS = [
  {
    label: "Operations",
    items: [
      { href: "/", label: "Overview", match: (p: string) => p === "/" },
      { href: "/stations", label: "Stations", match: (p: string) => p.startsWith("/stations") },
      { href: "/detections", label: "Detections", match: (p: string) => p.startsWith("/detections") },
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

function Sidebar({ pathname }: { pathname: string }) {
  const router = useRouter();

  return (
    <aside className="w-60 shrink-0 bg-zinc-900 border-r border-zinc-800 p-6 flex flex-col">
      <Link href="/" className="block mb-8">
        <h1 className="text-lg font-bold text-white">onair.music</h1>
        <p className="text-[11px] text-zinc-400 uppercase tracking-wider">Ops Console</p>
      </Link>

      <nav className="flex flex-col gap-1 flex-1">
        {NAV_GROUPS.map((group, idx) => (
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
          clearToken();
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
