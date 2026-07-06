import Link from "next/link";
import { BrandLockup } from "@/components/brand";
import { Container } from "@/components/ui";
import { FOOTER_LEGAL, SOCIAL, loginUrl } from "@/lib/site";

const COLS: { title: string; links: { label: string; href: string; external?: boolean }[] }[] = [
  {
    title: "Discover",
    links: [
      { label: "Playlist Battle", href: "/playlist-battle" },
      { label: "Playlists", href: "/playlists" },
      { label: "Submit Music", href: "/submit" },
    ],
  },
  {
    title: "Hitlist Pro",
    links: [
      { label: "Overview", href: "/pro" },
      { label: "Pricing", href: "/pro/pricing" },
      { label: "Request a demo", href: "/pro/request-demo" },
      { label: "Login", href: loginUrl, external: true },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "Partners", href: "/partners" },
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-white/[0.07] bg-ink">
      <Container className="py-16">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(3,1fr)]">
          <div>
            <BrandLockup markSize={28} wordmarkClassName="text-xl" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-zinc-500">
              Music discovery meets music data. Curated playlists, Playlist Battle and professional radio &amp; TV
              monitoring for the modern music industry.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              {SOCIAL.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/10 px-3 py-1.5 font-mono text-[11px] text-zinc-400 transition-colors hover:border-white/25 hover:text-white"
                >
                  {s.label}
                </a>
              ))}
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <div className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-600">{col.title}</div>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    {l.external ? (
                      <a href={l.href} className="text-sm text-zinc-400 transition-colors hover:text-white">
                        {l.label}
                      </a>
                    ) : (
                      <Link href={l.href} className="text-sm text-zinc-400 transition-colors hover:text-white">
                        {l.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-start justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row sm:items-center">
          <div className="flex flex-wrap gap-x-4 gap-y-2">
            {FOOTER_LEGAL.map((l) => (
              <Link key={l.href} href={l.href} className="font-mono text-[11px] text-zinc-500 hover:text-zinc-300">
                {l.label}
              </Link>
            ))}
          </div>
          <p className="font-mono text-[11px] text-zinc-600">
            © {new Date().getFullYear()} Hitlist · MUZE Records
          </p>
        </div>
      </Container>
    </footer>
  );
}
