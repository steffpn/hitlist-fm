import { Check } from "lucide-react";
import { Container, Section, Pill, Eyebrow } from "@/components/ui";
import { DemoForm } from "@/components/forms";
import { PRO_FEATURES, PRO_AUDIENCE } from "@/lib/content";

export const metadata = { title: "Request a Demo" };

export default function RequestDemoPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Pill tone="gold">Hitlist Pro</Pill>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              See Hitlist Pro on your catalogue.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              Tell us what you want to track and we&apos;ll set up a walkthrough.
            </p>
          </div>
        </Container>
      </section>

      {/* Form + what to expect */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,420px)] lg:gap-14">
          {/* Left: form */}
          <div>
            <DemoForm />
          </div>

          {/* Right: what to expect */}
          <div className="lg:pt-1">
            <Eyebrow className="mb-4">What you&apos;ll see</Eyebrow>
            <ul className="space-y-3">
              {PRO_FEATURES.map((f) => (
                <li key={f.title} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-none items-center justify-center rounded-full bg-brand-500/10 text-brand-400">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-[14px] leading-relaxed text-zinc-400">{f.title}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <Eyebrow className="mb-4">Built for</Eyebrow>
              <div className="flex flex-wrap gap-2.5">
                {PRO_AUDIENCE.map((a) => (
                  <Pill key={a} tone="neutral">
                    {a}
                  </Pill>
                ))}
              </div>
            </div>

            <p className="mt-8 text-[13px] leading-relaxed text-zinc-600">
              A member of the Hitlist Pro team will walk you through detections, dashboards and reporting on real data
              from your own catalogue.
            </p>
          </div>
        </div>
      </Section>
    </>
  );
}
