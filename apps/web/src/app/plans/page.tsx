"use client";

import { useState, useEffect, useCallback } from "react";
import { apiFetch } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { cn } from "@/lib/cn";

interface Plan {
  id: number;
  name: string;
  slug: string;
  role: string;
  tier: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  trialDays: number;
  perSeatPriceCents: number | null;
  perSeatEnabled: boolean;
  stripeProductId: string | null;
  stripeMonthlyPriceId: string | null;
  stripeAnnualPriceId: string | null;
  createdAt: string;
  updatedAt: string;
}

type PlanFormData = {
  name: string;
  slug: string;
  role: string;
  tier: string;
  // Prices are edited in currency ("4.99") and converted to cents on submit.
  monthlyPrice: string;
  annualPrice: string;
  trialDays: string;
  perSeatEnabled: boolean;
  perSeatPrice: string;
  stripeProductId: string;
  stripeMonthlyPriceId: string;
  stripeAnnualPriceId: string;
};

const ROLES = ["ARTIST", "LABEL", "STATION"] as const;
const TIERS = ["FREE", "PREMIUM"] as const;

const ROLE_COLORS: Record<string, string> = {
  ARTIST: "text-brand-400",
  LABEL: "text-amber-400",
  STATION: "text-blue-400",
};

const TIER_COLORS: Record<string, string> = {
  FREE: "bg-zinc-400/10 text-zinc-400 border-zinc-400/20",
  PREMIUM: "bg-amber-400/10 text-amber-400 border-amber-400/20",
};

