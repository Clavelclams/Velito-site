/**
 * /forgot-password — Demande de réinitialisation de mot de passe (Hub Velito).
 *
 * Server Component qui héberge le ForgotPasswordForm (client) en charge de
 * l'UX (loading, submit, message succès/erreur). La server action côté
 * client retourne TOUJOURS le même message générique anti-énumération.
 *
 * Voir docs/OAUTH_ARCHITECTURE.md §8 bis pour le détail de la faille évitée.
 */
import Link from "next/link";
import ForgotPasswordForm from "./ForgotPasswordForm";

export const metadata = {
  title: "Mot de passe oublié — Velito",
  description:
    "Réinitialise ton mot de passe pour ton compte Velito (Hub, VEA, Interactive…).",
};

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="w-full">
        <header className="text-center">
          <h1 className="font-[Orbitron] text-3xl font-black text-white md:text-4xl">
            Mot de passe oublié
          </h1>
          <p className="mt-3 text-sm text-white/60">
            Entre l&apos;email de ton compte Velito. Si un compte existe, tu vas recevoir un lien pour redéfinir ton mot de passe.
          </p>
        </header>

        <div className="mt-8">
          <ForgotPasswordForm />
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Retour à la{" "}
          <Link href="/login" className="text-white underline-offset-4 hover:underline">
            connexion
          </Link>
        </p>
      </div>
    </main>
  );
}
