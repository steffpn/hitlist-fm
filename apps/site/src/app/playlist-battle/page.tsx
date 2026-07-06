import Link from "next/link";
import { Play, ArrowRight, ArrowUpRight } from "lucide-react";
import { Container, Section, Button, LiveBadge, Pill, GradientTile } from "@/components/ui";
import { EpisodeCard } from "@/components/cards";
import { EPISODES, PLAYLISTS, BATTLE_STEPS } from "@/lib/content";

export const metadata = { title: "Playlist Battle" };

export default function PlaylistBattlePage() {
  const latest = EPISODES[0];
  const guests = Array.from(new Set(EPISODES.flatMap((e) => e.guests)));

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <LiveBadge>The show</LiveBadge>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Playlist Battle
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
            The show where songs compete for a spot in Hitlist playlists.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Button href={`https://www.youtube.com/watch?v=${latest.youtubeId}`} external size="lg">
              <Play className="h-4 w-4" /> Watch Latest Episode
            </Button>
            <Button href="/submit" variant="outline" size="lg">
              Submit Music
            </Button>
          </div>
        </Container>
      </section>

      {/* How It Works */}
      <Section
        eyebrow="Playlist Battle"
        title="How It Works"
        sub="Every edition follows the same path — from submission to the playlist."
      >
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BATTLE_STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-ink-surface p-4">
              <span className="font-mono text-sm font-semibold text-brand-400">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-zinc-300">{step}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* Latest Episodes */}
      <Section
        eyebrow="On demand"
        title="Latest Episodes"
        sub="Watch recent editions of the show — full listens, debates and scoring."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {EPISODES.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))}
        </div>
        <div className="mt-8">
          <Button href="/playlist-battle/episodes" variant="outline">
            All episodes <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Section>

      {/* Featured Clips */}
      <Section
        eyebrow="Short-form"
        title="Featured Clips"
        sub="Short-form clips from TikTok, Instagram Reels & YouTube Shorts."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {[
            ["#F5B13D", "#FF5A34"],
            ["#FF5A34", "#D68C24"],
            ["#D68C24", "#FFD588"],
          ].map(([from, to], i) => (
            <GradientTile
              key={i}
              from={from}
              to={to}
              className="aspect-[9/16] w-full items-end p-5"
              label={
                <span className="flex w-full items-center justify-between">
                  <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-ink/70">
                    Clip {String(i + 1).padStart(2, "0")}
                  </span>
                  <Play className="h-5 w-5 fill-ink text-ink" />
                </span>
              }
            />
          ))}
        </div>
      </Section>

      {/* Guests */}
      <Section
        eyebrow="On the panel"
        title="Guests"
        sub="Artists and industry voices who have joined the show to listen, debate and score."
      >
        <div className="flex flex-wrap gap-2.5">
          {guests.map((guest) => (
            <Pill key={guest} tone="neutral">
              {guest}
            </Pill>
          ))}
        </div>
      </Section>

      {/* Playlist Editions */}
      <Section
        eyebrow="What each episode feeds"
        title="Playlist Editions"
        sub="Every episode supports a specific Hitlist playlist — results shape what gets in."
      >
        <div className="divide-y divide-white/[0.06] overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-surface">
          {EPISODES.map((episode) => {
            const playlist = PLAYLISTS.find((p) => p.slug === episode.playlistSlug);
            if (!playlist) return null;
            return (
              <Link
                key={episode.id}
                href={`/playlists/${playlist.slug}`}
                className="group flex items-center gap-4 p-5 transition-colors hover:bg-white/[0.02]"
              >
                <span
                  className="h-11 w-11 shrink-0 rounded-lg"
                  style={{ background: `linear-gradient(135deg, ${playlist.gradient[0]}, ${playlist.gradient[1]})` }}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-white">{episode.title}</span>
                  <span className="mt-0.5 block truncate text-[13px] text-zinc-500">{playlist.name}</span>
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-brand-400 group-hover:text-brand-300">
                  View <ArrowUpRight className="h-3.5 w-3.5" />
                </span>
              </Link>
            );
          })}
        </div>
      </Section>

      {/* CTA row */}
      <Section>
        <div className="flex flex-wrap gap-3">
          <Button href="/submit">Submit Music</Button>
          <Button href="/playlist-battle/episodes" variant="outline">
            Watch Episodes
          </Button>
          <Button href="/playlists" variant="outline">
            Explore Playlists
          </Button>
        </div>
      </Section>
    </>
  );
}
