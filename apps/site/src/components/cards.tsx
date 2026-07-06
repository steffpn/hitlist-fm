import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { Episode, Playlist } from "@/lib/content";
import { Pill } from "@/components/ui";
import { cn } from "@/lib/cn";

export function PlaylistCard({ playlist, className }: { playlist: Playlist; className?: string }) {
  return (
    <Link
      href={`/playlists/${playlist.slug}`}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-surface transition-colors hover:border-white/20",
        className,
      )}
    >
      <div
        className="relative flex aspect-[16/10] items-end p-5"
        style={{ background: `linear-gradient(135deg, ${playlist.gradient[0]}, ${playlist.gradient[1]})` }}
      >
        <span className="font-display text-lg font-extrabold tracking-tight text-ink">{playlist.name}</span>
      </div>
      <div className="flex flex-1 flex-col p-5">
        <p className="flex-1 text-sm leading-relaxed text-zinc-400">{playlist.short}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-wider text-zinc-600">{playlist.updated}</span>
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-400 group-hover:text-brand-300">
            Explore <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

export function EpisodeCard({ episode, className }: { episode: Episode; className?: string }) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-surface", className)}>
      <a
        href={`https://www.youtube.com/watch?v=${episode.youtubeId}`}
        target="_blank"
        rel="noopener noreferrer"
        className="group relative block aspect-video overflow-hidden bg-black"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`https://img.youtube.com/vi/${episode.youtubeId}/hqdefault.jpg`}
          alt={episode.title}
          loading="lazy"
          className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100"
        />
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-ember shadow-[0_10px_28px_rgba(245,177,61,0.35)]">
            <svg viewBox="0 0 24 24" className="ml-0.5 h-6 w-6 fill-ink">
              <path d="M8 5v14l11-7z" />
            </svg>
          </span>
        </span>
      </a>
      <div className="p-5">
        <Pill tone="gold" className="mb-3">
          {episode.edition}
        </Pill>
        <h3 className="font-display text-base font-bold text-white">{episode.title}</h3>
        <p className="mt-1.5 text-[13px] text-zinc-500">
          {episode.guests.join(" · ")} — {new Date(episode.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
        </p>
      </div>
    </div>
  );
}
