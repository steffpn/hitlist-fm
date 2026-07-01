import { Type, type Static } from "@sinclair/typebox";

// POST /admin/impersonation/configure
export const ConfigureSchema = Type.Object({
  role: Type.Union([
    Type.Literal("ARTIST"),
    Type.Literal("LABEL"),
    Type.Literal("STATION"),
  ]),
  // ARTIST: the artist to view as
  artistName: Type.Optional(Type.String()),
  // STATION: the station to simulate
  stationId: Type.Optional(Type.Number()),
  // LABEL: the roster of artists the label should hold
  artistNames: Type.Optional(Type.Array(Type.String())),
});

export type ConfigureBody = Static<typeof ConfigureSchema>;
