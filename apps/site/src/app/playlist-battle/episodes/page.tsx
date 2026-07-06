import { Container, Section, Button, Eyebrow } from "@/components/ui";
import { EpisodeCard } from "@/components/cards";
import { EPISODES } from "@/lib/content";

export const metadata = { title: "Episodes" };

export default function EpisodesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <Eyebrow className="mb-3">Playlist Battle</Eyebrow>
          <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Episodes
          </h1>
          <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
            Every Playlist Battle, in one place.
          </p>
        </Container>
      </section>

      <Section>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {EPISODES.map((episode) => (
            <EpisodeCard key={episode.id} episode={episode} />
          ))}
        </div>
        <div className="mt-12">
          <Button href="/playlist-battle" variant="outline">
            Back to Playlist Battle
          </Button>
        </div>
      </Section>
    </>
  );
}
