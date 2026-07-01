import { Type, type Static } from "@sinclair/typebox";

// --- Request Schemas ---

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

// --- Response Schemas ---

export const NotificationPreferencesResponseSchema = Type.Object({
  dailyDigestEnabled: Type.Boolean(),
  weeklyDigestEnabled: Type.Boolean(),
});
