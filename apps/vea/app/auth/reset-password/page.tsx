/**
 * Page reset password — gere le flow Supabase password recovery.
 *
 * Quand l'user clique un lien "Reset Password" dans son email Gmail, Supabase
 * le redirige vers Site URL avec un hash `#access_token=...&refresh_token=...&type=recovery`.
 * Cette page :
 *   1. Parse le hash, extrait les tokens
 *   2. Etablit la session Supabase via setSession()
 *   3. Presente un form "Nouveau mot de passe" + confirmation
 *   4. Update le password via supabase.auth.updateUser({ password })
 *   5. Redirect vers /admin une fois fait
 *
 * Si l'user arrive ici sans hash valide -> message d'erreur + lien /admin/login.
 */
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [tokenReady, setTokenReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [parseError, setParseError] = useState("");

  useEffect(() => {
    const hash = typeof window !== "undefined"
      ? window.location.hash.substring(1)
      : "";

    if (!hash) {
      setParseError(
        "Aucun jeton de recuperation trouve dans l'URL. Demande un nouveau lien depuis /admin/login."
      );
      return;
    }

    const params = new URLSearchParams(hash);
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    const type = params.get("type");

    if (type !== "recovery" || !accessToken || !refreshToken) {
      setParseError(
        "Lien de recuperation invalide ou expire. Demande un nouveau password recovery."
      );
      return;
    }

    // Etablit la session Supabase avec les tokens du hash
    supabase.auth
      .setSession({
        access_token: accessToken,
        refresh_token: refreshToken,
      })
      .then(({ error: sessionError }) => {
        if (sessionError) {
          setParseError(
            "Impossible de valider le lien de recuperation. Demande un nouveau lien."
          );
          return;
        }
        setTokenReady(true);
        // Clean l'URL (retire le hash pour eviter de re-traiter au refresh)
        window.history.replaceState({}, "", window.location.pathname);
      });
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caracteres.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Les deux mots de passe ne correspondent pas.");
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(
        "Erreur lors de la mise a jour du mot de passe : " + updateError.message
      );
      setLoading(false);
      return;
    }

    setSuccess(true);
    setLoading(false);
    // Petite pause pour que l'user voie le message de succes, puis redirect
    setTimeout(() => router.push("/admin"), 1500);
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";

  return (
    <div className="min-h-screen hero-bg-full flex items-center justify-center px-4 py-12">
      <div className="card-clean p-8 sm:p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <span className="badge-red">Nouveau mot de passe</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-vea-text mb-2 text-center">
          Definir ton <span className="text-vea-accent">mot de passe</span>
        </h1>
        <p className="text-vea-text-muted mb-8 text-sm text-center">
          Choisis un mot de passe fort, minimum 8 caracteres.
        </p>

        {parseError ? (
          <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-4 text-sm text-vea-accent mb-6">
            {parseError}
          </div>
        ) : success ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-vea-accent-soft border border-vea-accent/20 flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#E63946"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-vea-text mb-2">
              Mot de passe mis a jour
            </h2>
            <p className="text-sm text-vea-text-muted">
              Redirection vers le dashboard admin...
            </p>
          </div>
        ) : !tokenReady ? (
          <p className="text-sm text-vea-text-muted text-center py-4">
            Validation du lien en cours...
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5"
              >
                Nouveau mot de passe
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
                placeholder="Minimum 8 caracteres"
              />
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5"
              >
                Confirmer le mot de passe
              </label>
              <input
                type="password"
                id="confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
                placeholder="Re-tape le meme mot de passe"
              />
            </div>

            {error && (
              <div className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-3 text-sm text-vea-accent">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Enregistrement..." : "Valider le mot de passe"}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-vea-border text-center">
          <Link
            href="/admin/login"
            className="text-xs text-vea-text-dim hover:text-vea-accent transition-colors"
          >
            ← Retour a la connexion admin
          </Link>
        </div>
      </div>
    </div>
  );
}
