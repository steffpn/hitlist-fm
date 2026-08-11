import { Type, type Static } from "@sinclair/typebox";

export const SongsQuerySchema = Type.Object({
  period: Type.Optional(
    Type.Union([
      Type.Literal("day"),
      Type.Literal("week"),
      Type.Literal("month"),
    ]),
  ),
  /** Free-text filter over title and artist, plus an exact ISRC match. */
  q: Type.Optional(Type.String()),
  stationId: Type.Optional(Type.Number()),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500, default: 200 })),
});

export type SongsQuery = Static<typeof SongsQuerySchema>;
