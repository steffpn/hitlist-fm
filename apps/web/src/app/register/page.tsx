"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import { setSession, type StoredUser } from "@/lib/auth";
import { clearImpersonation } from "@/lib/impersonation";
import {
  AuthShell,
  AuthCard,
  AuthButton,
  AuthError,
  authInputClass,
  authLabelClass,
} from "@/components/auth-shell";

interface RegisterResponse {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

/**
 * Invite codes are 12 uppercase hex chars grouped as XXXX-XXXX-XXXX (14 chars
 * with dashes) — exactly what the API's generateInviteCode() emits and what the
 * iOS/Android clients validate. Format as the user types: strip to hex, cap at
 * 12, re-insert dashes every 4.
 */
function formatInviteCode(raw: string): string {
  const stripped = raw
    .toUpperCase()
    .replace(/[^0-9A-F]/g, "")
    .slice(0, 12);
  const groups = stripped.match(/.{1,4}/g) ?? [];
  return groups.join("-");
}

function isInviteCodeValid(code: string): boolean {
  const stripped = code.replace(/-/g, "");
  return stripped.length === 12 && /^[0-9A-F]+$/.test(stripped);
}

/** Known API/register errors → Romanian; unknown messages fall through. */
function registerErrorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 429) return "Prea multe încercări. Încearcă din nou mai târziu.";
    switch (err.message) {
      case "Invalid invitation code":
        return "Cod de invitație invalid.";
      case "Invitation code is no longer valid":
        return "Codul de invitație nu mai este valid.";
      case "Invitation code has expired":
        return "Codul de invitație a expirat.";
      case "Invitation code has been fully used":
        return "Codul de invitație a fost folosit deja.";
      case "Email already registered":
        return "Există deja un cont cu acest email.";
      default:
        return err.message;
    }
  }
  return "Nu am putut crea contul. Verifică conexiunea și încearcă din nou.";
}

export default function RegisterPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Client-side checks mirror the iOS/Android register flow.
    if (!isInviteCodeValid(code)) {
      setError("Codul de invitație trebuie să aibă formatul XXXX-XXXX-XXXX.");
      return;
    }
    if (password.length < 8) {
      setError("Parola trebuie să aibă cel puțin 8 caractere.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Parolele nu coincid.");
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch<RegisterResponse>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          code,
          email: email.trim(),
          password,
          name: name.trim(),
        }),
      });
      // Same session handling as login: store the rotating token pair + user.
      setSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      });
      clearImpersonation();
      router.push(res.user.role === "ADMIN" ? "/" : "/portal");
    } catch (err) {
      setError(registerErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Creează-ți contul cu un cod de invitație.">
      <AuthCard>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-zinc-300 mb-2">
              Cod de invitație
            </label>
            <input
              id="code"
              type="text"
              required
              inputMode="text"
              autoCapitalize="characters"
              autoComplete="off"
              value={code}
              onChange={(e) => setCode(formatInviteCode(e.target.value))}
              className={`${authInputClass} font-mono tracking-[0.2em] text-center uppercase`}
              placeholder="XXXX-XXXX-XXXX"
              maxLength={14}
            />
          </div>

          <div>
            <label htmlFor="name" className={authLabelClass}>
              Nume
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={authInputClass}
              placeholder="Numele tău"
              autoComplete="name"
            />
          </div>

          <div>
            <label htmlFor="email" className={authLabelClass}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={authInputClass}
              placeholder="you@example.com"
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className={authLabelClass}>
              Parolă
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              placeholder="Minim 8 caractere"
              autoComplete="new-password"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className={authLabelClass}>
              Confirmă parola
            </label>
            <input
              id="confirmPassword"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={authInputClass}
              placeholder="Reintrodu parola"
              autoComplete="new-password"
            />
          </div>

          {error && <AuthError>{error}</AuthError>}

          <AuthButton loading={loading} loadingLabel="Se creează contul...">
            Creează cont
          </AuthButton>
        </form>
      </AuthCard>

      <p className="text-center text-sm text-zinc-400 mt-6">
        Ai deja cont?{" "}
        <Link
          href="/login"
          className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Autentifică-te
        </Link>
      </p>
    </AuthShell>
  );
}
