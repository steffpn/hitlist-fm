"use client";

import { useState, FormEvent } from "react";
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // The API always answers with a generic 200 (no account enumeration).
      await apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError("Prea multe încercări. Încearcă din nou mai târziu.");
      } else {
        setError("Nu am putut trimite cererea. Verifică conexiunea și încearcă din nou.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell subtitle="Îți trimitem un link ca să-ți resetezi parola.">
      <AuthCard>
        {submitted ? (
          <div className="flex flex-col items-center text-center gap-3 py-2">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-brand-500/10 border border-brand-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.8}
                className="w-6 h-6 text-brand-400"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 6.75l9.75 6.75 9.75-6.75M3.75 5.25h16.5a1.5 1.5 0 011.5 1.5v10.5a1.5 1.5 0 01-1.5 1.5H3.75a1.5 1.5 0 01-1.5-1.5V6.75a1.5 1.5 0 011.5-1.5z"
                />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Verifică-ți emailul</h2>
            <p className="text-sm text-zinc-400">
              Dacă există un cont pentru <span className="text-zinc-200">{email.trim()}</span>, îți
              vom trimite în scurt timp un email cu instrucțiuni de resetare.
            </p>
            <Link
              href="/login"
              className="mt-2 text-sm font-medium text-brand-400 hover:text-brand-300 transition-colors"
            >
              Înapoi la autentificare
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <p className="text-sm text-zinc-400">
              Introdu emailul cu care te-ai înregistrat și îți trimitem instrucțiuni de resetare.
            </p>

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

            {error && <AuthError>{error}</AuthError>}

            <AuthButton loading={loading} loadingLabel="Se trimite...">
              Trimite link-ul de resetare
            </AuthButton>
          </form>
        )}
      </AuthCard>

      {!submitted && (
        <p className="text-center text-sm text-zinc-400 mt-6">
          Ți-ai amintit parola?{" "}
          <Link
            href="/login"
            className="font-medium text-brand-400 hover:text-brand-300 transition-colors"
          >
            Autentifică-te
          </Link>
        </p>
      )}
    </AuthShell>
  );
}
