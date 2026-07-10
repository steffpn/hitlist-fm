"use client";

import { GaugeMark, Wordmark } from "@/components/brand";
import { cn } from "@/lib/cn";

/* Shared chrome + form primitives for the public auth screens
 * (login / register / forgot-password / reset-password). Extracted from the
 * original login page so all four screens stay pixel-identical: same warm-ink
 * backdrop, sunset radial glow, brand lockup, card, fields and CTA. */

/** Full-screen ink backdrop + brand header + card slot + footer. */
export function AuthShell({
  subtitle,
  children,
}: {
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-ink flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-ink" />
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(50% 55% at 50% 12%, rgba(245,177,61,0.14) 0%, rgba(255,90,52,0.04) 45%, transparent 100%)",
        }}
      />

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex mb-4 drop-shadow-[0_8px_24px_rgba(245,177,61,0.30)]">
            <GaugeMark size={64} />
          </div>
          <div className="text-[26px]">
            <Wordmark />
          </div>
          {subtitle && <p className="text-zinc-500 text-sm mt-2">{subtitle}</p>}
        </div>

        {children}

        <p className="text-center text-zinc-500 text-xs mt-6">
          hitlist.fm &copy; {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

/** The glass card that holds an auth form. */
export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-zinc-900/80 backdrop-blur-xl border border-zinc-800 rounded-2xl p-8 shadow-2xl shadow-black/50">
      {children}
    </div>
  );
}

/** Shared field classes so every input matches the login page exactly. */
export const authLabelClass = "block text-sm font-medium text-zinc-300 mb-2";
export const authInputClass =
  "w-full px-4 py-3 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-white text-sm placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500/60 transition-all";

function Spinner() {
  return (
    <svg
      className="animate-spin w-4 h-4"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  );
}

/** Full-width sunset-gradient CTA with a built-in loading state. */
export function AuthButton({
  loading = false,
  loadingLabel,
  children,
  className,
  type = "submit",
  disabled,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  loading?: boolean;
  loadingLabel?: React.ReactNode;
}) {
  const isDisabled = loading || disabled;
  return (
    <button
      type={type}
      disabled={isDisabled}
      className={cn(
        "w-full py-3 rounded-xl text-sm font-semibold transition-all mt-1",
        isDisabled
          ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
          : "bg-gradient-to-br from-brand-500 to-ember text-ink font-bold shadow-[0_10px_28px_rgba(245,177,61,0.30)] hover:brightness-105 active:scale-[0.98]",
        className,
      )}
      {...rest}
    >
      {loading ? (
        <span className="flex items-center justify-center gap-2">
          <Spinner />
          {loadingLabel ?? children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}

/** Amber error box — matches the original login error styling. */
export function AuthError({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-brand-400 bg-brand-400/10 border border-brand-400/20 rounded-xl px-4 py-3">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}

/** Emerald success banner (e.g. "password reset" confirmation on login). */
export function AuthSuccess({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 20 20"
        fill="currentColor"
        className="w-4 h-4 shrink-0"
      >
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z"
          clipRule="evenodd"
        />
      </svg>
      <span>{children}</span>
    </div>
  );
}
