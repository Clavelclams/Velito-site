/**
 * /login — Page de login central Velito (hub.velito.fr).
 *
 * C'est ICI que tout l'écosystème se connecte. Les autres apps (Interactive,
 * Arena, etc.) renvoient leurs utilisateurs sur cette page via le composant
 * @repo/ui "Continuer avec VENA". Au retour, on redirige vers ?return=...
 *
 * Pas de signup ici en V1 — il sera ajouté ensuite. Pour les tests, on crée
 * les comptes manuellement via Supabase Auth dashboard.
 */
import type { Metadata } from "next";
import { Suspense } from "react";
import LoginForm from "./LoginForm";

export const metadata: Metadata = {
  title: "Connexion — Velito",
  description: "Connexion à l'écosystème Velito (Hub + modules).",
};

export default function LoginPage() {
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
