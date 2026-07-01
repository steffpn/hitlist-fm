"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { isPremiumError } from "@/lib/api";
import { ErrorNotice, Skeleton } from "@/components/portal/ui";

/**
 * Data-loading state that understands the API's premium paywall.
 *
 * Premium-gated routes respond 403 {error:"Premium feature", featureKey} —
 * `useGated` maps that to `premium: true` instead of an error, and
 * <PremiumGate> renders the upgrade card in place of the section.
 */
export interface GatedState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  premium: boolean;
  reload: () => void;
}

export function useGated<T>(
  fetcher: () => Promise<T>,
  deps: React.DependencyList,
): GatedState<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [premium, setPremium] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setPremium(false);
    fetcher()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (isPremiumError(err)) {
          setPremium(true);
        } else {
          setError(err instanceof Error ? err.message : "Eroare la încărcare");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);

  return { data, loading, error, premium, reload };
}

/** Upgrade card shown where a premium-gated section would render. */
export function PremiumLockCard({
  title = "Funcție premium",
  message = "Această analiză face parte din planul Premium. Fă upgrade ca s-o deblochezi.",
  compact = false,
}: {
  title?: string;
  message?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`bg-gradient-to-br from-zinc-900 to-zinc-900/40 border border-brand-500/25 rounded-xl ${compact ? "p-5" : "p-8"} text-center`}
    >
      <div className="inline-flex items-center justify-center w-10 h-10 bg-brand-500/10 border border-brand-500/25 rounded-xl mb-3 text-brand-400">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          className="w-5 h-5"
        >
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <h3 className="text-sm font-bold text-white mb-1">{title}</h3>
      <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">{message}</p>
      <Link
        href="/portal/billing"
        className="inline-block mt-4 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold rounded-lg transition-colors"
      >
        Vezi planurile Premium
      </Link>
    </div>
  );
}

/**
 * Renders a gated data section: skeleton while loading, upgrade card when the
 * API answered with the premium paywall, human error with retry otherwise.
 */
export function PremiumGate<T>({
  state,
  skeletonRows = 3,
  lockTitle,
  lockMessage,
  children,
}: {
  state: GatedState<T>;
  skeletonRows?: number;
  lockTitle?: string;
  lockMessage?: string;
  children: (data: T) => React.ReactNode;
}) {
  if (state.premium) {
    return <PremiumLockCard title={lockTitle} message={lockMessage} compact />;
  }
  if (state.loading) return <Skeleton rows={skeletonRows} />;
  if (state.error) return <ErrorNotice message={state.error} onRetry={state.reload} />;
  if (state.data === null) return null;
  return <>{children(state.data)}</>;
}
