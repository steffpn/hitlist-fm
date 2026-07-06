import { Container, Eyebrow, Card } from "@/components/ui";

export const metadata = { title: "Subscription Terms" };

export default function SubscriptionTermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-4">Legal</Eyebrow>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Subscription Terms
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
              <h2 className="font-display text-xl font-bold text-white">1. Paid plans</h2>
              <p>
                These Subscription Terms apply to paid Hitlist Pro plans offered by MUZE Records through hitlist.fm. They
                supplement our Terms &amp; Conditions. By subscribing, you agree to the pricing, billing and renewal
                terms described here and at checkout.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">2. Billing &amp; renewal</h2>
              <p>
                Subscriptions are billed in advance on a recurring basis for the plan and billing period you select.
                Unless cancelled, subscriptions renew automatically at the end of each period at the then-current price.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">3. Cancellation</h2>
              <p>
                You may cancel your subscription at any time. Cancellation takes effect at the end of the current billing
                period, and you retain access until then. We do not provide refunds for partial periods except where
                required by law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">4. Price changes</h2>
              <p>
                We may change subscription pricing or plan features. Where a change affects your subscription, we will
                give reasonable notice before it takes effect. Continued use after the change constitutes acceptance of
                the new terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">5. Suspension &amp; termination</h2>
              <p>
                We may suspend or terminate a subscription for non-payment or for breach of our Terms &amp; Conditions.
                On termination, your access to paid features ends and no further charges are made.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">6. Changes &amp; contact</h2>
              <p>
                We may update these Subscription Terms from time to time. For billing questions, contact MUZE Records
                through the channels listed on hitlist.fm.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </>
  );
}
