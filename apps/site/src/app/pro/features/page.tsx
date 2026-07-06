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
import { Container, Section, Button, Card, Pill } from "@/components/ui";
import { PRO_FEATURES } from "@/lib/content";

export const metadata = { title: "Features" };

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

/** One extra line of context per feature, keyed by icon. */
const FEATURE_EXTRA: Record<string, string> = {
  radio:
    "Every spin is timestamped and tied to a station, so you can see exactly when and where a song entered rotation.",
  tv: "Music-video plays are matched the same way, giving you a single view across both radio and television exposure.",
  "layout-dashboard":
    "Filter by artist, track, channel or date range to move from the big picture down to a single play in seconds.",
  "bar-chart-3":
    "Rankings update as new detections land, so you always know where a release sits against the rest of the field.",
  bell: "Set alerts per song and get an email the moment a new play is picked up — no need to keep checking the dashboard.",
  "file-text":
    "Turn raw detections into clean, shareable summaries built for release recaps, promo reviews and label meetings.",
  download:
    "Export any view as PDF or CSV to drop straight into a deck, a spreadsheet or a client-facing report.",
  users:
    "Invite your team so managers, promo and label staff all work from the same numbers, on the same account.",
};

export default function ProFeaturesPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Pill tone="gold">Hitlist Pro</Pill>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Everything you need to track performance.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              From radio and TV detection to dashboards, charts, alerts and exportable reports — a closer look at the
              tools inside Hitlist Pro and how each one helps you read the airwaves.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button href="/pro/pricing" size="lg">
                View Plans
              </Button>
              <Button href="/pro/request-demo" variant="outline" size="lg">
                Request a Demo
              </Button>
            </div>
          </div>
        </Container>
      </section>

      {/* Feature detail */}
      <Section
        eyebrow="Core features"
        title="A closer look at the platform."
        sub="Eight capabilities that turn raw radio and TV airplay into performance data you can act on."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          {PRO_FEATURES.map((f) => (
            <Card key={f.title} className="flex flex-col">
              <span className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl bg-brand-500/10 text-brand-400">
                {FEATURE_ICONS[f.icon]}
              </span>
              <div className="font-display text-lg font-bold text-white">{f.title}</div>
              <p className="mt-2 text-sm leading-relaxed text-zinc-400">{f.description}</p>
              <p className="mt-3 text-[13px] leading-relaxed text-zinc-500">{FEATURE_EXTRA[f.icon]}</p>
            </Card>
          ))}
        </div>
      </Section>

      {/* Closing CTA */}
      <Section>
        <div className="rounded-2xl border border-white/[0.08] bg-ink-surface p-8 sm:p-12">
          <h2 className="max-w-2xl font-display text-2xl font-bold tracking-tight text-white sm:text-3xl">
            See it working on your own catalogue.
          </h2>
          <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            Compare the plans or book a walkthrough with the Hitlist Pro team.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Button href="/pro/pricing" size="lg">
              View Plans <ArrowRight className="h-4 w-4" />
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
