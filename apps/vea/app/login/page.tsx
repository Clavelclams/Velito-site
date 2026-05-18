/**
 * Page /login — Connexion publique unifiee.
 *
 * Une seule page Connexion pour tous. Apres login Supabase reussi, on
 * redirige automatiquement vers la bonne destination en fonction des
 * permissions de l'user (cf. /api/auth/after-login).
 *
 *   - User avec scope >= editor sur vea -> /admin
 *   - Tous les autres                   -> /profil
 *
 * "use client" car form interactif.
 */
"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setError("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    // Si on a un redirect explicite (cas middleware redirige), on l'utilise
    if (redirectParam) {
      router.refresh();
      router.push(redirectParam);
      return;
    }

    // Sinon route serveur qui decide /admin vs /profil selon les permissions
    router.refresh();
    router.push("/api/auth/after-login");
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";

  return (
    <div className="min-h-screen hero-bg-full flex items-center justify-center px-4 py-12 pt-28">
      <div className="card-clean p-8 sm:p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <span className="badge-red">Connexion</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-vea-text mb-2 text-center">
          Bon retour <span className="text-vea-accent">parmi nous</span>
        </h1>
        <p className="text-vea-text-muted mb-8 text-sm text-center">
          Connecte-toi pour acceder a ton espace membre ou administrer la
          plateforme.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5"
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className={inputClass}
              placeholder="ton@email.com"
            />
          </div>

          <div>
            <label
              htmlFor="password"
              className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5"
            >
              Mot de passe
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              className={inputClass}
              placeholder="••••••••"
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
            {loading ? "Connexion..." : "Se connecter"}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-vea-border text-center space-y-2">
          <p className="text-sm text-vea-text-muted">
            Pas encore de compte ?{" "}
            <Link
              href="/signup"
              className="text-vea-accent hover:underline font-semibold"
            >
              S&apos;inscrire
            </Link>
          </p>
          <Link
            href="/"
            className="text-xs text-vea-text-dim hover:text-vea-accent transition-colors block"
          >
            ← Retour au site
          </Link>
        </div>
      </div>
    </div>
  );
}
