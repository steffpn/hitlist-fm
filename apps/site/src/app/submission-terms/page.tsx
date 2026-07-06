import { Container, Eyebrow, Card } from "@/components/ui";

export const metadata = { title: "Submission Terms" };

export default function SubmissionTermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-4">Legal</Eyebrow>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Submission Terms
            </h1>
            <p className="mt-4 font-mono text-[13px] uppercase tracking-wider text-zinc-500">
              Last updated: 6 July 2026
            </p>
          </div>
        </Container>
      </section>

      {/* Body */}
      <Container className="pb-24">
        <div className="max-w-3xl">
          <Card className="mb-10">
            <p className="text-[13px] leading-relaxed text-zinc-400">
              <span className="font-semibold text-white">Template — review with legal counsel before launch.</span> This
              document is placeholder copy and does not constitute legal advice.
            </p>
          </Card>

          <div className="space-y-10 text-[15px] leading-relaxed text-zinc-400">
            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">1. Submitting music</h2>
              <p>
                These Submission Terms apply when you submit music, links or related materials to Hitlist for playlist
                or editorial consideration. Hitlist is operated by MUZE Records. By submitting, you agree to these terms
                in addition to our Terms &amp; Conditions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">2. Your representations</h2>
              <ul className="ml-5 list-disc space-y-2">
                <li>You own or control all rights necessary to submit the material.</li>
                <li>The material does not infringe any third-party rights.</li>
                <li>The information you provide is accurate and complete.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">3. No guarantee of placement</h2>
              <p>
                Submitting music does not guarantee inclusion in any playlist, episode or feature. Editorial decisions
                are made at the sole discretion of the Hitlist team, and we are under no obligation to provide feedback
                or reasons.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">4. Permitted use</h2>
              <p>
                By submitting, you grant MUZE Records a non-exclusive licence to review the material and, where a
                placement is agreed, to feature it within the Service. This licence does not transfer ownership of your
                work.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">5. No fees for review</h2>
              <p>
                Submitting music for consideration is free of charge. We will never require payment as a condition of
                editorial review. Any partnership or promotional arrangement is subject to a separate agreement.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">6. Changes &amp; contact</h2>
              <p>
                We may update these Submission Terms from time to time. For questions about a submission, contact MUZE
                Records through the channels listed on hitlist.fm.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </>
  );
}
