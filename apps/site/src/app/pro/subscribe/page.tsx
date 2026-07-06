import { Check, ArrowRight } from "lucide-react";
import { Container, Section, Button, Card, Pill } from "@/components/ui";
import { PLANS } from "@/lib/content";
import { signupUrl, loginUrl } from "@/lib/site";

export const metadata = { title: "Subscribe" };

const STEPS: string[] = [
  "Choose a subscription",
  "Create your account",
  "Pay or request an invoice",
  "Enter the dashboard",
  "Add artists / songs to monitor",
  "Receive tracking and reports",
];

export default function SubscribePage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Pill tone="gold">Hitlist Pro</Pill>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Choose your plan.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              Pick the subscription that matches how you work, create your account, and start tracking where your music
              plays across Romanian radio and TV.
            </p>
          </div>
        </Container>
      </section>

      {/* Plans */}
      <Section
        eyebrow="Subscriptions"
        title="Plans for every stage."
        sub="From independent artists to labels and enterprise teams — every plan runs on the same monitoring platform."
      >
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <Card
              key={plan.name}
              className={plan.featured ? "border-brand-500/30 ring-1 ring-brand-500/20" : undefined}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-lg font-bold text-white">{plan.name}</div>
                {plan.featured && <Pill tone="gold">Popular</Pill>}
              </div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-500">{plan.audience}</p>
              <div className="mt-5 flex items-baseline gap-1">
                <span className="font-mono text-3xl font-semibold text-goldlight">{plan.price}</span>
                {plan.period && <span className="font-mono text-sm text-zinc-500">{plan.period}</span>}
              </div>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-[13px] leading-relaxed text-zinc-400">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                    {feature}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                <Button
                  href={signupUrl}
                  external
                  variant={plan.featured ? "primary" : "outline"}
                  className="w-full"
                >
                  Create account
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </Section>

      {/* How it works */}
      <Section
        eyebrow="How it works"
        title="From plan to reports in six steps."
        sub="The monitoring platform lives on the Hitlist Pro app — you'll finish setup and work from there."
      >
        <ol className="grid gap-4 sm:grid-cols-2">
          {STEPS.map((step, i) => (
            <li key={step}>
              <Card className="flex items-center gap-4">
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-500/10 font-mono text-sm font-semibold text-brand-400">
                  {i + 1}
                </span>
                <span className="text-[15px] font-medium text-white">{step}</span>
              </Card>
            </li>
          ))}
        </ol>
        <p className="mt-6 text-[13px] leading-relaxed text-zinc-600">
          After creating your account, the dashboard and monitoring tools open in the Hitlist Pro app.
        </p>
      </Section>

      {/* Closing CTA */}
      <Section>
        <div className="rounded-2xl border border-white/[0.08] bg-ink-surface p-8 sm:p-12">
          <h2 className="max-w-2xl font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Ready to start monitoring?
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Create your account to pick a plan and set up tracking, or log in if you already have one.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href={signupUrl} external size="lg">
              Create account
            </Button>
            <Button href={loginUrl} external variant="ghost" size="lg">
              Login <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
