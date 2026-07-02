/**
 * Retroactive artwork backfill for airplay_events.
 *
 * Detection-time artwork resolution only covers NEW events; everything
 * detected before it shipped has artwork_url NULL. This script:
 *   1. Propagates artwork within an ISRC (some events have it, siblings don't)
 *   2. Resolves remaining distinct ISRCs via Deezer (ISRC exact, then
 *      title+artist search fallback), throttled to stay well under
 *      Deezer's rate limit
 *   3. Resolves ISRC-less events grouped by (title, artist) via search
 *
 * Idempotent: only touches rows with artwork_url IS NULL. Tracks not found
 * on Deezer stay NULL (clients show the accent placeholder).
 *
 * Run: DATABASE_URL=... npx tsx prisma/backfill-artwork.ts [--limit N]
 */

import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client.js";
import { lookupArtwork, fetchArtworkBySearch } from "../src/lib/deezer.js";

const connectionString = process.env.DATABASE_URL!;
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const THROTTLE_MS = 150; // ~6-7 req/s, Deezer allows 50 per 5s
const limitArg = process.argv.indexOf("--limit");
const LIMIT = limitArg > -1 ? Number(process.argv[limitArg + 1]) : Infinity;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  // 1. Propagate within ISRC groups that already have artwork somewhere
  const propagated = await prisma.$executeRaw`
    UPDATE airplay_events e
    SET artwork_url = src.artwork_url
    FROM (
      SELECT DISTINCT ON (isrc) isrc, artwork_url
      FROM airplay_events
      WHERE isrc IS NOT NULL AND artwork_url IS NOT NULL
      ORDER BY isrc, created_at DESC
    ) src
    WHERE e.isrc = src.isrc AND e.artwork_url IS NULL
  `;
  console.log(`1) Propagated within ISRC groups: ${propagated} rows`);

  // 2. Distinct ISRCs with no artwork anywhere
  const isrcGroups = await prisma.$queryRaw<
    { isrc: string; song_title: string; artist_name: string; cnt: bigint }[]
  >`
    SELECT isrc,
           mode() WITHIN GROUP (ORDER BY song_title) AS song_title,
           mode() WITHIN GROUP (ORDER BY artist_name) AS artist_name,
           count(*) AS cnt
    FROM airplay_events
    WHERE isrc IS NOT NULL AND artwork_url IS NULL
    GROUP BY isrc
    ORDER BY count(*) DESC
  `;
  console.log(`2) ISRCs to resolve via Deezer: ${isrcGroups.length}`);

  let resolved = 0;
  let notFound = 0;
  let updatedRows = 0;
  let processed = 0;

  for (const g of isrcGroups) {
    if (processed >= LIMIT) break;
    processed++;
    const url = await lookupArtwork(g.isrc, g.song_title, g.artist_name);
    if (url) {
      const { count } = await prisma.airplayEvent.updateMany({
        where: { isrc: g.isrc, artworkUrl: null },
        data: { artworkUrl: url },
      });
      resolved++;
      updatedRows += count;
    } else {
      notFound++;
    }
    if (processed % 50 === 0) {
      console.log(
        `   ...${processed}/${isrcGroups.length} (resolved ${resolved}, not found ${notFound})`,
      );
    }
    await sleep(THROTTLE_MS);
  }
  console.log(
    `   ISRC pass done: ${resolved} resolved (${updatedRows} rows), ${notFound} not on Deezer`,
  );

  // 3. ISRC-less events, grouped by title+artist
  const titleGroups = await prisma.$queryRaw<
    { song_title: string; artist_name: string }[]
  >`
    SELECT DISTINCT song_title, artist_name
    FROM airplay_events
    WHERE isrc IS NULL AND artwork_url IS NULL
  `;
  console.log(`3) ISRC-less title/artist groups: ${titleGroups.length}`);

  let resolved3 = 0;
  for (const g of titleGroups) {
    if (processed >= LIMIT) break;
    processed++;
    const url = await fetchArtworkBySearch(g.song_title, g.artist_name);
    if (url) {
      await prisma.airplayEvent.updateMany({
        where: { isrc: null, songTitle: g.song_title, artistName: g.artist_name, artworkUrl: null },
        data: { artworkUrl: url },
      });
      resolved3++;
    }
    await sleep(THROTTLE_MS);
  }
  console.log(`   title/artist pass done: ${resolved3}/${titleGroups.length} resolved`);

  const remaining = await prisma.airplayEvent.count({ where: { artworkUrl: null } });
  const covered = await prisma.airplayEvent.count({ where: { artworkUrl: { not: null } } });
  console.log(`\nDone. Coverage: ${covered} with artwork, ${remaining} without (no Deezer match).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
