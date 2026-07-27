/**
 * Header commun — composant CLIENT.
 *
 * Pourquoi client et pas serveur ? Deux raisons :
 *  1. usePathname() : on masque le header sur /login (un bouton
 *     « Déconnexion » sur l'écran de connexion n'aurait aucun sens).
 *     Vérifier la session côté serveur ferait le même travail, MAIS
 *     appeler cookies() dans le layout racine rendrait TOUTES les pages
 *     dynamiques — on perdrait le SSG des fiches (generateStaticParams).
 *  2. useTransition() : feedback « Déconnexion… » pendant l'action.
 *
 * La déconnexion RÉUTILISE seConnecterAction/seDeconnecterAction de
 * app/login/actions.ts (flux Supabase existant) — rien de réinventé :
 * importer une fonction d'un module "use server" depuis un composant
 * client est le pont officiel Next.js client → serveur.
 *
 * Qui protège les pages ? Le middleware, toujours. Ce header est purement
 * de la navigation — il n'est PAS une couche de sécurité.
 */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTransition } from "react";
import { seDeconnecterAction } from "@/app/login/actions";

export default function EnTete() {
  const pathname = usePathname();
  const [enCours, startTransition] = useTransition();

  // Pas de header sur l'écran de connexion.
  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-10 border-b border-cours-border bg-cours-surface/95 backdrop-blur">
      {/* Sur mobile (<640px) : marges réduites et labels texte masqués (les
          emojis restent cliquables) pour tenir sur UNE ligne — sinon le header
          wrappe et la barre de lecture (position fixe dessous) se décale. */}
      <div className="mx-auto flex max-w-4xl items-center justify-between px-3 py-3 sm:px-4">
        <div className="flex items-center gap-3 sm:gap-5">
          {/* Le nom en dégradé indigo→violet : bg-clip-text peint le texte avec le fond. */}
          <Link
            href="/"
            className="whitespace-nowrap bg-gradient-to-r from-cours-accent to-cours-bloc2 bg-clip-text font-bold tracking-tight text-transparent"
          >
            Velito Cours
          </Link>
          <Link
            href="/parcours"
            aria-label="Parcours"
            className="text-sm font-medium text-cours-text-muted transition-colors hover:text-cours-accent"
          >
            📚<span className="hidden sm:inline"> Parcours</span>
          </Link>
          <Link
            href="/revision"
            aria-label="Révision du jour"
            className="text-sm font-medium text-cours-text-muted transition-colors hover:text-cours-accent"
          >
            🎯<span className="hidden sm:inline"> Révision</span>
          </Link>
        </div>

        <button
          type="button"
          disabled={enCours}
          onClick={() => startTransition(() => seDeconnecterAction())}
          className="rounded-lg border border-cours-border px-3 py-1.5 text-xs font-medium text-cours-text-muted transition-colors hover:border-cours-accent hover:text-cours-accent disabled:opacity-60"
        >
          {enCours ? "Déconnexion…" : "Déconnexion"}
        </button>
      </div>
    </header>
  );
}
