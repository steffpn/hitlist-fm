import { Container, Eyebrow, Card } from "@/components/ui";

export const metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-4">Legal</Eyebrow>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Privacy Policy
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
              <h2 className="font-display text-xl font-bold text-white">1. Who we are</h2>
              <p>
                This Privacy Policy explains how MUZE Records (&ldquo;we&rdquo;, &ldquo;us&rdquo;) collects, uses and
                protects personal data when you use Hitlist and the hitlist.fm website and applications (the
                &ldquo;Service&rdquo;). We act as the data controller for personal data processed through the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">2. Data we collect</h2>
              <ul className="ml-5 list-disc space-y-2">
                <li>Account details you provide, such as name, email and organisation.</li>
                <li>Content you submit, including music submissions and messages.</li>
                <li>Usage and device data collected automatically when you interact with the Service.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">3. How we use data</h2>
              <p>
                We use personal data to provide and improve the Service, to respond to your requests, to send relevant
                communications, and to comply with legal obligations. We process data on the basis of your consent, the
                performance of a contract, or our legitimate interests, as applicable.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">4. Sharing &amp; retention</h2>
              <p>
                We do not sell personal data. We may share data with service providers who process it on our behalf
                under appropriate safeguards, and where required by law. We retain personal data only for as long as
                necessary for the purposes described in this policy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">5. Your rights</h2>
              <p>
                Subject to applicable law, you may have the right to access, correct, delete or restrict the processing
                of your personal data, and to object to certain processing or withdraw consent. To exercise these
                rights, contact MUZE Records through the channels listed on hitlist.fm.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">6. Changes &amp; contact</h2>
              <p>
                We may update this policy from time to time and will indicate the effective date above. For questions
                about how we handle your data, contact MUZE Records.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </>
  );
}
