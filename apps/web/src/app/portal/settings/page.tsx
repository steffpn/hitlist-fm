"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";
import { usePortalRole } from "@/lib/use-portal-role";
import {
  Card,
  ErrorNotice,
  PageHeader,
  Skeleton,
  Toggle,
} from "@/components/portal/ui";

interface UserSettings {
  dailyReportTime: string;
  dailyReportTimezone: string;
  dailyReportEnabled: boolean;
  weeklyReportEnabled: boolean;
  chartAlertsEnabled: boolean;
  chartAlertCountries: string[];
  firstPlayAlertsEnabled: boolean;
  rotationAlertsEnabled: boolean;
}

const COUNTRY_OPTIONS = [
  { code: "RO", label: "România" },
  { code: "MD", label: "Moldova" },
  { code: "US", label: "SUA" },
  { code: "GB", label: "Marea Britanie" },
  { code: "DE", label: "Germania" },
  { code: "FR", label: "Franța" },
  { code: "ES", label: "Spania" },
  { code: "IT", label: "Italia" },
];

const TIMEZONE_OPTIONS = [
  "Europe/Bucharest",
  "Europe/Chisinau",
  "Europe/London",
  "Europe/Berlin",
  "Europe/Paris",
  "America/New_York",
  "America/Los_Angeles",
];

function SettingRow({
  title,
  description,
  checked,
  onChange,
  disabled,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5">
      <div className="min-w-0">
        <div className="text-sm font-medium text-white">{title}</div>
        <div className="text-xs text-zinc-500 mt-0.5">{description}</div>
      </div>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} label={title} />
    </div>
  );
}

export default function SettingsPage() {
  const { role } = usePortalRole();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");

  useEffect(() => {
    apiFetch<UserSettings>("/settings")
      .then(setSettings)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Nu am putut încărca setările"),
      )
      .finally(() => setLoading(false));
  }, []);

  async function patch(partial: Partial<UserSettings>) {
    if (!settings) return;
    const prev = settings;
    // optimistic
    setSettings({ ...settings, ...partial });
    setSaveState("saving");
    try {
      const updated = await apiFetch<UserSettings>("/settings", {
        method: "PATCH",
        body: JSON.stringify(partial),
      });
      setSettings(updated);
      setSaveState("saved");
      setTimeout(() => setSaveState("idle"), 2000);
    } catch {
      setSettings(prev);
      setSaveState("error");
      setTimeout(() => setSaveState("idle"), 3000);
    }
  }

  function toggleCountry(code: string) {
    if (!settings) return;
    const has = settings.chartAlertCountries.includes(code);
    const next = has
      ? settings.chartAlertCountries.filter((c) => c !== code)
      : [...settings.chartAlertCountries, code];
    patch({ chartAlertCountries: next });
  }

  return (
    <div className="max-w-2xl">
      <PageHeader
        title="Setări notificări"
        description="Alege ce alerte și rapoarte primești."
        actions={
          saveState !== "idle" ? (
            <span
              className={`text-xs font-mono ${
                saveState === "error"
                  ? "text-brand-400"
                  : saveState === "saved"
                    ? "text-emerald-400"
                    : "text-zinc-500"
              }`}
            >
              {saveState === "saving"
                ? "Se salvează…"
                : saveState === "saved"
                  ? "Salvat"
                  : "Salvarea a eșuat"}
            </span>
          ) : undefined
        }
      />

      {loading ? (
        <Skeleton rows={5} />
      ) : error ? (
        <ErrorNotice message={error} />
      ) : settings ? (
        <div className="space-y-6">
          <Card title="Alerte în timp real">
            <div className="divide-y divide-zinc-800/60">
              <SettingRow
                title="Piesa ta e ON AIR"
                description="Primești o notificare la prima difuzare a unei piese pe o stație."
                checked={settings.firstPlayAlertsEnabled}
                onChange={(v) => patch({ firstPlayAlertsEnabled: v })}
              />
              {role === "STATION" && (
                <SettingRow
                  title="Rotație nouă la competitori"
                  description="Te anunțăm când un competitor urmărit bagă o piesă nouă în rotație."
                  checked={settings.rotationAlertsEnabled}
                  onChange={(v) => patch({ rotationAlertsEnabled: v })}
                />
              )}
            </div>
          </Card>

          <Card title="Rapoarte">
            <div className="divide-y divide-zinc-800/60">
              <SettingRow
                title="Raport zilnic"
                description="Rezumatul difuzărilor de ieri, livrat în fiecare dimineață."
                checked={settings.dailyReportEnabled}
                onChange={(v) => patch({ dailyReportEnabled: v })}
              />
              {settings.dailyReportEnabled && (
                <div className="py-3.5 grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                      Ora raportului
                    </label>
                    <input
                      type="time"
                      value={settings.dailyReportTime}
                      onChange={(e) => patch({ dailyReportTime: e.target.value })}
                      className="px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] uppercase tracking-wider text-zinc-500 mb-1">
                      Fus orar
                    </label>
                    <select
                      value={settings.dailyReportTimezone}
                      onChange={(e) => patch({ dailyReportTimezone: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white"
                    >
                      {TIMEZONE_OPTIONS.map((tz) => (
                        <option key={tz} value={tz}>
                          {tz}
                        </option>
                      ))}
                      {!TIMEZONE_OPTIONS.includes(settings.dailyReportTimezone) && (
                        <option value={settings.dailyReportTimezone}>
                          {settings.dailyReportTimezone}
                        </option>
                      )}
                    </select>
                  </div>
                </div>
              )}
              <SettingRow
                title="Raport săptămânal"
                description="Digestul de luni dimineața cu evoluția față de săptămâna trecută."
                checked={settings.weeklyReportEnabled}
                onChange={(v) => patch({ weeklyReportEnabled: v })}
              />
            </div>
          </Card>

          {role !== "STATION" && (
            <Card title="Alerte topuri">
              <div className="divide-y divide-zinc-800/60">
                <SettingRow
                  title="Monitorizare topuri"
                  description="Te anunțăm când piesele tale intră în topurile Shazam, Spotify sau Apple Music."
                  checked={settings.chartAlertsEnabled}
                  onChange={(v) => patch({ chartAlertsEnabled: v })}
                />
                {settings.chartAlertsEnabled && (
                  <div className="py-3.5">
                    <div className="text-[11px] uppercase tracking-wider text-zinc-500 mb-2">
                      Țările urmărite
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {COUNTRY_OPTIONS.map((c) => {
                        const active = settings.chartAlertCountries.includes(c.code);
                        return (
                          <button
                            key={c.code}
                            onClick={() => toggleCountry(c.code)}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-colors ${
                              active
                                ? "bg-brand-500/15 text-brand-400 border-brand-500/30"
                                : "text-zinc-400 border-zinc-700 hover:text-white hover:border-zinc-500"
                            }`}
                          >
                            {c.label}
                          </button>
                        );
                      })}
                    </div>
                    {settings.chartAlertCountries.length === 0 && (
                      <p className="text-xs text-amber-400 mt-2">
                        Alege cel puțin o țară ca să primești alerte.
                      </p>
                    )}
                  </div>
                )}
              </div>
            </Card>
          )}
        </div>
      ) : null}
    </div>
  );
}
