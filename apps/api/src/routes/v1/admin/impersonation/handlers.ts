import type { FastifyReply, FastifyRequest } from "fastify";
import { randomBytes } from "node:crypto";
import { prisma } from "../../../../lib/prisma.js";
import { hashPassword } from "../../../../lib/auth.js";
import type { ConfigureBody } from "./schema.js";

/**
 * Admin-only "view as role" configuration.
 *
 * Instead of impersonating a fixed demo account, an admin picks a ROLE and a
 * concrete entity (an artist / a station / a set of artists). We provision a
 * hidden per-role "persona" account with exactly that entity's real airplay
 * data, then the client impersonates the persona (existing X-Impersonate-User-Id
 * mechanism). Idempotent: each configure resets the persona's data.
 */

// activatedAt for provisioned monitored songs sits far in the past so ALL
// historical airplay counts toward the persona's stats (dashboards filter
// airplay by started_at >= activatedAt).
const PAST = new Date("2020-01-01T00:00:00.000Z");
const SONG_LIMIT = 25;

const PERSONA = {
  ARTIST: { email: "persona-artist@onair.internal", fallbackName: "Demo Artist" },
  LABEL: { email: "persona-label@onair.internal", fallbackName: "Demo Label" },
  STATION: { email: "persona-station@onair.internal", fallbackName: "Demo Station" },
} as const;

type PersonaRole = keyof typeof PERSONA;

async function ensurePersona(role: PersonaRole) {
  const spec = PERSONA[role];
  const existing = await prisma.user.findUnique({ where: { email: spec.email } });
  if (existing) {
    if (existing.role !== role || !existing.isActive) {
      return prisma.user.update({
        where: { id: existing.id },
        data: { role, isActive: true },
      });
    }
    return existing;
  }
  // Unguessable password — the persona can never be logged into directly.
  const passwordHash = await hashPassword(randomBytes(24).toString("hex"));
  return prisma.user.create({
    data: {
      email: spec.email,
      name: spec.fallbackName,
      passwordHash,
      role,
      isActive: true,
    },
  });
}

/** Top distinct songs (by total plays) for an artist name, from real airplay. */
async function topSongsForArtist(
  artistName: string,
  limit: number,
): Promise<Array<{ songTitle: string; isrc: string }>> {
  const rows = await prisma.$queryRaw<
    Array<{ isrc: string; song_title: string }>
  >`
    SELECT isrc, MAX(song_title) AS song_title
    FROM airplay_events
    WHERE artist_name = ${artistName}
      AND isrc IS NOT NULL AND isrc <> ''
    GROUP BY isrc
    ORDER BY SUM(play_count) DESC
    LIMIT ${limit}
  `;
  return rows.map((r) => ({ songTitle: r.song_title, isrc: r.isrc }));
}

/**
 * GET /admin/impersonation/options
 * Returns the selectable entities: recent artists (by total plays) + stations.
 */
export async function getImpersonationOptions(
  _request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  const artistRows = await prisma.$queryRaw<
    Array<{ artist_name: string; plays: number }>
  >`
    SELECT artist_name, SUM(play_count)::int AS plays
    FROM airplay_events
    WHERE artist_name IS NOT NULL AND artist_name <> ''
    GROUP BY artist_name
    ORDER BY plays DESC
    LIMIT 40
  `;

  const stations = await prisma.station.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return reply.send({
    artists: artistRows.map((r) => ({ name: r.artist_name, plays: Number(r.plays) })),
    stations,
  });
}

/**
 * POST /admin/impersonation/configure
 * Provisions the per-role persona from the selection; returns the persona id
 * the client should impersonate + a human display name.
 */
export async function configureImpersonation(
  request: FastifyRequest<{ Body: ConfigureBody }>,
  reply: FastifyReply,
): Promise<void> {
  const { role } = request.body;

  if (role === "STATION") {
    const stationId = request.body.stationId;
    if (!stationId) {
      return reply.status(400).send({ error: "stationId is required" });
    }
    const station = await prisma.station.findUnique({ where: { id: stationId } });
    if (!station) {
      return reply.status(400).send({ error: "Station not found" });
    }
    const persona = await ensurePersona("STATION");
    await prisma.$transaction([
      prisma.userScope.deleteMany({ where: { userId: persona.id } }),
      prisma.userScope.create({
        data: { userId: persona.id, entityType: "STATION", entityId: station.id },
      }),
      prisma.user.update({ where: { id: persona.id }, data: { name: station.name } }),
    ]);
    return reply.send({ userId: persona.id, role: "STATION", displayName: station.name });
  }

  if (role === "ARTIST") {
    const artistName = request.body.artistName?.trim();
    if (!artistName) {
      return reply.status(400).send({ error: "artistName is required" });
    }
    const persona = await ensurePersona("ARTIST");
    const songs = await topSongsForArtist(artistName, SONG_LIMIT);

    await prisma.monitoredSong.deleteMany({ where: { userId: persona.id } });
    if (songs.length > 0) {
      await prisma.monitoredSong.createMany({
        data: songs.map((s) => ({
          userId: persona.id,
          songTitle: s.songTitle,
          artistName,
          isrc: s.isrc,
          activatedAt: PAST,
          status: "active",
        })),
        skipDuplicates: true,
      });
    }
    await prisma.user.update({ where: { id: persona.id }, data: { name: artistName } });
    return reply.send({
      userId: persona.id,
      role: "ARTIST",
      displayName: artistName,
      songCount: songs.length,
    });
  }

  // LABEL
  const artistNames = (request.body.artistNames ?? [])
    .map((n) => n.trim())
    .filter((n) => n.length > 0);
  if (artistNames.length === 0) {
    return reply.status(400).send({ error: "artistNames is required" });
  }
  const persona = await ensurePersona("LABEL");

  // Reset: label_artists cascade-deletes its label_monitored_songs links.
  await prisma.labelArtist.deleteMany({ where: { labelUserId: persona.id } });
  await prisma.monitoredSong.deleteMany({ where: { userId: persona.id } });

  for (const artistName of artistNames) {
    const songs = await topSongsForArtist(artistName, SONG_LIMIT);
    const songIds: number[] = [];
    for (const s of songs) {
      const ms = await prisma.monitoredSong.upsert({
        where: { userId_isrc: { userId: persona.id, isrc: s.isrc } },
        create: {
          userId: persona.id,
          songTitle: s.songTitle,
          artistName,
          isrc: s.isrc,
          activatedAt: PAST,
          status: "active",
        },
        update: {},
      });
      songIds.push(ms.id);
    }
    const labelArtist = await prisma.labelArtist.create({
      data: { labelUserId: persona.id, artistName },
    });
    if (songIds.length > 0) {
      await prisma.labelMonitoredSong.createMany({
        data: songIds.map((monitoredSongId) => ({
          labelArtistId: labelArtist.id,
          monitoredSongId,
        })),
        skipDuplicates: true,
      });
    }
  }

  const displayName =
    artistNames.length <= 2
      ? artistNames.join(", ")
      : `${artistNames.length} artists`;
  await prisma.user.update({
    where: { id: persona.id },
    data: { name: displayName },
  });
  return reply.send({
    userId: persona.id,
    role: "LABEL",
    displayName,
    artistCount: artistNames.length,
  });
}
