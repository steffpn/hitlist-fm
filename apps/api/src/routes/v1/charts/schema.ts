import { Type, type Static } from "@sinclair/typebox";

export const AirplayChartQuerySchema = Type.Object({
  period: Type.Optional(
    Type.Union([Type.Literal("week"), Type.Literal("month")]),
  ),
  limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
});
export type AirplayChartQuery = Static<typeof AirplayChartQuerySchema>;

export const SongIsrcParamsSchema = Type.Object({
  isrc: Type.String({ minLength: 5, maxLength: 20 }),
});
export type SongIsrcParams = Static<typeof SongIsrcParamsSchema>;
