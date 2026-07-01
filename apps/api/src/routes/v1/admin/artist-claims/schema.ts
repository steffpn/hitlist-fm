import { Type, type Static } from "@sinclair/typebox";

export const ListClaimsQuerySchema = Type.Object({
  status: Type.Optional(
    Type.Union([
      Type.Literal("PENDING"),
      Type.Literal("APPROVED"),
      Type.Literal("REJECTED"),
    ]),
  ),
});

export type ListClaimsQuery = Static<typeof ListClaimsQuerySchema>;

export const ClaimParamsSchema = Type.Object({
  id: Type.Integer({ minimum: 1 }),
});

export type ClaimParams = Static<typeof ClaimParamsSchema>;

export const DecideClaimSchema = Type.Object({
  status: Type.Union([Type.Literal("APPROVED"), Type.Literal("REJECTED")]),
});

export type DecideClaimBody = Static<typeof DecideClaimSchema>;
