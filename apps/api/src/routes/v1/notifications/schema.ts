import { Type, type Static } from "@sinclair/typebox";

// --- Request Schemas ---

// Wire format kept for iOS compatibility (dailyDigestEnabled/weeklyDigestEnabled);
// server-side these map to UserSettings.dailyReportEnabled/weeklyReportEnabled.
export const UpdatePreferencesBodySchema = Type.Object({
  dailyDigestEnabled: Type.Optional(Type.Boolean()),
  weeklyDigestEnabled: Type.Optional(Type.Boolean()),
});

export type UpdatePreferencesBody = Static<typeof UpdatePreferencesBodySchema>;

export const RegisterDeviceTokenBodySchema = Type.Object({
  token: Type.String({ minLength: 1 }),
  platform: Type.Optional(
    Type.Union([
      Type.Literal("ios"),
      Type.Literal("android"),
    ]),
  ),
  environment: Type.Optional(
    Type.Union([
      Type.Literal("sandbox"),
      Type.Literal("production"),
    ]),
  ),
});

export type RegisterDeviceTokenBody = Static<typeof RegisterDeviceTokenBodySchema>;

export const DeleteDeviceTokenBodySchema = Type.Object({
  token: Type.String({ minLength: 1 }),
});

export type DeleteDeviceTokenBody = Static<typeof DeleteDeviceTokenBodySchema>;

export const DigestDetailParamsSchema = Type.Object({
  date: Type.String({ pattern: "^\\d{4}-\\d{2}-\\d{2}$" }),
});

export type DigestDetailParams = Static<typeof DigestDetailParamsSchema>;

export const DigestDetailQuerySchema = Type.Object({
  type: Type.Optional(
    Type.Union([Type.Literal("daily"), Type.Literal("weekly")]),
  ),
});

export type DigestDetailQuery = Static<typeof DigestDetailQuerySchema>;

// --- Response Schemas ---

export const NotificationPreferencesResponseSchema = Type.Object({
  dailyDigestEnabled: Type.Boolean(),
  weeklyDigestEnabled: Type.Boolean(),
});

// Shape matches the iOS DigestDetail/TopItem Codable models
// (apps/ios/onairMusic/Models/NotificationModels.swift).
const TopItemSchema = Type.Object({
  title: Type.String(),
  artist: Type.Union([Type.String(), Type.Null()]),
  name: Type.Union([Type.String(), Type.Null()]),
  count: Type.Integer(),
});

export const DigestDetailResponseSchema = Type.Object({
  playCount: Type.Integer(),
  topSong: Type.Union([TopItemSchema, Type.Null()]),
  topStation: Type.Union([TopItemSchema, Type.Null()]),
  weekOverWeekChange: Type.Union([Type.Number(), Type.Null()]),
  newStationsCount: Type.Union([Type.Integer(), Type.Null()]),
});
