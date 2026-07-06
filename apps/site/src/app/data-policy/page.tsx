import { Container, Eyebrow, Card } from "@/components/ui";

export const metadata = { title: "Data Usage Policy" };

export default function DataPolicyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-4">Legal</Eyebrow>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Data Usage Policy
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
              <h2 className="font-display text-xl font-bold text-white">1. Scope</h2>
              <p>
                This Data Usage Policy describes how MUZE Records handles the monitoring and analytics data made
                available through Hitlist Pro on hitlist.fm. It applies to airplay detections, charts, reports and other
                data outputs of the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">2. Permitted use of data</h2>
              <p>
                Data you access through a Hitlist Pro subscription is provided for your internal business use. You may
                use it to inform your own decisions and reporting, subject to any limits stated in your plan.
              </p>
              <ul className="ml-5 list-disc space-y-2">
                <li>Use data within your organisation and for your own artists or catalogue.</li>
                <li>Reference insights in your own materials with appropriate attribution.</li>
                <li>Respect any export or seat limits associated with your plan.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">3. Restrictions</h2>
              <p>
                Unless expressly permitted, you may not resell, redistribute, publicly publish in bulk, or use the data
                to build a competing product. Automated scraping or extraction beyond the tools we provide is not
                permitted.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">4. Accuracy &amp; sources</h2>
              <p>
                Monitoring data is derived from detection systems and third-party sources and is provided on a
                best-effort basis. While we work to keep it accurate, MUZE Records does not warrant that data is complete
                or error-free, and it should not be relied on as the sole basis for critical decisions.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">5. Security &amp; confidentiality</h2>
              <p>
                Where data is marked confidential or provided under a specific agreement, you agree to protect it and use
                it only for the agreed purposes. You are responsible for controlling access within your organisation.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">6. Changes &amp; contact</h2>
              <p>
                We may update this Data Usage Policy from time to time. For questions about data usage, contact MUZE
                Records through the channels listed on hitlist.fm.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </>
  );
}
