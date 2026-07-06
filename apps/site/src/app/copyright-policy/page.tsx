import { Container, Eyebrow, Card } from "@/components/ui";

export const metadata = { title: "Copyright & Rights Clearance Policy" };

export default function CopyrightPolicyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-4">Legal</Eyebrow>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Copyright &amp; Rights Clearance Policy
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
              <h2 className="font-display text-xl font-bold text-white">1. Respect for rights holders</h2>
              <p>
                MUZE Records, operator of Hitlist and hitlist.fm, respects the intellectual property rights of others
                and expects users of the Service to do the same. This policy explains how we handle copyright and rights
                clearance across the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">2. Rights clearance for submissions</h2>
              <p>
                Anyone submitting music or other content must hold all rights required for that submission, including any
                master, publishing and performance rights. You are responsible for ensuring appropriate clearances are
                in place before submitting.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">3. Reporting infringement</h2>
              <p>
                If you believe content on the Service infringes your copyright, please contact MUZE Records with the
                following information:
              </p>
              <ul className="ml-5 list-disc space-y-2">
                <li>Identification of the work you claim has been infringed.</li>
                <li>The location of the allegedly infringing material on the Service.</li>
                <li>Your contact details and a statement of good-faith belief.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">4. Our response</h2>
              <p>
                We review valid notices and may remove or disable access to material that we determine, in our
                reasonable judgment, to be infringing. We may also take action against accounts that repeatedly infringe
                the rights of others.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">5. Counter-notice</h2>
              <p>
                If you believe material was removed in error, you may submit a counter-notice explaining why you have the
                right to use it. We will review counter-notices in good faith and respond as appropriate.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">6. Changes &amp; contact</h2>
              <p>
                We may update this policy from time to time. For copyright matters, contact MUZE Records through the
                channels listed on hitlist.fm.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </>
  );
}
