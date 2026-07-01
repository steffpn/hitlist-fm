"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { Card, PeriodPicker } from "@/components/portal/ui";
import { Donut } from "@/components/portal/charts";
import { PremiumGate, useGated } from "@/components/portal/premium-gate";

interface ShareOfAirplay {
  period: string;
  yourPlays: number;
  marketPlays: number;
  sharePercent: number;
  rank: number | null;
  totalArtists: number;
}

/**
 * Premium "Share of airplay" section — shared by the artist and label
 * dashboards (same /artist/share-of-airplay endpoint, roster-aware for
 * labels on the server side).
 */
export function ShareOfAirplaySection() {
  const [period, setPeriod] = useState<"week" | "month">("week");
  const state = useGated<ShareOfAirplay>(
    () => apiFetch(`/artist/share-of-airplay?period=${period}`),
    [period],
  );

  return (
    <Card
      title="Cota ta din airplay"
      action={
        <PeriodPicker
          value={period}
          onChange={setPeriod}
          options={[
            { value: "week", label: "Săptămâna" },
            { value: "month", label: "Luna" },
          ]}
        />
      }
    >
      <PremiumGate
        state={state}
        lockTitle="Cota de airplay e Premium"
        lockMessage="Vezi ce procent din difuzările întregii piețe îți aparține și pe ce loc te afli între toți artiștii difuzați."
      >
        {(data) => (
          <div className="flex flex-wrap items-center gap-6">
            <Donut percent={data.sharePercent} sublabel="din piață" />
            <div className="space-y-2 text-sm">
              <div className="text-zinc-300">
                <span className="font-mono font-bold text-white">
                  {formatNumber(data.yourPlays)}
                </span>{" "}
                difuzările tale
              </div>
              <div className="text-zinc-300">
                <span className="font-mono font-bold text-white">
                  {formatNumber(data.marketPlays)}
                </span>{" "}
                difuzări în toată piața
              </div>
              {data.rank !== null ? (
                <div className="text-zinc-300">
                  Locul{" "}
                  <span className="font-mono font-bold text-brand-400">#{data.rank}</span> din{" "}
                  <span className="font-mono">{formatNumber(data.totalArtists)}</span> artiști
                  difuzați
                </div>
              ) : (
                <div className="text-zinc-500 text-xs">
                  Nicio difuzare în perioada asta — fără loc în clasament.
                </div>
              )}
            </div>
          </div>
        )}
      </PremiumGate>
    </Card>
  );
}
