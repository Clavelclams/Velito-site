/**
 * /signup — Création de compte Velito Interactive.
 *
 * Structure de page calquée sur les sign-up modernes (Notion, Linear, Vercel) :
 *  - Bouton OAuth-style "Continuer avec VENA" en HAUT (option rapide)
 *  - Séparateur "ou"
 *  - Form classique email + mot de passe en bas (option locale)
 *
 * Server Component qui héberge le client form via SignUpForm.tsx. Le client
 * form appelle la server action signUpAction et gère les états de succès/erreur.
 *
 * Future intégration OAuth (phase 5) :
 *   ContinueWithVena passera en mode "popup" et ouvrira hub/oauth/authorize.
 *   Pour l'instant il reste sur le mode "redirect" simple (hub/login?return=...).
 */
import Link from "next/link";
import SignUpForm from "./SignUpForm";
import { ContinueWithVena } from "@repo/ui/continue-with-vena";

export const metadata = {
  title: "Créer un compte — Velito Interactive",
  description:
    "Crée ton compte pour lancer des sessions de jeux interactifs dans ton bar ou MJC. Un seul compte pour toutes les apps Velito.",
};

export default function SignUpPage() {
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL;

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="w-full">
        {/* En-tête — on évite le terme B2B "Espace animateur" sur la page signup
            publique. L'user qui arrive ici est en train de s'inscrire, pas de
            consulter son espace. Texte accueillant. */}
        <header className="text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">
            Rejoins l&apos;aventure
          </p>
          <h1 className="neon-title mt-3 text-3xl md:text-4xl">
            Crée ton compte
          </h1>
          <p className="mt-3 text-sm text-white/60">
            Un seul compte pour toutes les apps Velito (Hub, Interactive, Arena…).
          </p>
        </header>

        {/* OAuth : "Continuer avec VENA" en haut, comme Google Sign-In */}
        <div className="mt-8 flex justify-center">
          <ContinueWithVena hubUrl={hubUrl} className="w-full" />
        </div>

        {/* Séparateur "ou" */}
        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-widest text-white/40">ou</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        {/* Form classique email + mot de passe */}
        <SignUpForm />

        {/* Liens vers /login et /forgot-password (sur le hub central) */}
        <div className="mt-6 space-y-1.5 text-center text-xs text-white/50">
          <p>
            Déjà un compte ?{" "}
            <Link
              href={hubUrl ? `${hubUrl}/login?return=${encodeURIComponent("/dashboard")}` : "/dashboard"}
              className="text-tenant underline-offset-4 hover:underline"
            >
              Se connecter
            </Link>
          </p>
          <p>
            <Link
              href={hubUrl ? `${hubUrl}/forgot-password` : "#"}
              className="text-white/60 underline-offset-4 hover:text-white hover:underline"
            >
              Mot de passe oublié ?
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
