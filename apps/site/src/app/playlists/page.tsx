import { ArrowRight } from "lucide-react";
import { Container, Section, Button, Eyebrow } from "@/components/ui";
import { PlaylistCard } from "@/components/cards";
import { PLAYLISTS } from "@/lib/content";

export const metadata = { title: "Playlists" };

export default function PlaylistsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <Eyebrow className="mb-4">Hitlist Playlists</Eyebrow>
          <h1 className="max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Hitlist Playlists
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
            Curated playlists for new music, regional hits, seasonal moments and emerging artists.
          </p>
        </Container>
      </section>

      {/* Playlists grid */}
      <Section>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLAYLISTS.map((p) => (
            <PlaylistCard key={p.slug} playlist={p} />
          ))}
        </div>
      </Section>

      {/* Closing CTA */}
      <Section>
        <div className="flex flex-col items-start gap-6 rounded-2xl border border-white/[0.08] bg-ink-surface p-8 sm:flex-row sm:items-center sm:justify-between sm:p-10">
          <div className="max-w-xl">
            <Eyebrow className="mb-3">For artists, managers, labels &amp; distributors</Eyebrow>
            <h2 className="font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Want your song here?
            </h2>
            <p className="mt-2 text-[15px] leading-relaxed text-zinc-400">
              Submit your track for playlist consideration, Playlist Battle or future Hitlist editions.
            </p>
          </div>
          <Button href="/submit" size="lg" className="shrink-0">
            Submit Music <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Section>
    </>
  );
}
