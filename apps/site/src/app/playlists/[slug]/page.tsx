import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { Container, Section, Button, Pill, GradientTile } from "@/components/ui";
import { SpotifyEmbed, YouTubeEmbed } from "@/components/embeds";
import { PLAYLISTS, EPISODES } from "@/lib/content";
import { SITE_URL } from "@/lib/site";

export function generateStaticParams() {
  return PLAYLISTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const playlist = PLAYLISTS.find((p) => p.slug === slug);
  return { title: playlist ? playlist.name : "Playlist" };
}

const ENTRY_ROUTES = [
  "Hitlist editorial picks",
  "Playlist Battle picks",
  "public vote picks",
  "performance-based holds",
  "premieres / first listen",
];

export default async function Page({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const playlist = PLAYLISTS.find((p) => p.slug === slug);
  if (!playlist) notFound();

  const relatedEpisode = playlist.relatedEpisodeId
    ? EPISODES.find((e) => e.id === playlist.relatedEpisodeId)
    : undefined;

  const shareUrl = `${SITE_URL}/playlists/${playlist.slug}`;
  const shareText = `${playlist.name} on Hitlist`;
  const xShare = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
  const fbShare = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="flex flex-col gap-8 sm:flex-row sm:items-center">
            <GradientTile
              from={playlist.gradient[0]}
              to={playlist.gradient[1]}
              label={<span className="font-display text-lg font-bold text-ink/80">Hitlist</span>}
              className="h-28 w-28 shrink-0 shadow-[0_18px_44px_rgba(245,177,61,0.25)] sm:h-36 sm:w-36"
            />
            <div>
              {playlist.seasonal ? (
                <Pill tone="gold">Seasonal edition</Pill>
              ) : (
                <Pill tone="neutral">Hitlist Playlist</Pill>
              )}
              <h1 className="mt-4 max-w-2xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
                {playlist.name}
              </h1>
              <p className="mt-4 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
                {playlist.description}
              </p>
              <div className="mt-5">
                <Pill tone="neutral">{playlist.updated}</Pill>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Listen Now */}
      <Section eyebrow="Listen Now" title="Play the full playlist.">
        <SpotifyEmbed url={playlist.spotifyUrl} height={420} title={playlist.name} />
      </Section>

      {/* How Songs Enter */}
      <Section
        eyebrow="How Songs Enter"
        title="How a track lands on this playlist."
        sub="Songs reach Hitlist playlists through a mix of editorial judgement, the Playlist Battle show, public voting and real performance."
      >
        <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ENTRY_ROUTES.map((route, i) => (
            <li
              key={route}
              className="flex items-start gap-3 rounded-xl border border-white/[0.07] bg-ink-surface p-4"
            >
              <span className="font-mono text-sm font-semibold text-brand-400">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="text-sm capitalize text-zinc-300">{route}</span>
            </li>
          ))}
        </ol>
      </Section>

      {/* Related Episodes */}
      {relatedEpisode && (
        <Section
          eyebrow="Related Episodes"
          title="Where these songs were debated."
          sub="This playlist connects to a Playlist Battle episode — watch the songs get listened to, scored and selected."
        >
          <div className="max-w-3xl">
            <YouTubeEmbed id={relatedEpisode.youtubeId} title={relatedEpisode.title} />
            <h3 className="mt-4 font-display text-lg font-bold text-white">{relatedEpisode.title}</h3>
            <p className="mt-1 text-sm text-zinc-500">
              {relatedEpisode.edition} · {relatedEpisode.date}
            </p>
          </div>
        </Section>
      )}

      {/* Submit for This Playlist */}
      <Section
        eyebrow="Submit for This Playlist"
        title="Want your song considered here?"
        sub="Artists, managers, labels and distributors can submit tracks for playlist consideration, Playlist Battle and future Hitlist editions."
      >
        <div className="rounded-2xl border border-white/[0.08] bg-ink-surface p-8">
          <p className="max-w-2xl text-[15px] leading-relaxed text-zinc-400">
            Submissions are reviewed against Hitlist editorial and performance criteria. Submitting a song does not
            guarantee placement, but every eligible track is considered for {playlist.name} and the wider Hitlist
            ecosystem.
          </p>
          <div className="mt-6">
            <Button href="/submit" size="lg">
              Submit Your Song
            </Button>
          </div>
        </div>
      </Section>

      {/* Share */}
      <Section eyebrow="Share" title="Send it to someone.">
        <div className="flex flex-wrap gap-3">
          <Button href={xShare} variant="outline" external>
            Share on X <ArrowUpRight className="h-4 w-4" />
          </Button>
          <Button href={fbShare} variant="outline" external>
            Share on Facebook <ArrowUpRight className="h-4 w-4" />
          </Button>
        </div>
      </Section>
    </>
  );
}
