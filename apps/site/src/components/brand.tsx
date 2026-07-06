"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

/* hitlist.fm brand primitives — rotation-gauge mark + hitlist.fm wordmark.
 * Geometry mirrors design_handoff_hitlist_fm/logo/mark.svg. */

export function GaugeMark({
  size = 28,
  className,
  needle = true,
  ticks = true,
}: {
  size?: number;
  className?: string;
  needle?: boolean;
  ticks?: boolean;
}) {
  const id = "hg" + useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 120 120" fill="none" className={className} role="img" aria-label="hitlist.fm">
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#F5B13D" />
          <stop offset="1" stopColor="#FF5A34" />
        </linearGradient>
      </defs>
      <circle cx="60" cy="60" r="52" stroke="#FFF0DC" strokeOpacity="0.10" strokeWidth="2" />
      {ticks && (
        <circle cx="60" cy="60" r="43" stroke="#F5B13D" strokeOpacity="0.32" strokeWidth="2.5" strokeDasharray="1 8" strokeLinecap="round" />
      )}
      <circle cx="60" cy="60" r="52" stroke="#FFF0DC" strokeOpacity="0.08" strokeWidth="6" strokeDasharray="245 82" strokeLinecap="round" transform="rotate(135 60 60)" />
      <circle cx="60" cy="60" r="52" stroke={`url(#${id})`} strokeWidth="6" strokeDasharray="191 136" strokeLinecap="round" transform="rotate(135 60 60)" />
      {needle && <line x1="60" y1="60" x2="93" y2="41" stroke="#FFD588" strokeWidth="4" strokeLinecap="round" />}
      <circle cx="60" cy="60" r="8" fill="#F5B13D" />
      <circle cx="60" cy="60" r="3.4" fill="#12100E" />
    </svg>
  );
}

/** hitlist + .fm(gold). On a gold tile, knock the whole wordmark out in ink. */
export function Wordmark({ className, onGold = false }: { className?: string; onGold?: boolean }) {
  return (
    <span
      className={cn("font-display font-extrabold tracking-[-0.03em] lowercase leading-none", className)}
      style={onGold ? { color: "#12100E" } : undefined}
    >
      hitlist<span style={onGold ? undefined : { color: "#F5B13D" }}>.fm</span>
    </span>
  );
}

export function BrandLockup({ markSize = 26, className, wordmarkClassName }: { markSize?: number; className?: string; wordmarkClassName?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <GaugeMark size={markSize} />
      <Wordmark className={wordmarkClassName ?? "text-lg"} />
    </span>
  );
}
