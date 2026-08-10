import { Type, type Static } from "@sinclair/typebox";

// --- Request Schemas ---

export const AirplayEventParamsSchema = Type.Object({
  id: Type.Number(),
});

export type AirplayEventParams = Static<typeof AirplayEventParamsSchema>;

// --- Response Schemas ---

export const SnippetUrlResponseSchema = Type.Object({
  url: Type.String(),
  expiresIn: Type.Number(),
});

export const ErrorResponseSchema = Type.Object({
  error: Type.String(),
});

// --- List Events Schemas ---

export const ListEventsQuerySchema = Type.Object({
  cursor: Type.Optional(Type.Number()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 100 })),
  q: Type.Optional(Type.String()),
  startDate: Type.Optional(Type.String({ format: "date" })),
  endDate: Type.Optional(Type.String({ format: "date" })),
  stationId: Type.Optional(Type.Number()),
});

export type ListEventsQuery = Static<typeof ListEventsQuerySchema>;

export const AirplayEventSchema = Type.Object({
  id: Type.Number(),
  stationId: Type.Number(),
  startedAt: Type.String(),
  endedAt: Type.String(),
  songTitle: Type.String(),
  artistName: Type.String(),
  isrc: Type.Union([Type.String(), Type.Null()]),
  confidence: Type.Number(),
  playCount: Type.Number(),
  snippetUrl: Type.Union([Type.String(), Type.Null()]),
  // Played < 30s (teaser/jingle). Kept visible in the raw list so clients
  // can render these differently; excluded from all aggregations.
  partialPlay: Type.Boolean(),
  // Cached Deezer album artwork, resolved asynchronously after detection.
  artworkUrl: Type.Union([Type.String(), Type.Null()]),
  // Platform ids from ACRCloud's external_metadata, stored at detection time.
  // Clients deep-link with these instead of guessing a search query.
  spotifyId: Type.Union([Type.String(), Type.Null()]),
  youtubeId: Type.Union([Type.String(), Type.Null()]),
  // Seconds the song actually aired, as measured by ACRCloud. Only populated
  // once the broadcast-monitoring callback runs in Delay mode — RealTime fires
  // on recognition, before the play has finished, and carries no duration.
  playedDuration: Type.Union([Type.Number(), Type.Null()]),
  createdAt: Type.String(),
  station: Type.Object({ name: Type.String() }),
});

export const ListEventsResponseSchema = Type.Object({
  data: Type.Array(AirplayEventSchema),
  nextCursor: Type.Union([Type.Number(), Type.Null()]),
});