function centsToDisplay(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** "4.99" → 499. Empty/invalid → 0. */
function currencyToCents(value: string): number {
  const parsed = parseFloat(value.replace(",", "."));
  if (Number.isNaN(parsed) || parsed < 0) return 0;
  return Math.round(parsed * 100);
}

function centsToInput(cents: number): string {
  return (cents / 100).toFixed(2);
}

const emptyForm: PlanFormData = {
  name: "",
  slug: "",
  role: "ARTIST",
  tier: "FREE",
  monthlyPrice: "0.00",
  annualPrice: "0.00",
  trialDays: "0",
  perSeatEnabled: false,
  perSeatPrice: "0.00",
  stripeProductId: "",
  stripeMonthlyPriceId: "",
  stripeAnnualPriceId: "",
};

function planToForm(plan: Plan): PlanFormData {
  return {
    name: plan.name,
    slug: plan.slug,
    role: plan.role,
    tier: plan.tier,
    monthlyPrice: centsToInput(plan.monthlyPriceCents),
    annualPrice: centsToInput(plan.annualPriceCents),
    trialDays: String(plan.trialDays),
    perSeatEnabled: plan.perSeatEnabled,
    perSeatPrice: centsToInput(plan.perSeatPriceCents ?? 0),
    stripeProductId: plan.stripeProductId ?? "",
    stripeMonthlyPriceId: plan.stripeMonthlyPriceId ?? "",
    stripeAnnualPriceId: plan.stripeAnnualPriceId ?? "",
  };
}

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState<PlanFormData>(emptyForm);
  const [submitting, setSubmitting] = useState(false);

  const fetchPlans = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setError("Not authenticated. Please log in.");
      setLoading(false);
      return;
    }
    try {
      const data = await apiFetch<Plan[]>("/admin/plans", { token });
      setPlans(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load plans");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  function startEdit(plan: Plan) {
    setEditingId(plan.id);
    setCreating(false);
    setForm(planToForm(plan));
  }

  function startCreate() {
    setCreating(true);
    setEditingId(null);
    setForm(emptyForm);
  }

  function cancelForm() {
    setEditingId(null);
    setCreating(false);
    setForm(emptyForm);
  }

  function updateForm(field: keyof PlanFormData, value: string | boolean) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const token = getToken();
    if (!token) return;
    setSubmitting(true);

    const body: Record<string, unknown> = {
      name: form.name,
      slug: form.slug,
      role: form.role,
      tier: form.tier,
      monthlyPriceCents: currencyToCents(form.monthlyPrice),
      annualPriceCents: currencyToCents(form.annualPrice),
      trialDays: parseInt(form.trialDays, 10) || 0,
      perSeatEnabled: form.perSeatEnabled,
      perSeatPriceCents: form.perSeatEnabled ? currencyToCents(form.perSeatPrice) : null,
    };
    if (form.stripeProductId) body.stripeProductId = form.stripeProductId;
    if (form.stripeMonthlyPriceId) body.stripeMonthlyPriceId = form.stripeMonthlyPriceId;
    if (form.stripeAnnualPriceId) body.stripeAnnualPriceId = form.stripeAnnualPriceId;

    try {
      if (creating) {
        await apiFetch("/admin/plans", {
          method: "POST",
          token,
          body: JSON.stringify(body),
        });
      } else if (editingId) {
        await apiFetch(`/admin/plans/${editingId}`, {
          method: "PATCH",
          token,
          body: JSON.stringify(body),
        });
      }
      cancelForm();
      fetchPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save plan");
    } finally {
      setSubmitting(false);
    }
  }

  const [confirmDelete, setConfirmDelete] = useState<Plan | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(id: number) {
    const token = getToken();
    if (!token) return;
    setDeleting(true);
    try {
      await apiFetch(`/admin/plans/${id}`, { method: "DELETE", token });
      setConfirmDelete(null);
      fetchPlans();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete plan");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="flex items-center gap-3 text-zinc-400">
          <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          Loading plans...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12">
        <div className="bg-brand-400/10 border border-brand-400/20 rounded-xl p-6 text-center">
          <p className="text-brand-400 mb-3">{error}</p>
          <button
            onClick={() => { setLoading(true); setError(null); fetchPlans(); }}
            className="px-4 py-2 bg-zinc-800 text-white rounded-lg text-sm hover:bg-zinc-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const isFormOpen = creating || editingId !== null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Plans & Pricing</h1>
          <p className="text-sm text-zinc-400 mt-1">{plans.length} plans configured</p>
        </div>
        {!isFormOpen && (
          <button
            onClick={startCreate}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Plan
          </button>
        )}
      </div>

      {/* Plan form */}
      {isFormOpen && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 mb-6">
          <h2 className="text-lg font-semibold text-white mb-4">
            {creating ? "New Plan" : "Edit Plan"}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Name</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => updateForm("name", e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Slug</label>
                <input
                  type="text"
                  value={form.slug}
                  onChange={(e) => updateForm("slug", e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => updateForm("role", e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/60"
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Tier</label>
                <select
                  value={form.tier}
                  onChange={(e) => updateForm("tier", e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/60"
                >
                  {TIERS.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Monthly Price ($)</label>
                <PriceInput
                  value={form.monthlyPrice}
                  onChange={(v) => updateForm("monthlyPrice", v)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Annual Price ($)</label>
                <PriceInput
                  value={form.annualPrice}
                  onChange={(v) => updateForm("annualPrice", v)}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Trial Days</label>
                <input
                  type="number"
                  value={form.trialDays}
                  onChange={(e) => updateForm("trialDays", e.target.value)}
                  min="0"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-brand-500/60"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Stripe Product ID</label>
                <input
                  type="text"
                  value={form.stripeProductId}
                  onChange={(e) => updateForm("stripeProductId", e.target.value)}
                  placeholder="prod_..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Stripe Monthly Price ID</label>
                <input
                  type="text"
                  value={form.stripeMonthlyPriceId}
                  onChange={(e) => updateForm("stripeMonthlyPriceId", e.target.value)}
                  placeholder="price_..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/60"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-1">Stripe Annual Price ID</label>
                <input
                  type="text"
                  value={form.stripeAnnualPriceId}
                  onChange={(e) => updateForm("stripeAnnualPriceId", e.target.value)}
                  placeholder="price_..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-brand-500/60"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.perSeatEnabled}
                  onChange={(e) => updateForm("perSeatEnabled", e.target.checked)}
                  className="rounded border-zinc-700 bg-zinc-800"
                />
                <span className="text-sm text-zinc-400">Per-seat pricing</span>
              </label>
              {form.perSeatEnabled && (
                <div className="w-40">
                  <PriceInput
                    value={form.perSeatPrice}
                    onChange={(v) => updateForm("perSeatPrice", v)}
                    placeholder="$ per seat"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className={cn(
                  "px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-medium hover:bg-brand-500 transition-colors",
                  submitting && "opacity-50 cursor-not-allowed"
                )}
              >
                {submitting ? "Saving..." : creating ? "Create Plan" : "Update Plan"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-4 py-2 bg-zinc-800 text-zinc-400 rounded-lg text-sm hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Plan cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-zinc-700 transition-colors"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={cn("text-xs font-semibold", ROLE_COLORS[plan.role] || "text-zinc-400")}>
                    {plan.role}
                  </span>
                  <span
                    className={cn(
                      "text-xs font-medium px-2 py-0.5 rounded-full border",
                      TIER_COLORS[plan.tier] || "text-zinc-400 border-zinc-700"
                    )}
                  >
                    {plan.tier}
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">
                {plan.slug}
              </span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Monthly</span>
                <span className="text-white font-medium font-mono">{centsToDisplay(plan.monthlyPriceCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Annual</span>
                <span className="text-white font-medium font-mono">{centsToDisplay(plan.annualPriceCents)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-500">Trial</span>
                <span className="text-zinc-300 font-mono">{plan.trialDays} days</span>
              </div>
              {plan.perSeatEnabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-zinc-500">Per seat</span>
                  <span className="text-zinc-300 font-mono">{centsToDisplay(plan.perSeatPriceCents ?? 0)}/seat</span>
                </div>
              )}
            </div>

            {(plan.stripeProductId || plan.stripeMonthlyPriceId || plan.stripeAnnualPriceId) && (
              <div className="border-t border-zinc-800 pt-3 mb-4 space-y-1">
                {plan.stripeProductId && (
                  <div className="text-[10px] font-mono text-zinc-500 truncate">
                    Product: {plan.stripeProductId}
                  </div>
                )}
                {plan.stripeMonthlyPriceId && (
                  <div className="text-[10px] font-mono text-zinc-500 truncate">
                    Monthly: {plan.stripeMonthlyPriceId}
                  </div>
                )}
                {plan.stripeAnnualPriceId && (
                  <div className="text-[10px] font-mono text-zinc-500 truncate">
                    Annual: {plan.stripeAnnualPriceId}
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => startEdit(plan)}
                className="flex-1 px-3 py-1.5 text-xs font-medium bg-zinc-800 text-zinc-300 rounded-lg hover:bg-zinc-700 hover:text-white transition-colors"
              >
                Edit
              </button>
              <button
                onClick={() => setConfirmDelete(plan)}
                className="px-3 py-1.5 text-xs font-medium bg-brand-400/10 text-brand-400 rounded-lg hover:bg-brand-400/20 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {plans.length === 0 && !isFormOpen && (
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl py-16 text-center text-zinc-500">
          <p className="mb-2">No plans configured yet.</p>
          <button onClick={startCreate} className="text-sm text-brand-400 hover:underline">
            Create your first plan
          </button>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete plan"
        message={
          confirmDelete ? (
            <>
              Delete <span className="text-white font-medium">{confirmDelete.name}</span> (
              {confirmDelete.role} · {confirmDelete.tier})? This cannot be undone and may affect
              feature gating for subscribed users.
            </>
          ) : ""
        }
        confirmLabel="Delete plan"
        danger
        loading={deleting}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

function PriceInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="relative">
      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-zinc-500 pointer-events-none">$</span>
      <input
        type="number"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => {
          // Normalize to two decimals on blur ("5" → "5.00")
          const cents = currencyToCents(e.target.value);
          onChange(centsToInput(cents));
        }}
        min="0"
        step="0.01"
        placeholder={placeholder ?? "0.00"}
        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg pl-7 pr-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-brand-500/60"
      />
    </div>
  );
}
