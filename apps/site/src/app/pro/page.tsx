import {
  Radio,
  Tv,
  LayoutDashboard,
  BarChart3,
  Bell,
  FileText,
  Download,
  Users,
  ArrowRight,
} from "lucide-react";
import { Container, Section, Button, Card, Eyebrow, Pill } from "@/components/ui";
import { PRO_FEATURES, PRO_AUDIENCE, PLANS, MONITORED_RADIO, MONITORED_TV } from "@/lib/content";
import { loginUrl } from "@/lib/site";

export const metadata = { title: "Hitlist Pro" };

const FEATURE_ICONS: Record<string, React.ReactNode> = {
  radio: <Radio className="h-5 w-5" />,
  tv: <Tv className="h-5 w-5" />,
  "layout-dashboard": <LayoutDashboard className="h-5 w-5" />,
  "bar-chart-3": <BarChart3 className="h-5 w-5" />,
  bell: <Bell className="h-5 w-5" />,
  "file-text": <FileText className="h-5 w-5" />,
  download: <Download className="h-5 w-5" />,
  users: <Users className="h-5 w-5" />,
};

export default function ProPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Pill tone="gold">Hitlist Pro</Pill>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Radio &amp; TV music monitoring for artists, labels and music professionals.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              Track where your songs are played, how often, and how they perform across radio and TV in Romania.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/pro/pricing" size="lg">
                View Plans
              </Button>
              <Button href="/pro/request-demo" variant="outline" size="lg">
                Request a Demo
              </Button>
              <Button href={loginUrl} variant="ghost" size="lg" external>
                Login <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Who it's for */}
      <Section eyebrow="Who it's for" title="Built for everyone tracking music performance.">
        <div className="flex flex-wrap gap-2.5">
          {PRO_AUDIENCE.map((a) => (
            <Pill key={a} tone="neutral">
              {a}
            </Pill>
          ))}
        </div>
      </Section>

      {/* Core features */}
      <Section
        eyebrow="Core features"
        title="Everything you need to monitor your music."
        sub="From radio and TV detection to dashboards, charts, alerts and exportable reports — one platform for the full picture."
      >
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PRO_FEATURES.map((f) => (
            <Card key={f.title}>
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                {FEATURE_ICONS[f.icon]}
              </span>
              <div className="font-semibold text-white">{f.title}</div>
              <p className="mt-1.5 text-[13px] leading-relaxed text-zinc-500">{f.description}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Why it's better */}
      <Section eyebrow="Why it's better" title="A faster, cleaner way to read the airwaves.">
        <p className="max-w-2xl text-[15px] leading-relaxed text-zinc-400">
          Hitlist Pro is designed as a newer, faster and more intuitive monitoring platform for the Romanian music
          market. Built for modern music teams that need faster insights, cleaner dashboards and actionable performance
          data.
        </p>
      </Section>

      {/* Pricing preview */}
      <Section
        eyebrow="Pricing"
        title="Plans for every stage."
        sub="From independent artists to labels and enterprise teams — pick the plan that matches how you work."
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
              <div className="mt-6">
                <Button
                  href="/pro/pricing"
                  variant={plan.featured ? "primary" : "outline"}
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </div>
            </Card>
          ))}
        </div>
        <div className="mt-8">
          <Button href="/pro/pricing" variant="ghost">
            Compare all plans <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </Section>

      {/* What we monitor */}
      <Section
        eyebrow="What we monitor"
        title="Coverage across Romanian radio and TV."
        sub="A sample of the channels tracked by Hitlist Pro."
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Eyebrow className="mb-4">Radio</Eyebrow>
            <div className="flex flex-wrap gap-2.5">
              {MONITORED_RADIO.map((r) => (
                <Pill key={r} tone="neutral">
                  {r}
                </Pill>
              ))}
            </div>
          </div>
          <div>
            <Eyebrow className="mb-4">TV</Eyebrow>
            <div className="flex flex-wrap gap-2.5">
              {MONITORED_TV.map((t) => (
                <Pill key={t} tone="neutral">
                  {t}
                </Pill>
              ))}
            </div>
          </div>
        </div>
        <p className="mt-6 text-[13px] text-zinc-600">Coverage expands continuously.</p>
      </Section>

      {/* Closing CTA */}
      <Section>
        <div className="rounded-2xl border border-white/[0.08] bg-ink-surface p-8 sm:p-12">
          <h2 className="max-w-2xl font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Start tracking where your music plays.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            See the plans or book a walkthrough with the Hitlist Pro team.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/pro/pricing" size="lg">
              View Pricing
            </Button>
            <Button href="/pro/request-demo" variant="outline" size="lg">
              Request a Demo
            </Button>
          </div>
        </div>
      </Section>
    </>
  );
}
