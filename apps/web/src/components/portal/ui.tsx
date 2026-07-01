"use client";

import Link from "next/link";
import { cn } from "@/lib/cn";

/* Shared portal UI primitives — same visual language as the ops console
 * (zinc-900 cards, brand accent, mono numbers). */

// ─── Layout ─────────────────────────────────────────────────────────────

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {description && <p className="text-sm text-zinc-400 mt-1">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

export function Card({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("bg-zinc-900 border border-zinc-800 rounded-xl p-5", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3 gap-3">
          {title && (
            <h2 className="text-sm font-semibold text-white uppercase tracking-wider">
              {title}
            </h2>
          )}
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// ─── Stats & pills ──────────────────────────────────────────────────────

export type StatTone = "green" | "amber" | "red" | "brand" | "neutral";

export function Stat({
  label,
  value,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  sub?: string;
  tone?: StatTone;
}) {
  const toneClasses: Record<StatTone, string> = {
    green: "text-emerald-400",
    amber: "text-amber-400",
    red: "text-brand-400",
    brand: "text-brand-400",
    neutral: "text-white",
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider text-zinc-500 mb-2">{label}</div>
      <div className={cn("text-3xl font-bold font-mono", toneClasses[tone])}>{value}</div>
      {sub && <div className="text-xs text-zinc-500 mt-1">{sub}</div>}
    </div>
  );
}

export function Pill({
  tone = "neutral",
  children,
  title,
}: {
  tone?: "green" | "amber" | "red" | "brand" | "neutral";
  children: React.ReactNode;
  title?: string;
}) {
  const cls = {
    green: "bg-emerald-400/10 text-emerald-400 border-emerald-400/20",
    amber: "bg-amber-400/10 text-amber-400 border-amber-400/20",
    red: "bg-brand-400/10 text-brand-400 border-brand-400/20",
    brand: "bg-brand-500/10 text-brand-400 border-brand-500/30",
    neutral: "bg-zinc-800/60 text-zinc-400 border-zinc-700",
  }[tone];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider whitespace-nowrap",
        cls,
      )}
    >
      {children}
    </span>
  );
}

/** ↑ 12% / ↓ 5% / — trend badge, as returned by the API trend endpoints. */
export function TrendBadge({
  direction,
  percentChange,
}: {
  direction: "up" | "down" | "flat";
  percentChange: number;
}) {
  if (direction === "flat") {
    return <Pill tone="neutral">— stabil</Pill>;
  }
  return (
    <Pill tone={direction === "up" ? "green" : "red"}>
      {direction === "up" ? "↑" : "↓"} {percentChange}%
    </Pill>
  );
}

// ─── Loading / empty / error states ─────────────────────────────────────

export function Skeleton({ rows = 3, className }: { rows?: number; className?: string }) {
  return (
    <div className={cn("animate-pulse space-y-3", className)}>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-10 bg-zinc-800/50 rounded-lg" />
      ))}
    </div>
  );
}

export function StatSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 animate-pulse">
          <div className="h-3 w-20 bg-zinc-800 rounded mb-3" />
          <div className="h-8 w-24 bg-zinc-800 rounded" />
        </div>
      ))}
    </div>
  );
}

export function ErrorNotice({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="px-4 py-3 bg-brand-400/10 border border-brand-400/20 rounded-xl text-brand-400 text-sm flex items-center justify-between gap-3 flex-wrap">
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs font-semibold text-brand-300 hover:text-white border border-brand-400/30 rounded-lg px-3 py-1 transition-colors"
        >
          Reîncearcă
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  message,
  cta,
}: {
  icon?: React.ReactNode;
  title: string;
  message?: string;
  cta?: { label: string; href?: string; onClick?: () => void };
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-10 text-center">
      <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-500/10 border border-brand-500/20 rounded-2xl mb-5 text-brand-400">
        {icon ?? <MusicNoteIcon className="w-7 h-7" />}
      </div>
      <h2 className="text-lg font-bold text-white mb-2">{title}</h2>
      {message && (
        <p className="text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">{message}</p>
      )}
      {cta &&
        (cta.href ? (
          <Link
            href={cta.href}
            className="inline-block mt-6 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {cta.label}
          </Link>
        ) : (
          <button
            onClick={cta.onClick}
            className="mt-6 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {cta.label}
          </button>
        ))}
    </div>
  );
}

// ─── Controls ───────────────────────────────────────────────────────────

export function PeriodPicker<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ value: T; label: string }>;
}) {
  return (
    <div className="inline-flex bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors",
            value === o.value
              ? "bg-brand-500/15 text-brand-400"
              : "text-zinc-400 hover:text-white",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  disabled,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors disabled:opacity-50",
        checked ? "bg-brand-600 border-brand-500" : "bg-zinc-800 border-zinc-700",
      )}
    >
      <span
        className={cn(
          "inline-block h-4 w-4 rounded-full bg-white transition-transform",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

// ─── Artwork / icons ────────────────────────────────────────────────────

export function MusicNoteIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className={className}
    >
      <path d="M9 18V5l12-2v13" />
      <circle cx="6" cy="18" r="3" />
      <circle cx="18" cy="16" r="3" />
    </svg>
  );
}

export function ArtworkThumb({
  url,
  alt = "",
  size = "md",
  rounded = "rounded-md",
}: {
  url: string | null | undefined;
  alt?: string;
  size?: "sm" | "md" | "lg";
  rounded?: string;
}) {
  const sizeCls = { sm: "w-8 h-8", md: "w-9 h-9", lg: "w-12 h-12" }[size];
  if (url) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={url}
        alt={alt}
        loading="lazy"
        className={cn(sizeCls, rounded, "object-cover border border-zinc-800 shrink-0")}
      />
    );
  }
  return (
    <div
      className={cn(
        sizeCls,
        rounded,
        "bg-zinc-800/60 border border-zinc-800 flex items-center justify-center shrink-0",
      )}
    >
      <MusicNoteIcon className="w-4 h-4 text-zinc-600" />
    </div>
  );
}

// ─── Table helpers ──────────────────────────────────────────────────────

export function Th({
  children,
  align = "left",
  className,
}: {
  children?: React.ReactNode;
  align?: "left" | "right" | "center";
  className?: string;
}) {
  return (
    <th
      className={cn(
        "px-4 py-3 text-xs font-medium uppercase tracking-wider text-zinc-400",
        align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left",
        className,
      )}
    >
      {children}
    </th>
  );
}

export function TableShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">{children}</table>
      </div>
    </div>
  );
}
