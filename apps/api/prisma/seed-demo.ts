/**
 * Demo accounts seed script — one demo user per role (ADMIN / ARTIST / LABEL /
 * STATION), each non-admin with an active PREMIUM subscription (no Stripe),
 * wired to REAL airplay data already present in the database.
 *
 * Run (from apps/api):
 *   DATABASE_URL=postgresql://... npx tsx prisma/seed-demo.ts
 *
 * IDEMPOTENT: safe to run any number of times — users are upserted by email,
 * every dependent row is upserted on its natural unique key or guarded by an
 * existence check. Re-running also resets the demo password.
 *
 * What it creates:
 *   1. demo-admin@hitlist.fm   — ADMIN "Demo Admin" (no org/subscription,
 *      mirroring the identity backfill which skips ADMIN users).
 *   2. demo-artist@hitlist.fm  — ARTIST named EXACTLY like the artist with
 *      the most airplay_events (partial_play=false) so the addArtistSong
 *      name check passes; monitors that artist's top 5 ISRCs.
 *   3. demo-label@hitlist.fm   — LABEL "Demo Records" with the top 3 artists
 *      by plays as roster (LabelArtist) and each artist's top 3 ISRCs as
 *      label-owned MonitoredSongs linked through LabelMonitoredSong
 *      (same row structure the label handlers create).
 *   4. demo-station@hitlist.fm — STATION named after the first active
 *      station, UserScope on it, WatchedStation on the other station.
 *   5. Per non-admin user: Organization + OWNER Membership +
 *      Subscription.organizationId + canonical Artist / OrgEntity rows,
 *      reproducing the 20260702200000_identity_foundation backfill shape.
 *   6. UserSettings defaults + emailVerified=true for every demo user.
 *
 * activatedAt note: aggregations filter airplay_events on
 * started_at >= activatedAt, so each MonitoredSong is activated at the
 * EARLIER of (first airplay event of that ISRC, now - 30 days) — dashboards
 * get full history either way.
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
// Same hashing function the product uses for signup/login (argon2id).
import { hashPassword } from "../src/lib/auth.js";
// Same normalization the identity backfill / claim flow uses.
import { normalizeArtistName } from "../src/lib/artist-name.js";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DEMO_PASSWORD = "Hitlist!Demo2026";

const EMAILS = {
  admin: "demo-admin@hitlist.fm",
  artist: "demo-artist@hitlist.fm",
  label: "demo-label@hitlist.fm",
  station: "demo-station@hitlist.fm",
} as const;

const TEN_YEARS_MS = 10 * 365 * 24 * 60 * 60 * 1000;
const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

// ─── Airplay data queries ────────────────────────────────────────────

interface TopArtistRow {
  artist_name: string;
  plays: number;
}

interface TopSongRow {
  isrc: string;
  song_title: string;
  plays: number;
  first_played_at: Date;
}

/**
 * Artists ranked by non-partial airplay events. Only artists that have at
 * least one event with a usable ISRC qualify (monitoring is ISRC-based).
 * Deterministic tie-break on name.
 */
async function getTopArtists(limit: number): Promise<TopArtistRow[]> {
  return prisma.$queryRaw<TopArtistRow[]>`
    SELECT artist_name, COUNT(*)::int AS plays
    FROM airplay_events
    WHERE partial_play = false
    GROUP BY artist_name
    HAVING COUNT(*) FILTER (WHERE isrc IS NOT NULL AND isrc <> '') > 0
    ORDER BY plays DESC, artist_name ASC
    LIMIT ${limit}
  `;
}

/**
 * An artist's ISRCs ranked by non-partial plays, with the most frequent
 * song title and the first time the ISRC was ever played.
 *
 * first_played_at is deliberately computed over ALL events of the ISRC
 * (not just the ones matching this exact artist_name): the same ISRC can
 * appear under artist-name variants ("EMAA" vs "Carla's Dreams & EMAA"),
 * and every dashboard aggregation filters by isrc + started_at >=
 * activatedAt only — so activatedAt must predate the ISRC's earliest
 * event or history would be silently truncated.
 */
async function getTopSongs(
  artistName: string,
  limit: number,
): Promise<TopSongRow[]> {
  return prisma.$queryRaw<TopSongRow[]>`
    SELECT
      ae.isrc,
      mode() WITHIN GROUP (ORDER BY ae.song_title) AS song_title,
      COUNT(*)::int AS plays,
      (
        SELECT MIN(ae2.started_at)
        FROM airplay_events ae2
        WHERE ae2.isrc = ae.isrc AND ae2.partial_play = false
      ) AS first_played_at
    FROM airplay_events ae
    WHERE ae.artist_name = ${artistName}
      AND ae.partial_play = false
      AND ae.isrc IS NOT NULL AND ae.isrc <> ''
    GROUP BY ae.isrc
    ORDER BY plays DESC, ae.isrc ASC
    LIMIT ${limit}
  `;
}

