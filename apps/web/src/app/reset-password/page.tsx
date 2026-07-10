"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch, ApiError } from "@/lib/api";
import {
  AuthShell,
  AuthCard,
  AuthButton,
  AuthError,
  authInputClass,
  authLabelClass,
} from "@/components/auth-shell";

export default function ResetPasswordPage() {
  const router = useRouter();
  // Token arrives via the reset email link: /reset-password?token=<hex>.
  // Read it client-side (these auth screens never prerender with a token).
  const [token, setToken] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setToken(params.get("token"));
    setMounted(true);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!token) {
      setError("Link-ul de resetare este invalid sau a expirat.");
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
      await apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, newPassword: password }),
      });
      // Route back to login with a success state (banner shown there).
      router.push("/login?reset=success");
    } catch (err) {
      if (err instanceof ApiError && err.status === 400) {
        setError("Link-ul de resetare este invalid sau a expirat.");
      } else if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Nu am putut reseta parola. Verifică conexiunea și încearcă din nou.");
      }
      setLoading(false);
    }
  }

  // Before the effect runs we don't yet know whether a token is present.
  const showMissingToken = mounted && !token;

  return (
    <AuthShell subtitle="Alege o parolă nouă pentru contul tău.">
      <AuthCard>
        {showMissingToken ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <AuthError>Link-ul de resetare este invalid sau a expirat.</AuthError>
            <Link
              href="/forgot-password"
              className="mt-1 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
            >
              Cere un link nou
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <label htmlFor="password" className={authLabelClass}>
                Parolă nouă
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

            <AuthButton loading={loading} loadingLabel="Se resetează...">
              Resetează parola
            </AuthButton>
          </form>
        )}
      </AuthCard>

      <p className="text-center text-sm text-zinc-400 mt-6">
        <Link
          href="/login"
          className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Înapoi la autentificare
        </Link>
      </p>
    </AuthShell>
  );
}
