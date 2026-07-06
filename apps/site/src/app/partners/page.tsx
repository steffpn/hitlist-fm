import { Compass, Users, ListMusic, BarChart3, ArrowRight } from "lucide-react";
import { Container, Section, Button, Card, Pill } from "@/components/ui";
import { SPONSORSHIP } from "@/lib/content";

export const metadata = { title: "Partners" };

const INTERSECTIONS: { title: string; description: string; icon: React.ReactNode }[] = [
  {
    title: "Music discovery",
    description: "Submissions, First Listen and early airplay signals surface what's next.",
    icon: <Compass className="h-5 w-5" />,
  },
  {
    title: "Creator culture",
    description: "Playlist Battle brings artists, guests and audiences into one conversation.",
    icon: <Users className="h-5 w-5" />,
  },
  {
    title: "Playlisting",
    description: "Curated Hitlist playlists move records from submission to rotation.",
    icon: <ListMusic className="h-5 w-5" />,
  },
  {
    title: "Music data",
    description: "Hitlist Pro reads radio and TV airplay across the market in real numbers.",
    icon: <BarChart3 className="h-5 w-5" />,
  },
];

export default function PartnersPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Pill tone="gold">Partners</Pill>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Partner with Hitlist.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              Hitlist sits at the intersection of music discovery, creator culture, playlisting and music data.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/contact" size="lg">
                Request Partnership Deck
              </Button>
              <Button href="/pro" variant="ghost" size="lg">
                Explore Hitlist Pro <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Why partner */}
      <Section
        eyebrow="Why partner with Hitlist"
        title="One brand across the moments that shape a hit."
        sub="From the first submission to national airplay, Hitlist touches the record at every stage — giving partners a single, credible platform to reach artists, industry and audiences at once."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {INTERSECTIONS.map((item) => (
            <Card key={item.title}>
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                {item.icon}
              </span>
              <div className="font-semibold text-white">{item.title}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{item.description}</p>
            </Card>
          ))}
        </div>
        <p className="mt-8 max-w-2xl text-[15px] leading-relaxed text-zinc-400">
          Backed by MUZE Records, Hitlist pairs chart-culture reach with the pro-data credibility of Hitlist Pro —
          a rare combination for brands that want to be part of how music is discovered, debated and measured.
        </p>
      </Section>

      {/* Sponsorship opportunities */}
      <Section
        eyebrow="Sponsorship opportunities"
        title="Ways to build with us."
        sub="A menu of formats across the show, the playlists, public voting and the data — shaped to fit each partner's goals."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {SPONSORSHIP.map((item) => (
            <Card key={item} className="flex items-start gap-3">
              <Pill tone="gold" className="shrink-0">
                Partner
              </Pill>
              <span className="text-[15px] font-medium leading-snug text-white">{item}</span>
            </Card>
          ))}
        </div>
      </Section>

      {/* Closing CTA */}
      <Section>
        <div className="rounded-2xl border border-white/[0.08] bg-ink-surface p-8 sm:p-12">
          <h2 className="max-w-2xl font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Let's find the right fit.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Request the partnership deck for formats, reach and case studies, and we'll tailor a proposal to your goals.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/contact" size="lg">
              Request Partnership Deck
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
