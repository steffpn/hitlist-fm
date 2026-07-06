import { ArrowRight, Radio, Swords, ListMusic, BarChart3 } from "lucide-react";
import { Container, Section, Button, Card, Pill } from "@/components/ui";

export const metadata = { title: "About" };

const KEY_IDEAS: { title: string; description: string; icon: React.ReactNode }[] = [
  {
    title: "Hitlist is the brand.",
    description:
      "The umbrella that ties everything together — the identity music discovery, the show and the monitoring tools all live under.",
    icon: <Radio className="h-5 w-5" />,
  },
  {
    title: "Playlist Battle is the show.",
    description:
      "The format where new songs compete for a spot in Hitlist playlists — listened to, debated and scored on air.",
    icon: <Swords className="h-5 w-5" />,
  },
  {
    title: "Hitlist Playlists are the discovery layer.",
    description:
      "Curated playlists where the music that earns its place gets heard, followed and amplified to real audiences.",
    icon: <ListMusic className="h-5 w-5" />,
  },
  {
    title: "Hitlist Pro is the monitoring app for professionals.",
    description:
      "Radio and TV airplay tracking for artists, labels and music teams who need to know where their songs actually play.",
    icon: <BarChart3 className="h-5 w-5" />,
  },
];

export default function AboutPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Pill tone="gold">About</Pill>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              About Hitlist.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              Hitlist is a music discovery and monitoring platform built for the modern music industry. It brings
              together curated playlists, Playlist Battle and professional radio &amp; TV monitoring tools to help music
              be discovered, understood and amplified.
            </p>
          </div>
        </Container>
      </section>

      {/* The key idea */}
      <Section
        eyebrow="The key idea"
        title="One brand, three ways music moves."
        sub="Every part of Hitlist plays a distinct role — discovery, competition and professional insight — under one identity."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {KEY_IDEAS.map((idea) => (
            <Card key={idea.title}>
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                {idea.icon}
              </span>
              <div className="font-semibold text-white">{idea.title}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{idea.description}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* The company */}
      <Section eyebrow="The company" title="Backed by MUZE Records.">
        <p className="max-w-2xl text-[15px] leading-relaxed text-zinc-400">
          Hitlist is built and operated by MUZE Records — the company behind the brand, the show and the tools. It’s
          where music discovery and professional monitoring come together in one place, connecting the moment a song is
          heard to the data that shows how far it travels.
        </p>
      </Section>

      {/* Closing CTA */}
      <Section>
        <div className="rounded-2xl border border-white/[0.08] bg-ink-surface p-8 sm:p-12">
          <h2 className="max-w-2xl font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Discover the music. Track the airwaves.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Explore how Hitlist helps music get discovered — and how Hitlist Pro turns airplay into insight.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/pro" size="lg">
              Explore Hitlist Pro <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/playlist-battle" variant="outline" size="lg">
              Watch Playlist Battle
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
