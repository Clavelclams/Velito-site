/**
 * /auth/forgot-password — Demande de réinitialisation mdp (VEA, autonome).
 *
 * ⚠️ ARCHI : VEA = asso loi 1901 INDÉPENDANTE de l'écosystème VENA.
 * Cette page NE délègue PAS au hub central. Le flow est 100% VEA :
 *  - Form local
 *  - resetPasswordForEmail() côté VEA avec redirectTo = /auth/reset-password (VEA)
 *  - Le user reste sur le périmètre vea.velito.fr du début à la fin
 *
 * Voir docs/SSO_ARCHITECTURE.md §7 bis pour le rationale séparation.
 *
 * Sécurité (mêmes règles que le hub, mais code distinct) :
 *  - Anti-énumération : message générique identique quel que soit le cas
 *  - Anti-faille "reset = signup" : on utilise STRICTEMENT resetPasswordForEmail()
 *    Cf. docs/OAUTH_ARCHITECTURE.md §8 bis pour le détail de la faille évitée.
 */
"use client";

import { useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

/** Le message UNIQUE à retourner — ne révèle JAMAIS si l'email existe ou pas. */
const GENERIC_OK_MESSAGE =
  "Si un compte existe avec cet email, tu vas recevoir un lien pour réinitialiser ton mot de passe.";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    const supabase = createClient();
    // URL de retour : on passe par /auth/callback (qui fait exchangeCodeForSession
    // côté serveur, pattern officiel @supabase/ssr pour le flow PKCE moderne).
    // Le callback redirige ensuite vers /auth/reset-password avec session établie.
    //
    // Avant : redirectTo = /auth/reset-password directement → marchait uniquement
    // pour le legacy implicit flow (hash #access_token). Avec Supabase moderne
    // qui utilise PKCE (?code=...), la page reset n'arrivait pas à parser le
    // token → erreur "Aucun jeton de récupération trouvé". Fix 11/06/2026.
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://vea.velito.fr";
    const redirectTo = `${origin}/auth/callback?next=/auth/reset-password`;

    // ⚠️ NE JAMAIS utiliser signInWithOtp({shouldCreateUser:true}) ici — voir
    // docs/OAUTH_ARCHITECTURE.md §8 bis. resetPasswordForEmail est SAFE :
    // il ne crée pas de compte si l'email est inconnu.
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      console.error("[vea/forgot-password] Supabase error:", error.message);
      // On affiche le message générique anyway (anti-énumération).
    }

    setLoading(false);
    setDone(true);
  }

  return (
    <div className="min-h-screen hero-bg-full flex items-center justify-center px-4 py-12 pt-28">
      <div className="card-clean p-8 sm:p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <span className="badge-red">Mot de passe oublié</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-vea-text mb-2 text-center">
          On t&apos;envoie <span className="text-vea-accent">un lien</span>
        </h1>
        <p className="text-vea-text-muted mb-8 text-sm text-center">
          Entre l&apos;email de ton compte VEA. Si un compte existe, tu recevras un lien pour redéfinir ton mot de passe.
        </p>

        {done ? (
          <div
            role="status"
            className="border border-vea-accent/30 bg-vea-accent-soft rounded-lg px-4 py-4 text-sm text-vea-text"
          >
            <p>{GENERIC_OK_MESSAGE}</p>
            <p className="mt-3 text-xs text-vea-text-muted">
              Pense à vérifier ton dossier spam. Le lien est valide quelques minutes.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5"
              >
                Email du compte
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all"
                placeholder="ton@email.com"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !email}
              className="btn-primary w-full disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? "Envoi en cours..." : "Envoyer le lien"}
            </button>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-vea-border text-center">
          <Link
            href="/login"
            className="text-xs text-vea-text-dim hover:text-vea-accent transition-colors"
          >
            ← Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
