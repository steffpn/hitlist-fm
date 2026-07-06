import Link from "next/link";
import { Play, ListMusic, LineChart, ArrowRight, Radio, Tv, Bell, FileText } from "lucide-react";
import { Container, Section, Button, Card, Eyebrow, LiveBadge, Pill } from "@/components/ui";
import { GaugeMark } from "@/components/brand";
import { PlaylistCard } from "@/components/cards";
import { PLAYLISTS, BATTLE_STEPS, PRO_FEATURES } from "@/lib/content";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative flex flex-col items-center py-24 text-center sm:py-32">
          <div className="mb-8 drop-shadow-[0_12px_40px_rgba(245,177,61,0.28)]">
            <GaugeMark size={92} />
          </div>
          <LiveBadge>Music discovery meets music data</LiveBadge>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
            Discover what&rsquo;s next.{" "}
            <span className="text-gradient-sunset">Track what&rsquo;s working.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
            Hitlist brings together curated playlists, Playlist Battle and professional radio &amp; TV monitoring tools
            for listeners, artists, labels and the music industry.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Button href="/playlist-battle" size="lg">
              <Play className="h-4 w-4" /> Watch Playlist Battle
            </Button>
            <Button href="/playlists" variant="outline" size="lg">
              Explore Playlists
            </Button>
            <Button href="/pro" variant="outline" size="lg">
              Access Hitlist Pro
            </Button>
          </div>
        </Container>
      </section>

      {/* Three main cards */}
      <Container className="pb-4">
        <div className="grid gap-5 md:grid-cols-3">
          <ThreeCard
            icon={<Play className="h-5 w-5" />}
            kicker="Playlist Battle"
            title="Watch the Show"
            body="Songs are submitted, debated, scored and selected for Hitlist playlists."
            cta="Watch Playlist Battle"
            href="/playlist-battle"
          />
          <ThreeCard
            icon={<ListMusic className="h-5 w-5" />}
            kicker="Hitlist Playlists"
            title="Explore the Playlists"
            body="Curated playlists built around countries, genres, seasons and cultural moments."
            cta="Explore Hitlist Playlists"
            href="/playlists"
          />
          <ThreeCard
            icon={<LineChart className="h-5 w-5" />}
            kicker="Hitlist Pro"
            title="Monitor Your Music"
            body="Track how your music performs on radio and TV in Romania."
            cta="View Plans"
            href="/pro"
          />
        </div>
      </Container>

      {/* What is Hitlist */}
      <Section eyebrow="What is Hitlist?" title="One brand, four moving parts.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Hitlist", "The umbrella brand for music discovery, curation and performance data."],
            ["Playlist Battle", "The online show where songs are listened to, debated, scored and selected."],
            ["Hitlist Playlists", "The curated discovery layer — regional, seasonal and cultural editions."],
            ["Hitlist Pro", "The professional monitoring app for artists, labels and the industry."],
          ].map(([t, d]) => (
            <Card key={t}>
              <div className="font-display text-lg font-bold text-white">{t}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{d}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Playlist Battle */}
      <Section
        eyebrow="Playlist Battle"
        title="The show where songs compete for a spot."
        sub="Playlist Battle is the content engine behind the playlist ecosystem — artists submit, guests debate and score, the public votes, and the results shape the Hitlist playlists."
      >
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {BATTLE_STEPS.map((step, i) => (
            <li key={step} className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-ink-surface p-4">
              <span className="font-mono text-sm font-semibold text-brand-400">{String(i + 1).padStart(2, "0")}</span>
              <span className="text-sm text-zinc-300">{step}</span>
            </li>
          ))}
        </ol>
        <div className="mt-8">
          <Button href="/playlist-battle">
            Watch Latest Episode <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Section>

      {/* Playlists */}
      <Section
        eyebrow="Hitlist Playlists"
        title="Curated for new music, regional hits and seasonal moments."
        sub="Built around countries, genres, seasons and cultural moments — updated from Playlist Battle and real performance."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLAYLISTS.slice(0, 3).map((p) => (
            <PlaylistCard key={p.slug} playlist={p} />
          ))}
        </div>
        <div className="mt-8">
          <Button href="/playlists" variant="outline">
            Explore all playlists <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Section>

      {/* Hitlist Pro */}
      <Section
        eyebrow="Hitlist Pro"
        title="Radio & TV monitoring for music professionals."
        sub="For artists, labels, managers, radio stations and music professionals who need to track music performance on radio and TV."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRO_FEATURES.slice(0, 8).map((f, i) => (
            <div key={f.title} className="rounded-xl border border-white/[0.07] bg-ink-surface p-5">
              <span className="mb-3 inline-flex text-brand-400">
                {[<Radio key="a" />, <Tv key="b" />, <LineChart key="c" />, <FileText key="d" />][i % 4]}
              </span>
              <div className="font-semibold text-white">{f.title}</div>
              <p className="mt-1 text-[13px] leading-relaxed text-zinc-500">{f.description}</p>
            </div>
          ))}
        </div>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button href="/pro/pricing">View Plans</Button>
          <Button href="/pro/request-demo" variant="outline">
            Request a Demo
          </Button>
        </div>
      </Section>

      {/* Submit + Partners */}
      <Section>
        <div className="grid gap-5 md:grid-cols-2">
          <CtaPanel
            kicker="For artists, managers, labels & distributors"
            title="Submit your song to Hitlist"
            body="Submit your track for playlist consideration, Playlist Battle or future Hitlist editions."
            cta="Submit Your Song"
            href="/submit"
          />
          <CtaPanel
            kicker="For brands & partners"
            title="Partner with Hitlist"
            body="Hitlist sits at the intersection of music discovery, creator culture, playlisting and music data."
            cta="Partner With Hitlist"
            href="/partners"
          />
        </div>
      </Section>
    </>
  );
}

function ThreeCard({
  icon,
  kicker,
  title,
  body,
  cta,
  href,
}: {
  icon: React.ReactNode;
  kicker: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-2xl border border-white/[0.08] bg-ink-surface p-6 transition-colors hover:border-white/20"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
        {icon}
      </span>
      <Eyebrow className="mt-5">{kicker}</Eyebrow>
      <h3 className="mt-1 font-display text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{body}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-[13px] font-semibold text-brand-400 group-hover:text-brand-300">
        {cta} <ArrowRight className="h-3.5 w-3.5" />
      </span>
    </Link>
  );
}

function CtaPanel({
  kicker,
  title,
  body,
  cta,
  href,
}: {
  kicker: string;
  title: string;
  body: string;
  cta: string;
  href: string;
}) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.08] bg-ink-surface p-8">
      <Pill tone="neutral">{kicker}</Pill>
      <h3 className="mt-4 font-display text-2xl font-bold text-white">{title}</h3>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-zinc-400">{body}</p>
      <div className="mt-6">
        <Button href={href}>{cta}</Button>
      </div>
    </div>
  );
}
