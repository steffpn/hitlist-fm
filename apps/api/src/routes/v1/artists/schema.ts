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

export const ArtistSearchQuerySchema = Type.Object({
  q: Type.String({ minLength: 1, maxLength: 200 }),
});

export type ArtistSearchQuery = Static<typeof ArtistSearchQuerySchema>;

// --- Claim Schemas ---

export const ClaimArtistParamsSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
});

export type ClaimArtistParams = Static<typeof ClaimArtistParamsSchema>;

export const ClaimArtistBodySchema = Type.Object({
  // Link to Spotify for Artists / distributor dashboard / etc.
  evidence: Type.Optional(Type.String({ maxLength: 2000 })),
  // Which of the caller's organizations claims the artist. Optional when the
  // caller is OWNER/ADMIN of exactly one organization.
  organizationId: Type.Optional(Type.Integer({ minimum: 1 })),
});

export type ClaimArtistBody = Static<typeof ClaimArtistBodySchema>;
