/**
 * /login — Page de login central Velito (hub.velito.fr).
 *
 * C'est ICI que tout l'écosystème se connecte. Les autres apps (Interactive,
 * Arena, etc.) renvoient leurs utilisateurs sur cette page via le composant
 * @repo/ui "Continuer avec VENA". Au retour, on redirige vers ?return=...
 *
 * Pas de signup ici en V1 — il sera ajouté ensuite. Pour les tests, on crée
 * les comptes manuellement via Supabase Auth dashboard.
 *
 * [07/11/2026] « Se connecter avec Velito » : si l'utilisateur est DÉJÀ
 * connecté (cookie partagé .velito.fr), on ne lui redemande rien, on le
 * renvoie tout de suite vers ?return= (validé par safeReturnTo). C'est ce qui
 * rend le bouton des autres apps instantané pour quelqu'un déjà connecté.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";
import { createClient } from "@/lib/supabase/server";
import { safeReturnTo } from "@/lib/return-to";

export const metadata: Metadata = {
  title: "Connexion — Velito",
  description: "Connexion à l'écosystème Velito (Hub + modules).",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ return?: string }>;
}) {
  const { return: retour } = await searchParams;
  // Lecture de session « best-effort » : si Supabase est indisponible, on
  // affiche simplement le formulaire. redirect() reste HORS du try, car il
  // fonctionne en levant une exception spéciale que le catch avalerait.
  let user = null;
  try {
    const supabase = await createClient();
    ({
      data: { user },
    } = await supabase.auth.getUser());
  } catch {
    user = null;
  }
  // Déjà connecté ET une destination est demandée : on y va directement.
  // (Sans ?return=, on laisse la page s'afficher normalement.)
  if (user && retour) {
    redirect(safeReturnTo(retour));
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
        <header className="mb-10 text-center">
          <h1 className="text-3xl font-black tracking-tight">
            Connecte-toi à <span className="text-violet-400">Velito</span>
          </h1>
          <p className="mt-3 text-sm text-white/60">
            Un compte unique pour tous les modules Velito.
          </p>
        </header>

        <Suspense>
          <LoginForm />
        </Suspense>

        <footer className="mt-10 text-center text-xs text-white/40">
          <p>
            Pas encore de compte ? Contacte Velito pour la phase pilote.
          </p>
        </footer>
      </div>
    </main>
  );
}
