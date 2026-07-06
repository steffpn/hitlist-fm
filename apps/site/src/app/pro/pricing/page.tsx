import { Check, ArrowRight } from "lucide-react";
import { Container, Section, Button, Card, Pill } from "@/components/ui";
import { PLANS } from "@/lib/content";
import { signupUrl } from "@/lib/site";

export const metadata = { title: "Pricing" };

const FAQ: { q: string; a: string }[] = [
  {
    q: "What exactly is monitored?",
    a: "We track airplay of your songs across monitored radio and TV channels — every detection, with the channel, date and time. You see how often each track is played and how it trends over time.",
  },
  {
    q: "Can I change plans later?",
    a: "Yes. You can move between plans at any time as your catalogue and team grow. Changes take effect on your next billing cycle, and nothing you've tracked is lost.",
  },
  {
    q: "Do you offer invoice billing?",
    a: "Monthly and yearly plans are billed by card. On Enterprise we issue custom invoices with the terms your finance team needs — get in touch through a demo to set it up.",
  },
  {
    q: "Is there a trial?",
    a: "We set up a guided walkthrough with your own catalogue during a demo, so you can see real detections before committing. Reach out and we'll get you started.",
  },
];

export default function PricingPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Pill tone="gold">Pricing</Pill>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Plans that scale with your catalogue.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              Convert professionals into subscribers.
            </p>
          </div>
        </Container>
      </section>

      {/* Pricing grid */}
      <Section eyebrow="Plans" title="Pick the plan that fits your operation.">
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => {
            const isEnterprise = plan.name === "Enterprise";
            const ctaHref = isEnterprise ? "/pro/request-demo" : signupUrl;
            const ctaLabel = isEnterprise ? "Request a demo" : "Start monitoring";
            return (
              <Card
                key={plan.name}
                className={
                  plan.featured
                    ? "relative flex flex-col ring-1 ring-brand-500/40 border-brand-500/40"
                    : "relative flex flex-col"
                }
              >
                {plan.featured && (
                  <div className="absolute -top-3 left-6">
                    <Pill tone="gold">Most popular</Pill>
                  </div>
                )}
                <div className="font-display text-lg font-bold text-white">{plan.name}</div>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">{plan.audience}</p>
                <div className="mt-6 flex items-baseline gap-1">
                  <span className="font-mono text-4xl font-semibold text-goldlight sm:text-5xl">{plan.price}</span>
                  {plan.period && <span className="font-mono text-sm text-zinc-500">{plan.period}</span>}
                </div>
                <ul className="mt-6 space-y-3">
                  {plan.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-sm text-zinc-300">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-brand-400" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-8 pt-2">
                  <Button
                    href={ctaHref}
                    variant={plan.featured ? "primary" : "outline"}
                    external={!isEnterprise}
                    className="w-full"
                  >
                    {ctaLabel} {isEnterprise && <ArrowRight className="h-4 w-4" />}
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
        <p className="mt-8 text-center font-mono text-[11px] uppercase tracking-[0.16em] text-zinc-500">
          Payment options: monthly · yearly · custom invoice.
        </p>
      </Section>

      {/* FAQ */}
      <Section eyebrow="FAQ" title="Questions before you subscribe.">
        <div className="grid gap-6 md:grid-cols-2">
          {FAQ.map((item) => (
            <Card key={item.q}>
              <div className="font-display text-base font-bold text-white">{item.q}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{item.a}</p>
            </Card>
          ))}
        </div>
      </Section>
    </>
  );
}
