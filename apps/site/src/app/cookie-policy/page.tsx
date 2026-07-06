import { Container, Eyebrow, Card } from "@/components/ui";

export const metadata = { title: "Cookie Policy" };

export default function CookiePolicyPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-4">Legal</Eyebrow>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Cookie Policy
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
              <h2 className="font-display text-xl font-bold text-white">1. What cookies are</h2>
              <p>
                Cookies are small text files placed on your device when you visit a website. Hitlist, operated by MUZE
                Records, uses cookies and similar technologies on hitlist.fm to make the Service work and to understand
                how it is used.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">2. Types of cookies we use</h2>
              <ul className="ml-5 list-disc space-y-2">
                <li>
                  <span className="text-zinc-300">Essential cookies</span> — required for core functionality such as
                  authentication and security.
                </li>
                <li>
                  <span className="text-zinc-300">Preference cookies</span> — remember your settings and choices.
                </li>
                <li>
                  <span className="text-zinc-300">Analytics cookies</span> — help us measure and improve how the Service
                  performs.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">3. Managing cookies</h2>
              <p>
                You can control and delete cookies through your browser settings. Blocking some cookies may affect the
                functionality of the Service. Where required, we ask for your consent before setting non-essential
                cookies.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">4. Third-party cookies</h2>
              <p>
                Some cookies may be set by third-party services we use, such as analytics or embedded media providers.
                Those providers process data under their own policies, which we encourage you to review.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">5. Changes &amp; contact</h2>
              <p>
                We may update this Cookie Policy as our use of cookies evolves. For questions, contact MUZE Records
                through the channels listed on hitlist.fm.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </>
  );
}
