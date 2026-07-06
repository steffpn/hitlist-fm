import { Container, Eyebrow, Card } from "@/components/ui";

export const metadata = { title: "Terms & Conditions" };

export default function TermsPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Eyebrow className="mb-4">Legal</Eyebrow>
            <h1 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-5xl">
              Terms &amp; Conditions
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
              <h2 className="font-display text-xl font-bold text-white">1. Acceptance of terms</h2>
              <p>
                These Terms &amp; Conditions govern your access to and use of Hitlist and the hitlist.fm website and
                applications (the &ldquo;Service&rdquo;), operated by MUZE Records (&ldquo;we&rdquo;, &ldquo;us&rdquo;).
                By accessing or using the Service you agree to be bound by these terms. If you do not agree, do not use
                the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">2. Use of the Service</h2>
              <p>
                You agree to use the Service only for lawful purposes and in accordance with these terms. You are
                responsible for maintaining the confidentiality of your account credentials and for all activity that
                occurs under your account.
              </p>
              <ul className="ml-5 list-disc space-y-2">
                <li>Do not misuse, interfere with, or attempt to disrupt the Service.</li>
                <li>Do not access the Service through automated means except as expressly permitted.</li>
                <li>Do not upload content you do not have the rights to submit.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">3. Accounts</h2>
              <p>
                Certain features require an account. You must provide accurate information and keep it up to date. We may
                suspend or terminate accounts that violate these terms or that we reasonably believe present a risk to
                the Service or other users.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">4. Intellectual property</h2>
              <p>
                The Service, including its design, branding, data compilations and software, is owned by MUZE Records or
                its licensors and is protected by applicable intellectual property laws. Except as expressly permitted,
                you may not copy, modify, distribute or create derivative works from the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">5. Disclaimers &amp; liability</h2>
              <p>
                The Service is provided &ldquo;as is&rdquo; without warranties of any kind. To the fullest extent
                permitted by law, MUZE Records is not liable for indirect, incidental or consequential damages arising
                from your use of the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-xl font-bold text-white">6. Changes &amp; contact</h2>
              <p>
                We may update these terms from time to time. Continued use of the Service after changes take effect
                constitutes acceptance of the revised terms. For questions, contact MUZE Records through the channels
                listed on hitlist.fm.
              </p>
            </section>
          </div>
        </div>
      </Container>
    </>
  );
}
