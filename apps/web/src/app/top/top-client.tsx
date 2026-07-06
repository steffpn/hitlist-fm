"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { API_BASE } from "@/lib/api";
import { cn } from "@/lib/cn";
import { formatDateTime } from "@/lib/format";
import { ChartTable, type ChartEntry, type ChartResponse } from "@/components/portal/chart-table";

type Period = "week" | "month";

export function TopChartClient() {
  const [period, setPeriod] = useState<Period>("week");
  const [chart, setChart] = useState<ChartResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // Public endpoint — plain fetch, no auth required.
    fetch(`${API_BASE}/charts/airplay?period=${period}&limit=100`)
      .then((res) => {
        if (!res.ok) throw new Error("Topul nu e disponibil momentan");
        return res.json() as Promise<ChartResponse>;
      })
      .then((data) => {
        if (!cancelled) setChart(data);
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Topul nu e disponibil momentan");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [period]);

  async function sharePage() {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const payload = {
      title: "hitlist.fm Airplay Top",
      text: "Topul difuzărilor radio — din airplay real, monitorizat non-stop.",
      url,
    };
    if (navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // user dismissed — fall through to copy
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — nothing else to do
    }
  }

  async function shareEntry(entry: ChartEntry) {
    const url = typeof window !== "undefined" ? window.location.href : "";
    const text = `„${entry.songTitle}” — ${entry.artistName} e pe locul #${entry.rank} în hitlist.fm Airplay Top`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "hitlist.fm Airplay Top", text, url });
        return;
      } catch {
        // dismissed
      }
    }
    try {
      await navigator.clipboard.writeText(`${text} — ${url}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Top bar */}
      <header className="border-b border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <span className="text-base font-bold text-white">
            hitlist<span className="text-brand-500">.fm</span>
          </span>
          <Link
            href="/login"
            className="text-xs text-zinc-400 hover:text-white border border-zinc-800 hover:border-zinc-600 rounded-lg px-3 py-1.5 transition-colors"
          >
            Intră în cont
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(60% 80% at 50% 0%, rgba(245,177,61,0.14) 0%, rgba(255,90,52,0.05) 45%, transparent 100%)",
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 pt-14 pb-10 text-center">
          <div className="inline-flex items-center gap-2 text-[10px] font-mono font-semibold uppercase tracking-wider text-brand-400 border border-brand-500/30 bg-brand-500/10 rounded-full px-3 py-1 mb-5">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-500 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-brand-500" />
            </span>
            din airplay real, monitorizat non-stop
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight">
            Airplay <span className="text-brand-500">Top</span>
          </h1>
          <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-xl mx-auto leading-relaxed">
            Topul pieselor difuzate la radio — nu voturi, nu playlist-uri editoriale, ci
            difuzări reale detectate de hitlist.fm, actualizat din 15 în 15 minute.
          </p>

          <div className="mt-8 flex items-center justify-center gap-3 flex-wrap">
            <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
              {(
                [
                  { value: "week", label: "Săptămâna asta" },
                  { value: "month", label: "Luna asta" },
                ] as Array<{ value: Period; label: string }>
              ).map((o) => (
                <button
                  key={o.value}
                  onClick={() => setPeriod(o.value)}
                  className={cn(
                    "px-4 py-2 text-xs font-semibold rounded-md transition-colors",
                    period === o.value
                      ? "bg-brand-500/15 text-brand-400"
                      : "text-zinc-400 hover:text-white",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            <button
              onClick={sharePage}
              className="px-4 py-2 text-xs font-semibold text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors"
            >
              {copied ? "Link copiat!" : "Distribuie topul"}
            </button>
          </div>

          {chart && (
            <p className="mt-4 text-[11px] font-mono text-zinc-500">
              actualizat {formatDateTime(chart.generatedAt)}
            </p>
          )}
        </div>
      </section>

      {/* Chart */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 pb-16">
        {loading ? (
          <div className="animate-pulse space-y-3">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="h-14 bg-zinc-900 border border-zinc-800/60 rounded-lg" />
            ))}
          </div>
        ) : error ? (
          <div className="px-4 py-8 bg-zinc-900 border border-zinc-800 rounded-xl text-center text-sm text-zinc-400">
            {error} — încearcă din nou în câteva minute.
          </div>
        ) : chart ? (
          <ChartTable entries={chart.entries} onShare={shareEntry} />
        ) : null}

        <p className="text-xs text-zinc-500 mt-4 text-center">
          Δ = schimbarea față de perioada precedentă · doar difuzări complete (peste 30 de
          secunde) · click pe o piesă pentru istoricul pozițiilor
        </p>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800/60 py-8">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 flex items-center justify-between gap-4 flex-wrap text-xs text-zinc-500">
          <span>
            Ești artist sau ai un radio?{" "}
            <Link href="/login" className="text-brand-400 hover:text-brand-300">
              Monitorizează-ți difuzările
            </Link>
          </span>
          <span className="font-mono">
            made with{" "}
            <span className="text-zinc-300">
              hitlist<span className="text-brand-500">.fm</span>
            </span>
          </span>
        </div>
      </footer>
    </div>
  );
}
