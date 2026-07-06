/* Editable content for the marketing site. Placeholder/curated data — swap the
 * Spotify/YouTube ids and copy for real content when available. Structured so a
 * CMS or the team can edit these without touching page code. */

export type Playlist = {
  slug: string;
  name: string;
  short: string;
  description: string;
  spotifyUrl: string; // playlist URL or spotify:playlist:ID
  gradient: [string, string];
  updated: string;
  relatedEpisodeId?: string;
  seasonal?: boolean;
};

export const PLAYLISTS: Playlist[] = [
  {
    slug: "romania-top-30",
    name: "Hitlist Romania Top 30",
    short: "The 30 that matter in Romania right now.",
    description:
      "A curated Top 30 focused on Romanian music — new entries, premieres and already-established tracks, updated every week from Playlist Battle results and real performance.",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZEVXbNBz9cRCSFkY",
    gradient: ["#F5B13D", "#FF5A34"],
    updated: "Updated weekly",
    relatedEpisodeId: "ep-12",
  },
  {
    slug: "balkan",
    name: "Hitlist Balkan",
    short: "Cross-border hits from across the region.",
    description:
      "A regional playlist focused on Balkan music, cross-border hits and emerging regional artists — the sound of the neighbourhood, one list.",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX0XUsuxWHRQd",
    gradient: ["#FF5A34", "#D68C24"],
    updated: "Updated weekly",
    relatedEpisodeId: "ep-11",
  },
  {
    slug: "summer",
    name: "Hitlist Summer",
    short: "Party records, radio-friendly, festival-ready.",
    description:
      "A seasonal playlist focused on summer energy, party records, radio-friendly songs and festival potential.",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DWYBO1MoTDhZI",
    gradient: ["#FFD588", "#FF5A34"],
    updated: "Seasonal",
    seasonal: true,
    relatedEpisodeId: "ep-10",
  },
  {
    slug: "first-listen",
    name: "Hitlist First Listen",
    short: "Premieres and unreleased, heard here first.",
    description:
      "A playlist for premieres, unreleased music and songs heard first through the Hitlist ecosystem.",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4JAvHpjipBk",
    gradient: ["#D68C24", "#FFD588"],
    updated: "Updated weekly",
    relatedEpisodeId: "ep-12",
  },
  {
    slug: "club-rotation",
    name: "Hitlist Club Rotation",
    short: "What the floor is actually playing.",
    description:
      "Dance and club-leaning records in heavy rotation — the tracks moving from the booth to the airwaves.",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DX4dyzvuaRJ0n",
    gradient: ["#FF8A5C", "#D68C24"],
    updated: "Updated weekly",
  },
  {
    slug: "fresh-artists",
    name: "Hitlist Fresh Artists",
    short: "New names worth your ears.",
    description:
      "Emerging and breaking artists surfaced through submissions, Playlist Battle and early airplay signals.",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZF1DXcBWIGoYBM5M",
    gradient: ["#F5B13D", "#FF8A5C"],
    updated: "Updated weekly",
  },
  {
    slug: "bulgaria-top-30",
    name: "Hitlist Bulgaria Top 30",
    short: "The 30 that matter in Bulgaria right now.",
    description:
      "A curated Top 30 focused on Bulgarian music — new entries, premieres and established tracks, updated weekly.",
    spotifyUrl: "https://open.spotify.com/playlist/37i9dQZEVXbNZbJ6TZelCq",
    gradient: ["#FF5A34", "#F5B13D"],
    updated: "Updated weekly",
  },
];

export type Episode = {
  id: string;
  title: string;
  edition: string;
  guests: string[];
  date: string;
  youtubeId: string;
  playlistSlug: string;
};

export const EPISODES: Episode[] = [
  {
    id: "ep-12",
    title: "Playlist Battle #12 — New Year, New Entries",
    edition: "Romania Top 30",
    guests: ["Andra", "Smiley", "DJ Andrei"],
    date: "2026-06-28",
    youtubeId: "dQw4w9WgXcQ",
    playlistSlug: "romania-top-30",
  },
  {
    id: "ep-11",
    title: "Playlist Battle #11 — Balkan Special",
    edition: "Balkan",
    guests: ["Inna", "Vescan"],
    date: "2026-06-14",
    youtubeId: "dQw4w9WgXcQ",
    playlistSlug: "balkan",
  },
  {
    id: "ep-10",
    title: "Playlist Battle #10 — Summer Kickoff",
    edition: "Summer",
    guests: ["Delia", "Carla's Dreams"],
    date: "2026-05-31",
    youtubeId: "dQw4w9WgXcQ",
    playlistSlug: "summer",
  },
  {
    id: "ep-09",
    title: "Playlist Battle #9 — First Listen",
    edition: "First Listen",
    guests: ["EMAA", "The Motans"],
    date: "2026-05-17",
    youtubeId: "dQw4w9WgXcQ",
    playlistSlug: "first-listen",
  },
];

