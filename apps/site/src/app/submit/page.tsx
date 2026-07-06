import { Container, Section, Card, LiveBadge } from "@/components/ui";
import { SubmitMusicForm } from "@/components/forms";
import { SUBMISSION_TYPES } from "@/lib/content";

export const metadata = { title: "Submit Music" };

export default function SubmitPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <LiveBadge>For artists, managers, labels &amp; distributors</LiveBadge>
          <h1 className="mt-6 max-w-3xl font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
            Submit your song to <span className="text-gradient-sunset">Hitlist</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
            Submit your track for playlist consideration, Playlist Battle or future Hitlist editions.
          </p>
        </Container>
      </section>

      {/* Submission Types */}
      <Section
        eyebrow="Submission Types"
        title="What your submission can be considered for."
        sub="One submission, reviewed across the Hitlist ecosystem — playlists, the show, and clips for social."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SUBMISSION_TYPES.map((type) => (
            <Card key={type.title}>
              <div className="font-display text-lg font-bold text-white">{type.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{type.description}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Form */}
      <Section id="form" eyebrow="Submit your track" title="Tell us about the song.">
        <div className="max-w-3xl">
          <SubmitMusicForm />
        </div>
      </Section>
    </>
  );
}
