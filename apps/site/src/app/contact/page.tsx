import { Mail, Music4, BarChart3, Handshake, ArrowUpRight } from "lucide-react";
import { Container, Section, Card, Button, Pill } from "@/components/ui";
import { ContactForm } from "@/components/forms";
import { SOCIAL } from "@/lib/site";

export const metadata = { title: "Contact" };

const QUICK_LINKS: { title: string; description: string; href: string; icon: React.ReactNode }[] = [
  {
    title: "Submit Music",
    description: "Send a track for playlist and Playlist Battle consideration.",
    href: "/submit",
    icon: <Music4 className="h-5 w-5" />,
  },
  {
    title: "Hitlist Pro",
    description: "Radio & TV airplay monitoring for artists, labels and pros.",
    href: "/pro",
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    title: "Partners",
    description: "Sponsorships, editions and integrations with Hitlist.",
    href: "/partners",
    icon: <Handshake className="h-5 w-5" />,
  },
];

export default function ContactPage() {
  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 hero-glow" />
        <Container className="relative py-20 sm:py-28">
          <div className="max-w-3xl">
            <Pill tone="gold">Contact</Pill>
            <h1 className="mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-white sm:text-6xl">
              Get in touch.
            </h1>
            <p className="mt-5 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:text-base">
              Questions, partnerships, press or support — we&apos;d love to hear from you.
            </p>
          </div>
        </Container>
      </section>

      {/* Form + details */}
      <Section>
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-14">
          {/* Left: form */}
          <div>
            <ContactForm />
          </div>

          {/* Right: contact details */}
          <div className="flex flex-col gap-8">
            {/* Email */}
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                Email us
              </div>
              <a
                href="mailto:hello@hitlist.fm"
                className="group mt-3 inline-flex items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-surface px-4 py-3.5 text-white transition-colors hover:border-brand-500/30"
              >
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand-500/10 text-brand-400">
                  <Mail className="h-4 w-4" />
                </span>
                <span className="font-mono text-sm text-zinc-300 group-hover:text-white">
                  hello@hitlist.fm
                </span>
              </a>
            </div>

            {/* Quick links */}
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                Looking for something specific?
              </div>
              <div className="mt-3 flex flex-col gap-3">
                {QUICK_LINKS.map((link) => (
                  <Button
                    key={link.href}
                    href={link.href}
                    variant="outline"
                    className="justify-start"
                  >
                    <span className="text-brand-400">{link.icon}</span>
                    <span className="flex flex-col items-start text-left">
                      <span className="text-sm font-semibold text-white">{link.title}</span>
                      <span className="text-[12px] font-normal leading-snug text-zinc-500">
                        {link.description}
                      </span>
                    </span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Social */}
            <div>
              <div className="text-[13px] font-medium uppercase tracking-[0.14em] text-zinc-500">
                Follow Hitlist
              </div>
              <div className="mt-3 flex flex-wrap gap-2.5">
                {SOCIAL.map((s) => (
                  <a
                    key={s.label}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="group inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-ink-surface px-3.5 py-1.5 text-[13px] text-zinc-400 transition-colors hover:border-brand-500/30 hover:text-white"
                  >
                    {s.label}
                    <ArrowUpRight className="h-3.5 w-3.5 text-zinc-600 transition-colors group-hover:text-brand-400" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Section>
    </>
  );
}
