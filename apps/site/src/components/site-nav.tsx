"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { BrandLockup } from "@/components/brand";
import { Button } from "@/components/ui";
import { NAV_LINKS, loginUrl } from "@/lib/site";
import { cn } from "@/lib/cn";

export function SiteNav() {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-50 border-b border-white/[0.07] bg-ink/80 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-content items-center justify-between px-6">
        <Link href="/" aria-label="hitlist.fm home">
          <BrandLockup markSize={26} wordmarkClassName="text-lg" />
        </Link>

        <nav className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="text-[13.5px] font-medium text-zinc-300 transition-colors hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <a href={loginUrl} className="text-[13.5px] font-medium text-zinc-300 transition-colors hover:text-white">
            Login
          </a>
          <Button href="/pro" size="md" className="px-4 py-2 text-[13.5px]">
            Access Hitlist Pro
          </Button>
        </div>

        <button
          type="button"
          className="text-zinc-300 lg:hidden"
          aria-label="Toggle menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <div className={cn("border-t border-white/[0.07] lg:hidden", open ? "block" : "hidden")}>
        <div className="mx-auto flex w-full max-w-content flex-col gap-1 px-6 py-4">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5 hover:text-white"
            >
              {l.label}
            </Link>
          ))}
          <div className="mt-2 flex flex-col gap-2">
            <a href={loginUrl} className="rounded-lg px-3 py-2.5 text-sm font-medium text-zinc-300 hover:bg-white/5">
              Login
            </a>
            <Button href="/pro" className="w-full">
              Access Hitlist Pro
            </Button>
          </div>
        </div>
      </div>
    </header>
  );
}