/** Earlier of (first event of the ISRC, now - 30 days). */
function activationDate(firstPlayedAt: Date): Date {
  const thirtyDaysAgo = new Date(Date.now() - THIRTY_DAYS_MS);
  return firstPlayedAt < thirtyDaysAgo ? firstPlayedAt : thirtyDaysAgo;
}

// ─── Idempotent building blocks ──────────────────────────────────────

async function upsertDemoUser(
  email: string,
  name: string,
  role: string,
  passwordHash: string,
) {
  const user = await prisma.user.upsert({
    where: { email },
    update: { name, role, passwordHash, isActive: true, emailVerified: true },
    create: { email, name, role, passwordHash, isActive: true, emailVerified: true },
  });

  // UserSettings row with schema defaults (unique on userId).
  await prisma.userSettings.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return user;
}

/**
 * Organization + OWNER Membership, mirroring the identity_foundation
 * backfill (one org per non-ADMIN user, org name = user name, type by role).
 */
async function ensureOrganization(
  userId: number,
  orgName: string,
  orgType: "ARTIST_TEAM" | "LABEL" | "STATION_GROUP",
) {
  const existing = await prisma.membership.findFirst({
    where: { userId, role: "OWNER", organization: { type: orgType } },
    include: { organization: true },
  });

  if (existing) {
    if (existing.organization.name !== orgName) {
      await prisma.organization.update({
        where: { id: existing.organizationId },
        data: { name: orgName },
      });
    }
    return existing.organization;
  }

  const org = await prisma.organization.create({
    data: { name: orgName, type: orgType },
  });
  await prisma.membership.create({
    data: { organizationId: org.id, userId, role: "OWNER" },
  });
  return org;
}

/**
 * Active PREMIUM subscription for 10 years, no Stripe fields, pointed at the
 * user's 1:1 organization (backfill step 4.2 shape).
 */
async function ensureSubscription(
  userId: number,
  planId: number,
  organizationId: number,
) {
  const now = new Date();
  const data = {
    planId,
    organizationId,
    status: "active",
    billingInterval: "monthly",
    currentPeriodStart: now,
    currentPeriodEnd: new Date(now.getTime() + TEN_YEARS_MS),
    cancelAtPeriodEnd: false,
    trialEndsAt: null,
    stripeCustomerId: null,
    stripeSubscriptionId: null,
  };

  const existing = await prisma.subscription.findFirst({ where: { userId } });
  if (existing) {
    return prisma.subscription.update({ where: { id: existing.id }, data });
  }
  return prisma.subscription.create({ data: { userId, ...data } });
}

/** Canonical Artist row (unique on name_normalized) — backfill step 4.3. */
async function ensureCanonicalArtist(name: string) {
  const nameNormalized = normalizeArtistName(name);
  return prisma.artist.upsert({
    where: { nameNormalized },
    update: {},
    create: { name, nameNormalized },
  });
}

/** OrgEntity ARTIST link — backfill steps 4.4 / 4.5. */
async function ensureOrgEntityArtist(organizationId: number, artistId: number) {
  const existing = await prisma.orgEntity.findFirst({
    where: { organizationId, entityType: "ARTIST", artistId },
  });
  if (!existing) {
    await prisma.orgEntity.create({
      data: { organizationId, entityType: "ARTIST", artistId },
    });
  }
}

/** OrgEntity STATION link — backfill step 4.6. */
async function ensureOrgEntityStation(
  organizationId: number,
  stationId: number,
) {
  const existing = await prisma.orgEntity.findFirst({
    where: { organizationId, entityType: "STATION", stationId },
  });
  if (!existing) {
    await prisma.orgEntity.create({
      data: { organizationId, entityType: "STATION", stationId },
    });
  }
}

/**
 * MonitoredSong upsert on its natural unique key (userId, isrc).
 * Keeps status active and refreshes metadata on re-run.
 */
async function ensureMonitoredSong(
  userId: number,
  song: TopSongRow,
  artistName: string,
) {
  const activatedAt = activationDate(song.first_played_at);
  return prisma.monitoredSong.upsert({
    where: { userId_isrc: { userId, isrc: song.isrc } },
    update: {
      songTitle: song.song_title,
      artistName,
      status: "active",
      activatedAt,
    },
    create: {
      userId,
      songTitle: song.song_title,
      artistName,
      isrc: song.isrc,
      status: "active",
      activatedAt,
    },
  });
}

