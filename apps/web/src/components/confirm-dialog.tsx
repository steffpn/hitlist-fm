"use client";

import { cn } from "@/lib/cn";

/**
 * Custom confirmation dialog (replaces native confirm()).
 * Controlled: parent owns the open state and the pending action.
 */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  loading = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onCancel();
      }}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 w-full max-w-sm shadow-2xl shadow-black/50">
        <h2 className="text-base font-bold text-white mb-2">{title}</h2>
        <div className="text-sm text-zinc-400 mb-6">{message}</div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2 text-sm text-zinc-300 border border-zinc-800 hover:border-zinc-600 rounded-lg transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(
              "flex-1 px-4 py-2 text-sm font-semibold rounded-lg transition-colors disabled:opacity-50",
              danger
                ? "bg-brand-600 text-white hover:bg-brand-500"
                : "bg-white text-zinc-950 hover:bg-zinc-200",
            )}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
