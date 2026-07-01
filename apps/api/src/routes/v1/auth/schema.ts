import { Type, type Static } from "@sinclair/typebox";

// --- Request Body Schemas ---

export const RegisterSchema = Type.Object({
  code: Type.String({ minLength: 14, maxLength: 14 }),
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 8 }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
});

export type RegisterBody = Static<typeof RegisterSchema>;

// Self-serve signup: no invitation code. accountType is a closed enum —
// "admin" is not a member, so an ADMIN account can never be self-provisioned
// (schema validation rejects it with 400 before the handler runs).
export const SignupSchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 8 }),
  name: Type.String({ minLength: 1, maxLength: 100 }),
  accountType: Type.Union([
    Type.Literal("artist"),
    Type.Literal("label"),
    Type.Literal("station"),
  ]),
});

export type SignupBody = Static<typeof SignupSchema>;

export const VerifyEmailSchema = Type.Object({
  code: Type.String({ pattern: "^[0-9]{6}$" }),
});

export type VerifyEmailBody = Static<typeof VerifyEmailSchema>;

export const LoginSchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 1 }),
});

export type LoginBody = Static<typeof LoginSchema>;

export const RefreshSchema = Type.Object({
  refreshToken: Type.String({ minLength: 1 }),
});

export type RefreshBody = Static<typeof RefreshSchema>;

export const LogoutSchema = Type.Object({
  refreshToken: Type.String({ minLength: 1 }),
});

export type LogoutBody = Static<typeof LogoutSchema>;

export const ForgotPasswordSchema = Type.Object({
  email: Type.String({ format: "email" }),
});

export type ForgotPasswordBody = Static<typeof ForgotPasswordSchema>;

export const ResetPasswordSchema = Type.Object({
  token: Type.String({ minLength: 1 }),
  newPassword: Type.String({ minLength: 8 }),
});

export type ResetPasswordBody = Static<typeof ResetPasswordSchema>;