export const BATTLE_STEPS: string[] = [
  "Artists submit music.",
  "Hitlist creates a shortlist.",
  "Guests listen and debate.",
  "Songs are scored.",
  "The public votes.",
  "Hitlist updates the playlist.",
];

export type ProFeature = { title: string; description: string; icon: string };

export const PRO_FEATURES: ProFeature[] = [
  { title: "Radio Monitoring", description: "Track song plays across monitored radio stations.", icon: "radio" },
  { title: "TV Monitoring", description: "Track music-video and song exposure across monitored TV channels.", icon: "tv" },
  { title: "Artist & Song Dashboards", description: "See performance by artist, track, channel and time period.", icon: "layout-dashboard" },
  { title: "Charts", description: "View rankings by song, artist, channel, period and category.", icon: "bar-chart-3" },
  { title: "Alerts", description: "Get notified the moment a song is detected.", icon: "bell" },
  { title: "Campaign Reports", description: "Generate reports for releases, promo campaigns and label meetings.", icon: "file-text" },
  { title: "Exports", description: "Download reports as PDF or CSV.", icon: "download" },
  { title: "Team Access", description: "Let multiple team members work from the same account.", icon: "users" },
];

export const PRO_AUDIENCE: string[] = [
  "Artists",
  "Labels",
  "Managers",
  "Distributors",
  "Publishers",
  "Radio stations",
  "TV stations",
  "Promoters",
  "Booking agencies",
  "Music marketers",
];

export type Plan = {
  name: string;
  audience: string;
  price: string;
  period: string;
  features: string[];
  cta: string;
  featured?: boolean;
};

export const PLANS: Plan[] = [
  {
    name: "Artist",
    audience: "For independent artists tracking their own songs.",
    price: "€19",
    period: "/mo",
    features: ["Track selected songs", "Limited dashboard", "Basic charts", "Email alerts", "Monthly reports"],
    cta: "Start monitoring",
  },
  {
    name: "Label",
    audience: "For labels and managers tracking multiple artists.",
    price: "€79",
    period: "/mo",
    features: ["Multiple artists", "Multiple songs", "Advanced reports", "Exports", "Team seats", "Campaign tracking"],
    cta: "Start monitoring",
    featured: true,
  },
  {
    name: "Enterprise",
    audience: "For distributors, radio groups, TV networks and larger teams.",
    price: "Custom",
    period: "",
    features: ["Custom access", "Large catalogue tracking", "API access", "Custom reporting", "Dedicated support", "Invoice billing"],
    cta: "Request demo",
  },
];

export const SPONSORSHIP: string[] = [
  "Playlist Battle main sponsor",
  "Sponsor of a Hitlist playlist",
  "Sponsor of public voting",
  "Sponsor of First Listen",
  "Branded content",
  "Product placement",
  "Artist discovery campaigns",
  "Data-led music reports",
  "Industry reports powered by Hitlist Pro",
];

/** Sample list of monitored channels — surfaced as a trust signal on /pro. */
export const MONITORED_RADIO: string[] = [
  "Kiss FM",
  "Virgin Radio",
  "Radio ZU",
  "Pro FM",
  "Digi FM",
  "Europa FM",
  "Magic FM",
  "Rock FM",
  "Radio România Actualități",
  "Național FM",
];

export const MONITORED_TV: string[] = ["Music Channel", "Kiss TV", "1 Music Channel", "UTV"];

export const SUBMISSION_TYPES: { title: string; description: string }[] = [
  { title: "Playlist Consideration", description: "The song can be reviewed for inclusion in Hitlist playlists." },
  { title: "Playlist Battle Consideration", description: "The song can be considered for the show." },
  {
    title: "Cleared for Show & Socials",
    description: "The rights holder confirms Hitlist can use parts of the song in videos, social clips, teasers and promotional content.",
  },
];
