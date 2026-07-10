"use client";

import { useState, useEffect, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/api";
import { setSession, type StoredUser } from "@/lib/auth";
import { clearImpersonation } from "@/lib/impersonation";
import {
  AuthShell,
  AuthCard,
  AuthButton,
  AuthError,
  AuthSuccess,
  authInputClass,
} from "@/components/auth-shell";

interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  user: StoredUser;
}

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resetOk, setResetOk] = useState(false);

  // Success banner after a completed /reset-password redirect (?reset=success).
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("reset") === "success") {
      setResetOk(true);
    }
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await apiFetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      // Keep the full session: access + refresh token (rotating) + user (role).
      setSession({
        accessToken: res.accessToken,
        refreshToken: res.refreshToken,
        user: res.user,
      });
      clearImpersonation();
      router.push(res.user.role === "ADMIN" ? "/" : "/portal");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Know exactly where your music plays.">
      <AuthCard>
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          {resetOk && (
            <AuthSuccess>Parola a fost resetată. Autentifică-te cu parola nouă.</AuthSuccess>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-300 mb-2">
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
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-medium text-zinc-300">
                Parolă
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-medium text-brand-400 hover:text-brand-300 transition-colors"
              >
                Ai uitat parola?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <AuthError>{error}</AuthError>}

          <AuthButton loading={loading} loadingLabel="Se conectează...">
            Autentificare
          </AuthButton>
        </form>
      </AuthCard>

      <p className="text-center text-sm text-zinc-400 mt-6">
        Ai un cod de invitație?{" "}
        <Link
          href="/register"
          className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
        >
          Creează cont
        </Link>
      </p>
    </AuthShell>
  );
}