// ─── Main ────────────────────────────────────────────────────────────

async function main() {
  console.log("Seeding demo accounts...\n");

  // Premium plans must exist (seed-plans.ts creates them).
  const planSlugs = ["artist-premium", "label-premium", "station-premium"];
  const plans = await prisma.plan.findMany({
    where: { slug: { in: planSlugs } },
  });
  const planBySlug = new Map<string, (typeof plans)[number]>(
    plans.map((p) => [p.slug, p]),
  );
  for (const slug of planSlugs) {
    if (!planBySlug.has(slug)) {
      throw new Error(
        `Plan "${slug}" not found — run "npx tsx prisma/seed-plans.ts" first.`,
      );
    }
  }

  // Real airplay data the demo accounts will be wired to.
  const topArtists = await getTopArtists(3);
  if (topArtists.length === 0) {
    throw new Error(
      "No airplay_events with partial_play=false and a usable ISRC — cannot build demo accounts.",
    );
  }

  let stations = await prisma.station.findMany({
    where: { status: "active" },
    orderBy: { id: "asc" },
  });
  if (stations.length === 0) {
    console.warn("No active stations found — falling back to all stations.");
    stations = await prisma.station.findMany({ orderBy: { id: "asc" } });
  }
  if (stations.length === 0) {
    throw new Error("No stations in the database — cannot build demo-station.");
  }
  const primaryStation = stations[0];
  const competitorStation = stations.length > 1 ? stations[1] : null;

  // One hash reused for all demo users (same password anyway).
  const passwordHash = await hashPassword(DEMO_PASSWORD);

  const summary: Array<{
    email: string;
    role: string;
    name: string;
    entities: string;
  }> = [];

  // ── 1. ADMIN ───────────────────────────────────────────────────────
  const admin = await upsertDemoUser(
    EMAILS.admin,
    "Demo Admin",
    "ADMIN",
    passwordHash,
  );
  summary.push({
    email: admin.email,
    role: "ADMIN",
    name: admin.name,
    entities: "admin console (no org/subscription, like the backfill)",
  });
  console.log(`ADMIN   ${admin.email} (id=${admin.id})`);

  // ── 2. ARTIST ──────────────────────────────────────────────────────
  // Name MUST equal a real artist with airplay: addArtistSong compares
  // request.currentUser.name with the song's artistName.
  const topArtist = topArtists[0];
  const artistUser = await upsertDemoUser(
    EMAILS.artist,
    topArtist.artist_name,
    "ARTIST",
    passwordHash,
  );

  const artistSongs = await getTopSongs(topArtist.artist_name, 5);
  for (const song of artistSongs) {
    await ensureMonitoredSong(artistUser.id, song, topArtist.artist_name);
  }

  const artistOrg = await ensureOrganization(
    artistUser.id,
    artistUser.name,
    "ARTIST_TEAM",
  );
  await ensureSubscription(
    artistUser.id,
    planBySlug.get("artist-premium")!.id,
    artistOrg.id,
  );
  const canonicalTopArtist = await ensureCanonicalArtist(topArtist.artist_name);
  await ensureOrgEntityArtist(artistOrg.id, canonicalTopArtist.id);

  summary.push({
    email: artistUser.email,
    role: "ARTIST",
    name: artistUser.name,
    entities: `${artistSongs.length} monitored songs (top ISRCs, ${topArtist.plays} plays total for artist)`,
  });
  console.log(
    `ARTIST  ${artistUser.email} (id=${artistUser.id}) name="${artistUser.name}" — ${artistSongs.length} monitored songs:`,
  );
  for (const s of artistSongs) {
    console.log(`          ${s.isrc}  "${s.song_title}" (${s.plays} plays)`);
  }

  // ── 3. LABEL ───────────────────────────────────────────────────────
  const labelUser = await upsertDemoUser(
    EMAILS.label,
    "Demo Records",
    "LABEL",
    passwordHash,
  );

  const labelOrg = await ensureOrganization(
    labelUser.id,
    labelUser.name,
    "LABEL",
  );
  await ensureSubscription(
    labelUser.id,
    planBySlug.get("label-premium")!.id,
    labelOrg.id,
  );

  let labelSongCount = 0;
  for (const rosterArtist of topArtists) {
    // Same lookup addLabelArtist does: link an ARTIST user with the exact
    // same name if one exists (the demo-artist matches roster artist #1).
    const matchingArtistUser = await prisma.user.findFirst({
      where: { role: "ARTIST", name: rosterArtist.artist_name },
    });

    const labelArtist = await prisma.labelArtist.upsert({
      where: {
        labelUserId_artistName: {
          labelUserId: labelUser.id,
          artistName: rosterArtist.artist_name,
        },
      },
      update: { artistUserId: matchingArtistUser?.id ?? null },
      create: {
        labelUserId: labelUser.id,
        artistName: rosterArtist.artist_name,
        artistUserId: matchingArtistUser?.id ?? null,
        pictureUrl: null,
      },
    });

    // Top 3 ISRCs per roster artist: label-owned MonitoredSong + link row
    // (same structure toggleLabelSongMonitoring creates).
    const rosterSongs = await getTopSongs(rosterArtist.artist_name, 3);
    for (const song of rosterSongs) {
      const monitoredSong = await ensureMonitoredSong(
        labelUser.id,
        song,
        rosterArtist.artist_name,
      );
      await prisma.labelMonitoredSong.upsert({
        where: {
          labelArtistId_monitoredSongId: {
            labelArtistId: labelArtist.id,
            monitoredSongId: monitoredSong.id,
          },
        },
        update: {},
        create: {
          labelArtistId: labelArtist.id,
          monitoredSongId: monitoredSong.id,
        },
      });
      labelSongCount++;
    }

    const canonical = await ensureCanonicalArtist(rosterArtist.artist_name);
    await ensureOrgEntityArtist(labelOrg.id, canonical.id);
  }

  summary.push({
    email: labelUser.email,
    role: "LABEL",
    name: labelUser.name,
    entities: `roster: ${topArtists.map((a) => a.artist_name).join(", ")} — ${labelSongCount} catalog songs`,
  });
  console.log(
    `LABEL   ${labelUser.email} (id=${labelUser.id}) roster=[${topArtists
      .map((a) => a.artist_name)
      .join(", ")}] songs=${labelSongCount}`,
  );

  // ── 4. STATION ─────────────────────────────────────────────────────
  const stationUser = await upsertDemoUser(
    EMAILS.station,
    primaryStation.name,
    "STATION",
    passwordHash,
  );

  // Exactly one STATION scope: drop stale scopes, upsert the current one.
  await prisma.userScope.deleteMany({
    where: {
      userId: stationUser.id,
      entityType: "STATION",
      NOT: { entityId: primaryStation.id },
    },
  });
  await prisma.userScope.upsert({
    where: {
      userId_entityType_entityId: {
        userId: stationUser.id,
        entityType: "STATION",
        entityId: primaryStation.id,
      },
    },
    update: {},
    create: {
      userId: stationUser.id,
      entityType: "STATION",
      entityId: primaryStation.id,
    },
  });

  if (competitorStation) {
    await prisma.watchedStation.deleteMany({
      where: {
        userId: stationUser.id,
        NOT: { stationId: competitorStation.id },
      },
    });
    await prisma.watchedStation.upsert({
      where: {
        userId_stationId: {
          userId: stationUser.id,
          stationId: competitorStation.id,
        },
      },
      update: {},
      create: { userId: stationUser.id, stationId: competitorStation.id },
    });
  } else {
    console.warn("Only one station in DB — no competitor WatchedStation created.");
  }

  const stationOrg = await ensureOrganization(
    stationUser.id,
    stationUser.name,
    "STATION_GROUP",
  );
  await ensureSubscription(
    stationUser.id,
    planBySlug.get("station-premium")!.id,
    stationOrg.id,
  );
  await ensureOrgEntityStation(stationOrg.id, primaryStation.id);

  summary.push({
    email: stationUser.email,
    role: "STATION",
    name: stationUser.name,
    entities: `scope: ${primaryStation.name} (id=${primaryStation.id})${
      competitorStation
        ? `, watches competitor: ${competitorStation.name} (id=${competitorStation.id})`
        : ""
    }`,
  });
  console.log(
    `STATION ${stationUser.email} (id=${stationUser.id}) scope="${primaryStation.name}"${
      competitorStation ? ` competitor="${competitorStation.name}"` : ""
    }`,
  );

  // ── Final output ───────────────────────────────────────────────────
  console.log("\n──────────────────────────────────────────────────────────");
  console.log("Demo accounts ready. Password for ALL accounts:");
  console.log(`\n    ${DEMO_PASSWORD}\n`);
  console.table(
    summary.map((s) => ({
      Email: s.email,
      Password: DEMO_PASSWORD,
      Role: s.role,
      Name: s.name,
      Entities: s.entities,
    })),
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
