/**
 * Seed script for plans and features.
 * Run: npx tsx prisma/seed-plans.ts
 *
 * Capped-tier pricing (EUR, monthly cents; annual = 10x monthly). There is NO
 * unlimited tier and no perpetual free plan: each role has a set of capped paid
 * tiers (14-day trial) plus a single locked *free* plan used only as the
 * post-trial / cancel fallback (all quotas 0, read-only).
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const FEATURES = [
  // Analytics
  { key: "analytics.basic_stats", name: "Basic Play Stats", description: "View total play counts and basic charts", category: "analytics", roles: ["ARTIST", "LABEL", "STATION"] },
  { key: "analytics.detailed_breakdown", name: "Detailed Station Breakdown", description: "See play-by-play breakdown per station with peak hours", category: "analytics", roles: ["ARTIST", "LABEL"] },
  { key: "analytics.hourly_heatmap", name: "Hourly Heatmap", description: "7x24 hour heatmap showing when your songs play most", category: "analytics", roles: ["ARTIST", "LABEL"] },
  { key: "analytics.trend_comparison", name: "Trend Comparison", description: "This week vs last week performance comparison", category: "analytics", roles: ["ARTIST", "LABEL"] },
  { key: "analytics.peak_hours", name: "Peak Hours Analysis", description: "Top 5 busiest hours for your songs", category: "analytics", roles: ["ARTIST", "LABEL"] },
  { key: "analytics.competitor_intel", name: "Competitor Intelligence", description: "Detailed competitor analysis with overlap and exclusive songs", category: "analytics", roles: ["STATION"] },
  { key: "analytics.share_of_airplay", name: "Share of Airplay", description: "Your share of total market airplay with artist ranking", category: "analytics", roles: ["ARTIST", "LABEL"] },
  { key: "analytics.rotation_analysis", name: "Rotation Analysis", description: "Over-rotation detection and rotation health", category: "analytics", roles: ["STATION"] },
  { key: "analytics.discovery_score", name: "Discovery Score", description: "New song discovery percentage and metrics", category: "analytics", roles: ["STATION"] },
  { key: "analytics.genre_distribution", name: "Genre Distribution", description: "Label and genre breakdown of your playlist", category: "analytics", roles: ["STATION"] },

  // Label-specific
  { key: "label.artist_comparison", name: "Artist Comparison", description: "Compare performance across your roster", category: "label", roles: ["LABEL"] },
  { key: "label.station_affinity", name: "Station Affinity Report", description: "See which stations play your artists most", category: "label", roles: ["LABEL"] },
  { key: "label.release_tracker", name: "Release Tracker", description: "Track new release performance over time", category: "label", roles: ["LABEL"] },

  // Exports
  { key: "exports.csv", name: "CSV Export", description: "Export airplay data as CSV", category: "exports", roles: ["ARTIST", "LABEL", "STATION"] },
  { key: "exports.pdf", name: "PDF Reports", description: "Generate branded PDF reports", category: "exports", roles: ["ARTIST", "LABEL", "STATION"] },

  // Reports & Engagement
  { key: "reports.daily_basic", name: "Daily Report (Basic)", description: "Daily summary with generic tips", category: "reports", roles: ["ARTIST", "LABEL", "STATION"] },
  { key: "reports.daily_premium", name: "Daily Report (Premium)", description: "Detailed daily report with actionable, tailored insights", category: "reports", roles: ["ARTIST", "LABEL", "STATION"] },
  { key: "reports.weekly_digest", name: "Weekly Digest", description: "Weekly performance summary", category: "reports", roles: ["ARTIST", "LABEL", "STATION"] },

  // Alerts
  { key: "alerts.chart_monitoring", name: "Chart Monitoring", description: "Get alerts when your songs enter Shazam/Spotify/Apple Music charts", category: "alerts", roles: ["ARTIST", "LABEL"] },
  { key: "alerts.push_notifications", name: "Push Notifications", description: "Real-time push notifications for important events", category: "alerts", roles: ["ARTIST", "LABEL", "STATION"] },

  // Live Feed
  { key: "live.feed", name: "Live Detection Feed", description: "Real-time SSE feed of song detections", category: "live", roles: ["ARTIST", "LABEL", "STATION"] },
  { key: "live.audio_snippets", name: "Audio Snippets", description: "Listen to 5-second audio snippets of detections", category: "live", roles: ["ARTIST", "LABEL", "STATION"] },

  // API access — top tier of each role only.
  { key: "api.access", name: "API Access", description: "Programmatic access to your airplay data via the public API", category: "api", roles: ["ARTIST", "LABEL", "STATION"] },
];

// Removed feature keys (capped tiers make these obsolete): monitoring limits are
// now plan columns, not features. Deleted so a re-run heals an existing DB.
const REMOVED_FEATURE_KEYS = [
  "songs.monitor_unlimited",
  "songs.monitor_basic",
  "label.unlimited_artists",
];

// ─── Plans ─────────────────────────────────────────────────────────
// tier FREE    = locked fallback (all quotas 0, not purchasable).
// tier PREMIUM = a capped, purchasable tier (14-day trial); isPremium keys off this.
// annual = 10x monthly. maxHistoryDays scales with tier.
type SeedPlan = {
  name: string;
  slug: string;
  role: string;
  tier: string;
  monthlyPriceCents: number;
  annualPriceCents: number;
  trialDays: number;
  maxMonitoredSongs?: number;
  maxRosterArtists?: number;
  maxCompetitorStations?: number;
  maxHistoryDays: number;
  perSeatPriceCents?: number;
  perSeatLabel?: string;
};

const TRIAL_DAYS = 14;

const PLANS: SeedPlan[] = [
  // ARTIST — capped by monitored songs.
  { name: "Artist Free", slug: "artist-free", role: "ARTIST", tier: "FREE", monthlyPriceCents: 0, annualPriceCents: 0, trialDays: 0, maxMonitoredSongs: 0, maxHistoryDays: 7 },
  { name: "Artist 1", slug: "artist-1", role: "ARTIST", tier: "PREMIUM", monthlyPriceCents: 590, annualPriceCents: 5900, trialDays: TRIAL_DAYS, maxMonitoredSongs: 1, maxHistoryDays: 30 },
  { name: "Artist 3", slug: "artist-3", role: "ARTIST", tier: "PREMIUM", monthlyPriceCents: 1490, annualPriceCents: 14900, trialDays: TRIAL_DAYS, maxMonitoredSongs: 3, maxHistoryDays: 30 },
  { name: "Artist 5", slug: "artist-5", role: "ARTIST", tier: "PREMIUM", monthlyPriceCents: 2190, annualPriceCents: 21900, trialDays: TRIAL_DAYS, maxMonitoredSongs: 5, maxHistoryDays: 90 },
  { name: "Artist 10", slug: "artist-10", role: "ARTIST", tier: "PREMIUM", monthlyPriceCents: 3690, annualPriceCents: 36900, trialDays: TRIAL_DAYS, maxMonitoredSongs: 10, maxHistoryDays: 90 },
  { name: "Artist 25", slug: "artist-25", role: "ARTIST", tier: "PREMIUM", monthlyPriceCents: 7490, annualPriceCents: 74900, trialDays: TRIAL_DAYS, maxMonitoredSongs: 25, maxHistoryDays: 180 },
  { name: "Artist 50", slug: "artist-50", role: "ARTIST", tier: "PREMIUM", monthlyPriceCents: 13400, annualPriceCents: 134000, trialDays: TRIAL_DAYS, maxMonitoredSongs: 50, maxHistoryDays: 365 },
  { name: "Artist 100", slug: "artist-100", role: "ARTIST", tier: "PREMIUM", monthlyPriceCents: 22400, annualPriceCents: 224000, trialDays: TRIAL_DAYS, maxMonitoredSongs: 100, maxHistoryDays: 365 },

  // LABEL — capped by roster artists; per-seat billing of each roster artist.
  { name: "Label Free", slug: "label-free", role: "LABEL", tier: "FREE", monthlyPriceCents: 0, annualPriceCents: 0, trialDays: 0, maxRosterArtists: 0, maxHistoryDays: 7 },
  { name: "Label Indie", slug: "label-indie", role: "LABEL", tier: "PREMIUM", monthlyPriceCents: 8900, annualPriceCents: 89000, trialDays: TRIAL_DAYS, maxRosterArtists: 3, maxHistoryDays: 90 },
  { name: "Label", slug: "label", role: "LABEL", tier: "PREMIUM", monthlyPriceCents: 24900, annualPriceCents: 249000, trialDays: TRIAL_DAYS, maxRosterArtists: 10, maxHistoryDays: 180, perSeatPriceCents: 1800, perSeatLabel: "per artist" },
  { name: "Label Group", slug: "label-group", role: "LABEL", tier: "PREMIUM", monthlyPriceCents: 54900, annualPriceCents: 549000, trialDays: TRIAL_DAYS, maxRosterArtists: 25, maxHistoryDays: 365, perSeatPriceCents: 1500, perSeatLabel: "per artist" },

  // STATION — capped by competitor stations; network tier bills per-competitor overage.
  { name: "Station Free", slug: "station-free", role: "STATION", tier: "FREE", monthlyPriceCents: 0, annualPriceCents: 0, trialDays: 0, maxCompetitorStations: 0, maxHistoryDays: 7 },
  { name: "Station Pro", slug: "station-pro", role: "STATION", tier: "PREMIUM", monthlyPriceCents: 14900, annualPriceCents: 149000, trialDays: TRIAL_DAYS, maxCompetitorStations: 5, maxHistoryDays: 180 },
  { name: "Station Network", slug: "station-network", role: "STATION", tier: "PREMIUM", monthlyPriceCents: 34900, annualPriceCents: 349000, trialDays: TRIAL_DAYS, maxCompetitorStations: 20, maxHistoryDays: 365, perSeatPriceCents: 1500, perSeatLabel: "per competitor" },
];

// ─── Feature assignment ────────────────────────────────────────────
// Explicit per-slug map (no "tier == PREMIUM => everything" shortcut). Locked
// free plans expose a read-only sliver; paid tiers get their full role feature
// set; only the top tier of each role additionally gets api.access.
const TOP_TIER_SLUGS = new Set(["artist-100", "label-group", "station-network"]);

const FREE_FEATURES: Record<string, string[]> = {
  ARTIST: ["analytics.basic_stats"],
  LABEL: ["analytics.basic_stats"],
  STATION: ["analytics.basic_stats"],
};

function paidFeaturesForRole(role: string): string[] {
  return FEATURES.filter((f) => f.roles.includes(role) && f.key !== "api.access").map(
    (f) => f.key,
  );
}

const PLAN_FEATURES: Record<string, string[]> = Object.fromEntries(
  PLANS.map((p) => {
    if (p.tier === "FREE") return [p.slug, FREE_FEATURES[p.role] ?? []];
    const keys = paidFeaturesForRole(p.role);
    return [p.slug, TOP_TIER_SLUGS.has(p.slug) ? [...keys, "api.access"] : keys];
  }),
);

async function main() {
  console.log("Seeding features...");

  for (const f of FEATURES) {
    await prisma.feature.upsert({
      where: { key: f.key },
      update: { name: f.name, description: f.description, category: f.category, roles: f.roles },
      create: f,
    });
  }
  console.log(`  ${FEATURES.length} features upserted`);

  // Drop obsolete features (cascades to plan_features) so a re-run heals old DBs.
  const removed = await prisma.feature.deleteMany({ where: { key: { in: REMOVED_FEATURE_KEYS } } });
  if (removed.count > 0) console.log(`  ${removed.count} obsolete features removed`);

  console.log("Seeding plans...");
  for (const p of PLANS) {
    const data = {
      name: p.name,
      role: p.role,
      tier: p.tier,
      monthlyPriceCents: p.monthlyPriceCents,
      annualPriceCents: p.annualPriceCents,
      trialDays: p.trialDays,
      perSeatPriceCents: p.perSeatPriceCents ?? 0,
      perSeatLabel: p.perSeatLabel ?? null,
      maxMonitoredSongs: p.maxMonitoredSongs ?? 0,
      maxRosterArtists: p.maxRosterArtists ?? 0,
      maxCompetitorStations: p.maxCompetitorStations ?? 0,
      maxHistoryDays: p.maxHistoryDays,
    };
    await prisma.plan.upsert({
      where: { slug: p.slug },
      update: data,
      create: { slug: p.slug, ...data },
    });
  }
  console.log(`  ${PLANS.length} plans upserted`);

  console.log("Assigning features to plans...");
  const allFeatures = await prisma.feature.findMany();
  const featureByKey = new Map(allFeatures.map((f) => [f.key, f]));
  const allPlans = await prisma.plan.findMany();

  for (const plan of allPlans) {
    const keys = PLAN_FEATURES[plan.slug] ?? [];
    const wantIds = new Set(
      keys.map((k) => featureByKey.get(k)?.id).filter((id): id is number => id != null),
    );

    // Prune any feature no longer in this plan's set (keeps re-runs idempotent
    // when a plan's feature list shrinks).
    await prisma.planFeature.deleteMany({
      where: { planId: plan.id, featureId: { notIn: [...wantIds] } },
    });

    for (const featureId of wantIds) {
      await prisma.planFeature.upsert({
        where: { planId_featureId: { planId: plan.id, featureId } },
        update: {},
        create: { planId: plan.id, featureId },
      });
    }
    console.log(`  ${plan.name}: ${wantIds.size} features`);
  }

  console.log("Done!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
