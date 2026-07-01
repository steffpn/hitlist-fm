"use client";

import { useState } from "react";
import { apiFetch, ApiError } from "@/lib/api";
import { formatDateFull } from "@/lib/format";
import { usePortalRole, type PortalRole } from "@/lib/use-portal-role";
import {
  Card,
  ErrorNotice,
  PageHeader,
  Pill,
  Skeleton,
} from "@/components/portal/ui";
import { useGated } from "@/components/portal/premium-gate";

// ─── API shapes ─────────────────────────────────────────────────────────

interface BillingMe {
  subscription: {
    id: number;
    status: string;
    billingInterval: string;
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
    seatCount: number;
  } | null;
  plan: {
    id: number;
    name: string;
    slug?: string;
    tier: string;
  } | null;
  features: string[];
}

/** Friendly names for feature keys (subset — unknown keys fall back to the key). */
const FEATURE_LABELS: Record<string, string> = {
  "analytics.basic_stats": "Statistici de bază",
  "analytics.detailed_breakdown": "Analiză detaliată pe stații",
  "analytics.hourly_heatmap": "Heatmap orar 7×24",
  "analytics.trend_comparison": "Comparație săptămânală",
  "analytics.peak_hours": "Orele de vârf",
  "analytics.competitor_intel": "Analiză competitori",
  "analytics.share_of_airplay": "Cota de airplay",
  "analytics.rotation_analysis": "Analiza rotației",
  "analytics.discovery_score": "Scor discovery",
  "analytics.genre_distribution": "Distribuție pe genuri",
  "label.artist_comparison": "Comparație artiști",
  "label.station_affinity": "Afinitate stații",
  "label.release_tracker": "Release tracker",
  "label.unlimited_artists": "Artiști nelimitați",
  "exports.csv": "Export CSV",
  "exports.pdf": "Rapoarte PDF",
  "reports.daily_basic": "Raport zilnic",
  "reports.daily_premium": "Raport zilnic premium",
  "reports.weekly_digest": "Rezumat săptămânal",
  "alerts.chart_monitoring": "Alerte topuri (Shazam/Spotify)",
  "alerts.push_notifications": "Notificări push",
  "live.feed": "Feed live",
  "live.audio_snippets": "Snippet-uri audio",
  "songs.monitor_basic": "Monitorizare 5 piese",
  "songs.monitor_unlimited": "Piese nelimitate",
};

/** Premium pitch per role (marketing copy; the API is the source of truth). */
const PREMIUM_PITCH: Record<PortalRole, string[]> = {
  ARTIST: [
    "Piese monitorizate nelimitate",
    "Heatmap orar 7×24 și cota de airplay",
    "Rapoarte zilnice premium cu insight-uri",
    "Alerte când intri în topuri",
  ],
  LABEL: [
    "Artiști nelimitați în roster",
    "Release tracker pentru lansări",
    "Cota de airplay a catalogului",
    "Rapoarte premium pentru fiecare artist",
  ],
  STATION: [
    "Analiză competitori cu suprapunere playlist",
    "Analiza rotației și piese supra-rotite",
    "Scor discovery",
    "Rapoarte zilnice premium",
  ],
};

/**
 * Candidate premium plan ids for checkout. There is no user-facing plan
 * catalog endpoint, so we mirror the seeded layout (free/premium pairs per
 * role → premium = freePlanId + 1) with seeded-order fallbacks. Invalid
 * candidates are rejected by the API with 404/400 *before* any Stripe call,
 * so probing in order is side-effect free.
 */
function premiumPlanCandidates(role: PortalRole, freePlanId: number | null): number[] {
  const fallback = { ARTIST: 2, LABEL: 4, STATION: 6 }[role];
  const candidates = freePlanId !== null ? [freePlanId + 1, fallback] : [fallback];
  return [...new Set(candidates)];
}

