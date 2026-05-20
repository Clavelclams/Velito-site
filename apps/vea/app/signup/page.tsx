/**
 * Page /signup — Inscription publique d'un nouveau membre via Supabase Auth.
 *
 * Pourquoi cette page existe :
 *   - Un visiteur qui veut suivre les events / voir sa progression cree un compte
 *   - Le compte ne donne AUCUNE permission admin (pas d'entry dans
 *     shared.user_permissions par defaut)
 *   - Trigger Postgres `on_auth_user_created` cree auto le profile shared.users
 *
 * Strategie email :
 *   - On utilise signUp() avec emailRedirectTo pointant sur /auth/callback
 *   - Supabase envoie un mail de confirmation
 *   - Apres click sur le lien -> /auth/callback recupere la session -> /profil
 *
 * Note : si "Confirm email" est desactive cote Supabase Dashboard, l'user est
 * connecte directement sans confirmation. On gere les 2 cas (success message
 * adaptatif).
 *
 * "use client" car form interactif + Supabase Auth signUp cote client.
 */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const supabase = createClient();

  const [prenom, setPrenom] = useState("");
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<"none" | "auto" | "email">("none");
  // Si l'user est un ancien licencie Yapla, on detecte le match via trigger
  // shared.link_participant_to_user et on affiche un message "Bienvenue de retour"
  const [legacyMatch, setLegacyMatch] = useState<{
    prenom: string;
    nom: string;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Le mot de passe doit faire au moins 8 caracteres.");
      return;
    }
    if (prenom.trim().length < 2 || nom.trim().length < 2) {
      setError("Le prenom et le nom doivent faire au moins 2 caracteres.");
      return;
    }

    setLoading(true);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
          // Stocke prenom/nom dans user_metadata. Le trigger Postgres ne les
          // lit pas automatiquement, on peut les recuperer plus tard pour
          // populer shared.users.prenom / shared.users.nom via une edge function
          // ou un appel /api/profile.
          prenom: prenom.trim(),
          nom: nom.trim(),
        },
      },
    });

    if (signUpError) {
      setError(signUpError.message || "Erreur lors de l'inscription.");
      setLoading(false);
      return;
    }

    // ============================================================================
    // Detection ex-licencie Yapla
    // Le trigger Postgres `link_participant_to_user` a deja lie le compte si match.
    // On verifie ici cote client et on adapte le message de bienvenue.
    // ============================================================================
    try {
      const { data: legacy } = await supabase
        .schema("vea")
        .from("participants")
        .select("prenom, nom")
        .eq("email", email.toLowerCase())
        .maybeSingle();
      if (legacy) {
        setLegacyMatch({ prenom: legacy.prenom, nom: legacy.nom });
      }
    } catch {
      // Pas grave si la requete echoue, on continue avec le flow normal
    }

    // Si Supabase a desactive la confirmation email, la session est etablie direct
    if (data.session) {
      setSuccess("auto");
      setLoading(false);
      setTimeout(() => router.push("/profil"), legacyMatch ? 2500 : 1500);
      return;
    }

    // Sinon confirmation email obligatoire
    setSuccess("email");
    setLoading(false);
  }

  const inputClass =
    "w-full bg-white border border-vea-border rounded-lg px-4 py-3 text-vea-text text-sm placeholder-vea-text-dim focus:outline-none focus:border-vea-accent focus:ring-2 focus:ring-vea-accent/15 transition-all";

  return (
    <div className="min-h-screen hero-bg-full flex items-center justify-center px-4 py-12 pt-28">
      <div className="card-clean p-8 sm:p-10 w-full max-w-md">
        <div className="flex justify-center mb-6">
          <span className="badge-red">Inscription</span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-black text-vea-text mb-2 text-center">
          Rejoins la <span className="text-vea-accent">communaute VEA</span>
        </h1>
        <p className="text-vea-text-muted mb-8 text-sm text-center">
          Cree ton compte pour suivre les events, voir ta progression et
          participer aux tournois.
        </p>

        {success === "auto" ? (
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
              {legacyMatch
                ? `Bienvenue de retour, ${legacyMatch.prenom} !`
                : "Compte cree"}
            </h2>
            {legacyMatch && (
              <p className="text-sm text-vea-text-muted mb-2">
                On a retrouve ton ancien profil licencie VEA. Tes
                participations passees sont liees a ton nouveau compte.
              </p>
            )}
            <p className="text-sm text-vea-text-muted">
              Redirection vers ton profil...
            </p>
          </div>
        ) : success === "email" ? (
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
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                <polyline points="22,6 12,13 2,6" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-vea-text mb-2">
              Verifie ta boite mail
            </h2>
            <p className="text-sm text-vea-text-muted mb-2">
              Un lien de confirmation a ete envoye a :
            </p>
            <p className="text-sm font-semibold text-vea-accent mb-4">
              {email}
            </p>
            <p className="text-xs text-vea-text-dim leading-relaxed">
              Clique le lien dans le mail pour activer ton compte. Pense a
              regarder dans les spams. Le lien expire dans 24h.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="prenom"
                  className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5"
                >
                  Prenom
                </label>
                <input
                  type="text"
                  id="prenom"
                  value={prenom}
                  onChange={(e) => setPrenom(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="given-name"
                  className={inputClass}
                  placeholder="Josué"
                />
              </div>
              <div>
                <label
                  htmlFor="nom"
                  className="block text-xs font-semibold text-vea-text-muted uppercase tracking-wider mb-1.5"
                >
                  Nom
                </label>
                <input
                  type="text"
                  id="nom"
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  required
                  minLength={2}
                  autoComplete="family-name"
                  className={inputClass}
                  placeholder="Clémentin"
                />
              </div>
            </div>

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
                minLength={8}
                autoComplete="new-password"
                className={inputClass}
                placeholder="Minimum 8 caracteres"
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
              {loading ? "Creation du compte..." : "Creer mon compte"}
            </button>

            <p className="text-[11px] text-vea-text-dim leading-relaxed text-center">
              En t&apos;inscrivant, tu acceptes que tes donnees soient stockees
              pour te permettre de suivre tes participations aux events VEA.
              Aucune diffusion a des tiers.
            </p>
          </form>
        )}

        <div className="mt-8 pt-6 border-t border-vea-border text-center space-y-2">
          <p className="text-sm text-vea-text-muted">
            Tu as deja un compte ?{" "}
            <Link
              href="/login"
              className="text-vea-accent hover:underline font-semibold"
            >
              Connexion
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
