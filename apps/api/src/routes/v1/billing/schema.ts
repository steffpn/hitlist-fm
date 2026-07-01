import { Type, type Static } from "@sinclair/typebox";

export const CreateCheckoutSchema = Type.Object({
  planId: Type.Number(),
  billingInterval: Type.Union([Type.Literal("monthly"), Type.Literal("annual")]),
  successUrl: Type.String(),
  cancelUrl: Type.String(),
});
export type CreateCheckoutBody = Static<typeof CreateCheckoutSchema>;

export const CustomerPortalSchema = Type.Object({
  returnUrl: Type.String(),
});
export type CustomerPortalBody = Static<typeof CustomerPortalSchema>;
