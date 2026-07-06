/* Cross-cutting site constants: the marketing site lives on the root domain and
 * links out to the Hitlist Pro monitoring app on the app subdomain. */

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://app.hitlist.fm";
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://hitlist.fm";

export const loginUrl = `${APP_URL}/login`;
export const signupUrl = `${APP_URL}/login`;

/** Top navigation, per the Hitlist site architecture. "Login" belongs visually
 *  to Hitlist Pro (it opens the professional monitoring app). */
export const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Playlist Battle", href: "/playlist-battle" },
  { label: "Playlists", href: "/playlists" },
  { label: "Submit Music", href: "/submit" },
  { label: "Hitlist Pro", href: "/pro" },
  { label: "Partners", href: "/partners" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

export const FOOTER_LEGAL: { label: string; href: string }[] = [
  { label: "Terms", href: "/terms" },
  { label: "Privacy", href: "/privacy" },
  { label: "Cookie Policy", href: "/cookie-policy" },
  { label: "Submission Terms", href: "/submission-terms" },
  { label: "Copyright Policy", href: "/copyright-policy" },
  { label: "Subscription Terms", href: "/subscription-terms" },
  { label: "Data Policy", href: "/data-policy" },
];

export const SOCIAL: { label: string; href: string }[] = [
  { label: "YouTube", href: "https://youtube.com/@hitlist.fm" },
  { label: "Instagram", href: "https://instagram.com/hitlist.fm" },
  { label: "TikTok", href: "https://tiktok.com/@hitlist.fm" },
  { label: "Spotify", href: "https://open.spotify.com" },
];
