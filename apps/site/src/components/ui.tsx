import Link from "next/link";
import { cn } from "@/lib/cn";

export function Container({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-content px-6", className)}>{children}</div>;
}

export function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500", className)}>
      {children}
    </div>
  );
}

export function Section({
  eyebrow,
  title,
  sub,
  children,
  className,
  id,
  center,
}: {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  sub?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
  id?: string;
  center?: boolean;
}) {
  return (
    <section id={id} className={cn("border-t border-white/[0.06] py-20 sm:py-24", className)}>
      <Container>
        {(eyebrow || title || sub) && (
          <div className={cn("mb-12 max-w-2xl", center && "mx-auto text-center")}>
            {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
            {title && <h2 className="font-display text-3xl font-bold tracking-tight text-white sm:text-4xl">{title}</h2>}
            {sub && <p className="mt-3 text-[15px] leading-relaxed text-zinc-400">{sub}</p>}
          </div>
        )}
        {children}
      </Container>
    </section>
  );
}

type ButtonVariant = "primary" | "outline" | "ghost";

export function Button({
  href,
  children,
  variant = "primary",
  className,
  external,
  type,
  size = "md",
}: {
  href?: string;
  children: React.ReactNode;
  variant?: ButtonVariant;
  className?: string;
  external?: boolean;
  type?: "button" | "submit";
  size?: "md" | "lg";
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-all disabled:opacity-50";
  const sizes = { md: "px-5 py-3 text-sm", lg: "px-6 py-3.5 text-[15px]" }[size];
  const styles = {
    primary:
      "bg-gradient-to-br from-brand-500 to-ember text-ink font-bold shadow-[0_10px_28px_rgba(245,177,61,0.30)] hover:brightness-105 active:scale-[0.98]",
    outline: "border border-white/15 text-zinc-200 hover:border-white/30 hover:text-white",
    ghost: "text-brand-400 hover:text-brand-300",
  }[variant];
  const cls = cn(base, sizes, styles, className);
  if (href) {
    if (external || href.startsWith("http")) {
      return (
        <a href={href} className={cls} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={cls}>
      {children}
    </button>
  );
}

export function Card({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("rounded-2xl border border-white/[0.08] bg-ink-surface p-6", className)}>{children}</div>;
}

export function Pill({
  children,
  tone = "gold",
  className,
}: {
  children: React.ReactNode;
  tone?: "gold" | "ember" | "neutral";
  className?: string;
}) {
  const tones = {
    gold: "border-brand-500/30 bg-brand-500/10 text-brand-400",
    ember: "border-ember/30 bg-ember/10 text-ember-light",
    neutral: "border-white/12 bg-white/5 text-zinc-400",
  }[tone];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-wider",
        tones,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function LiveBadge({ children = "Live" }: { children?: React.ReactNode }) {
  return (
    <Pill tone="ember">
      <span className="relative inline-flex h-1.5 w-1.5">
        <span className="absolute inset-0 rounded-full bg-ember animate-ember-ping" />
        <span className="relative h-1.5 w-1.5 rounded-full bg-ember" />
      </span>
      {children}
    </Pill>
  );
}

/** Warm gradient placeholder tile (missing-artwork fallback / cover). */
export function GradientTile({
  className,
  from = "#F5B13D",
  to = "#FF5A34",
  label,
}: {
  className?: string;
  from?: string;
  to?: string;
  label?: React.ReactNode;
}) {
  return (
    <div
      className={cn("flex items-center justify-center rounded-xl", className)}
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {label}
    </div>
  );
}

/** Big mono data number in gold-light — "the one place numbers get loud". */
export function DataNumber({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("font-mono font-semibold text-goldlight", className)}>{children}</span>;
}
