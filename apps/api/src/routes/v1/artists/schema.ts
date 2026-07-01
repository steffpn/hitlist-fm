import { Type, type Static } from "@sinclair/typebox";

// --- Query Schemas ---

export const ArtistsSummaryQuerySchema = Type.Object({
  period: Type.Optional(
    Type.Union([
      Type.Literal("day"),
      Type.Literal("week"),
      Type.Literal("month"),
    ]),
  ),
  limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
});

export type ArtistsSummaryQuery = Static<typeof ArtistsSummaryQuerySchema>;
