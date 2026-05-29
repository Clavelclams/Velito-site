/**
 * /reset-password — Page d'arrivée du lien email de réinitialisation.
 *
 * Comportement :
 *  - Quand Supabase envoie le lien email, l'URL contient un `#access_token=...`
 *    (côté navigateur uniquement, jamais transmis au serveur — c'est exprès).
 *  - Au mount, le client Supabase de @supabase/ssr capture ce hash et le
 *    transforme en session "recovery" (cookie).
 *  - L'user voit alors un form "nouveau mot de passe" et le soumet.
 *  - Server action `resetPasswordAction()` met à jour le mdp et redirige
 *    vers /login?reset=ok.
 *
 * On lit côté serveur s'il y a déjà une session pour afficher un message
 * différent si l'utilisateur arrive ici sans flow recovery (erreur).
 *
 * Voir docs/OAUTH_ARCHITECTURE.md §8 bis pour le détail "ce flow ne peut
 * pas créer de compte".
 */
import Link from "next/link";
import ResetPasswordForm from "./ResetPasswordForm";

export const metadata = {
  title: "Nouveau mot de passe — Velito",
  description: "Définis ton nouveau mot de passe Velito.",
};

export const dynamic = "force-dynamic";

export default function ResetPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 py-12">
      <div className="w-full">
        <header className="text-center">
          <h1 className="font-[Orbitron] text-3xl font-black text-white md:text-4xl">
            Nouveau mot de passe
          </h1>
          <p className="mt-3 text-sm text-white/60">
            Choisis un nouveau mot de passe pour ton compte Velito.
          </p>
        </header>

        <div className="mt-8">
          <ResetPasswordForm />
        </div>

        <p className="mt-6 text-center text-xs text-white/50">
          Le lien ne marche plus ?{" "}
          <Link
            href="/forgot-password"
            className="text-white underline-offset-4 hover:underline"
          >
            Demande un nouveau lien
          </Link>
        </p>
      </div>
    </main>
  );
}