export default function BillingPage() {
  const { role } = usePortalRole();
  const billing = useGated<BillingMe>(() => apiFetch("/billing/me"), []);

  const [busy, setBusy] = useState<"upgrade" | "portal" | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);

  async function startUpgrade() {
    if (!role || !billing.data) return;
    setBusy("upgrade");
    setNotice(null);

    const isFree = billing.data.subscription === null;
    const candidates = premiumPlanCandidates(
      role,
      isFree ? (billing.data.plan?.id ?? null) : null,
    );

    for (const planId of candidates) {
      try {
        const res = await apiFetch<{ checkoutUrl: string }>("/billing/checkout", {
          method: "POST",
          body: JSON.stringify({
            planId,
            billingInterval: "monthly",
            successUrl: `${window.location.origin}/portal/billing?upgrade=success`,
            cancelUrl: `${window.location.origin}/portal/billing?upgrade=cancel`,
          }),
        });
        window.location.href = res.checkoutUrl;
        return;
      } catch (err) {
        if (err instanceof ApiError && err.status === 503) {
          setNotice({
            tone: "info",
            text: "Plățile nu sunt încă activate. Revino curând — lucrăm la asta.",
          });
          setBusy(null);
          return;
        }
        if (err instanceof ApiError && (err.status === 404 || err.status === 400)) {
          continue; // wrong candidate — try the next one
        }
        setNotice({
          tone: "error",
          text: err instanceof Error ? err.message : "Nu am putut porni plata",
        });
        setBusy(null);
        return;
      }
    }
    setNotice({
      tone: "error",
      text: "Nu am găsit un plan de upgrade pentru contul tău. Scrie-ne și rezolvăm.",
    });
    setBusy(null);
  }

  async function openPortal() {
    setBusy("portal");
    setNotice(null);
    try {
      const res = await apiFetch<{ portalUrl: string }>("/billing/portal", {
        method: "POST",
        body: JSON.stringify({ returnUrl: `${window.location.origin}/portal/billing` }),
      });
      window.location.href = res.portalUrl;
    } catch (err) {
      if (err instanceof ApiError && err.status === 503) {
        setNotice({
          tone: "info",
          text: "Plățile nu sunt încă activate. Revino curând — lucrăm la asta.",
        });
      } else if (err instanceof ApiError && err.status === 404) {
        setNotice({
          tone: "info",
          text: "Nu există încă un cont de plată asociat — apare după primul abonament.",
        });
      } else {
        setNotice({
          tone: "error",
          text: err instanceof Error ? err.message : "Nu am putut deschide portalul de plăți",
        });
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="max-w-3xl">
      <PageHeader title="Abonament" description="Planul tău curent și opțiunile de upgrade." />

      {notice && (
        <div
          className={`mb-4 px-4 py-3 rounded-xl text-sm border ${
            notice.tone === "info"
              ? "bg-zinc-900 border-zinc-700 text-zinc-300"
              : "bg-brand-400/10 border-brand-400/20 text-brand-400"
          }`}
        >
          {notice.text}
        </div>
      )}

      {billing.loading ? (
        <Skeleton rows={4} />
      ) : billing.error ? (
        <ErrorNotice message={billing.error} onRetry={billing.reload} />
      ) : billing.data ? (
        <>
          {/* Current plan */}
          <Card className="mb-6">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-1">
                  Planul curent
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="text-xl font-bold text-white">
                    {billing.data.plan?.name ?? "Fără plan"}
                  </span>
                  <Pill tone={billing.data.plan?.tier === "PREMIUM" ? "brand" : "neutral"}>
                    {billing.data.plan?.tier === "PREMIUM" ? "Premium" : "Gratuit"}
                  </Pill>
                </div>
                {billing.data.subscription && (
                  <div className="mt-2 space-y-1 text-xs text-zinc-400">
                    <div>
                      Status:{" "}
                      <span className="text-zinc-200">
                        {billing.data.subscription.status === "trialing"
                          ? "perioadă de probă"
                          : billing.data.subscription.status}
                      </span>{" "}
                      · facturare{" "}
                      {billing.data.subscription.billingInterval === "annual"
                        ? "anuală"
                        : "lunară"}
                    </div>
                    {billing.data.subscription.trialEndsAt && (
                      <div>
                        Proba se încheie pe{" "}
                        {formatDateFull(billing.data.subscription.trialEndsAt)}
                      </div>
                    )}
                    {billing.data.subscription.currentPeriodEnd && (
                      <div>
                        {billing.data.subscription.cancelAtPeriodEnd
                          ? "Se încheie pe "
                          : "Se reînnoiește pe "}
                        {formatDateFull(billing.data.subscription.currentPeriodEnd)}
                      </div>
                    )}
                    {billing.data.subscription.cancelAtPeriodEnd && (
                      <div className="text-amber-400">
                        Abonamentul e setat să se încheie la finalul perioadei.
                      </div>
                    )}
                  </div>
                )}
              </div>
              {billing.data.subscription && (
                <button
                  onClick={openPortal}
                  disabled={busy !== null}
                  className="px-4 py-2 text-sm font-semibold text-zinc-200 border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors disabled:opacity-50"
                >
                  {busy === "portal" ? "Se deschide…" : "Gestionează abonamentul"}
                </button>
              )}
            </div>

            {billing.data.features.length > 0 && (
              <div className="mt-4 pt-4 border-t border-zinc-800/60">
                <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">
                  Incluse în plan
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {billing.data.features.map((f) => (
                    <Pill key={f} tone="neutral">
                      {FEATURE_LABELS[f] ?? f}
                    </Pill>
                  ))}
                </div>
              </div>
            )}
          </Card>

          {/* Upgrade card — only when not already premium */}
          {billing.data.plan?.tier !== "PREMIUM" && role && (
            <div className="bg-gradient-to-br from-brand-950/60 to-zinc-900 border border-brand-500/25 rounded-2xl p-7">
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-lg font-bold text-white">Treci la Premium</h2>
                <Pill tone="brand">7 zile gratuit</Pill>
              </div>
              <ul className="space-y-1.5 mb-5">
                {PREMIUM_PITCH[role].map((line) => (
                  <li key={line} className="flex items-center gap-2 text-sm text-zinc-300">
                    <span className="text-brand-400">✓</span>
                    {line}
                  </li>
                ))}
              </ul>
              <button
                onClick={startUpgrade}
                disabled={busy !== null}
                className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-50"
              >
                {busy === "upgrade" ? "Se pornește plata…" : "Fă upgrade acum"}
              </button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
