"use client";

import { useCurrentUser, useImpersonation } from "@/lib/use-current-user";

/**
 * Portal placeholder — covers /portal and every /portal/* subroute.
 * The per-role dashboards (artist / label / station) land in the next step;
 * until then this is an honest "under construction" screen.
 */
export default function PortalPage() {
  const user = useCurrentUser();
  const impersonation = useImpersonation();

  const displayName = impersonation?.displayName ?? user?.name ?? "";

  return (
    <div className="max-w-2xl mx-auto mt-16">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500/10 border border-brand-500/20 rounded-2xl mb-6">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="w-8 h-8 text-brand-400"
          >
            <path d="M9 18V5l12-2v13" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>

        {displayName && (
          <p className="text-sm text-zinc-400 mb-2">Salut, {displayName}!</p>
        )}
        <h1 className="text-2xl font-bold text-white mb-3">
          Portalul tău e în construcție
        </h1>
        <p className="text-sm text-zinc-400 leading-relaxed max-w-md mx-auto">
          Dashboard-ul web pentru rolul tău sosește în curând. Până atunci,
          folosește aplicația mobilă <span className="text-white font-medium">onair.music</span>{" "}
          pentru difuzări în timp real, statistici și rapoarte.
        </p>

        <div className="mt-8 inline-flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-zinc-500 border border-zinc-800 rounded-full px-3 py-1.5">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
          </span>
          Detecția rulează non-stop — datele tale se strâng deja
        </div>
      </div>
    </div>
  );
}
