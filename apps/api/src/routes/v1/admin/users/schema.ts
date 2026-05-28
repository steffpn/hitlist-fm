import { Type, type Static } from "@sinclair/typebox";

// --- Request Param Schemas ---

export const UserParamsSchema = Type.Object({
  id: Type.Number(),
});

export type UserParams = Static<typeof UserParamsSchema>;

// --- Request Body Schemas ---

export const UpdateRoleSchema = Type.Object({
  role: Type.Union([
    Type.Literal("ADMIN"),
    Type.Literal("ARTIST"),
    Type.Literal("LABEL"),
    Type.Literal("STATION"),
  ]),
});

export type UpdateRoleBody = Static<typeof UpdateRoleSchema>;

export const UpdateScopesSchema = Type.Object({
  scopes: Type.Array(
    Type.Object({
      entityType: Type.String({ minLength: 1 }),
      entityId: Type.Number(),
    }),
  ),
});

export type UpdateScopesBody = Static<typeof UpdateScopesSchema>;

export const CreateUserSchema = Type.Object({
  email: Type.String({ format: "email" }),
  name: Type.String({ minLength: 1 }),
  password: Type.String({ minLength: 8 }),
  role: Type.Union([
    Type.Literal("ADMIN"),
    Type.Literal("ARTIST"),
    Type.Literal("LABEL"),
    Type.Literal("STATION"),
  ]),
  scopes: Type.Optional(
    Type.Array(
      Type.Object({
        entityType: Type.String({ minLength: 1 }),
        entityId: Type.Number(),
      }),
    ),
  ),
});

export type CreateUserBody = Static<typeof CreateUserSchema>;
