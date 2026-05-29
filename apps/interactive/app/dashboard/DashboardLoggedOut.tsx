/**
 * DashboardLoggedOut — écran d'invitation à la connexion sur /dashboard.
 *
 * UX (refonte 30/05/2026) : volontairement PAS de B2B "Espace animateur".
 * Le visiteur qui clique "Jouer" sur la landing arrive ici. On veut un
 * message accueillant qui le pousse à s'inscrire OU se connecter, pas un
 * terme métier qui peut le faire fuir.
 *
 * 2 chemins offerts :
 *   - Créer un compte (signup local Interactive — flow email/mdp ou "Continuer avec VENA")
 *   - Se connecter (si user déjà inscrit)
 *
 * Le composant <ContinueWithVena /> (@repo/ui) lit l'URL courante côté
 * navigateur et la passe en `?return=` au hub. Au retour, l'user revient
 * EXACTEMENT ici, et avec sa session ouverte → bascule sur le vrai dashboard.
 */
"use client";

import Link from "next/link";
import { ContinueWithVena } from "@repo/ui/continue-with-vena";

export default function DashboardLoggedOut() {
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
        Bienvenue
      </p>
      <h1 className="neon-title mt-3 text-4xl md:text-5xl">
        Anime ta première soirée
      </h1>
      <p className="mt-4 max-w-md text-sm text-white/60">
        Connecte-toi pour lancer une session, choisir ton jeu et faire jouer
        ton public depuis leur téléphone. Un seul compte pour toutes les apps Velito.
      </p>

      {/* CTA principal : continuer avec VENA (OAuth-style) */}
      <div className="mt-8">
        <ContinueWithVena hubUrl={hubUrl} />
      </div>

      {/* Séparateur "ou" */}
      <div className="my-6 flex w-full max-w-xs items-center gap-3">
        <div className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] uppercase tracking-widest text-white/40">ou</span>
        <div className="h-px flex-1 bg-white/10" />
      </div>

      {/* CTA secondaires : signup (compte nouveau) + login (compte existant) */}
      <div className="flex w-full max-w-xs flex-col gap-2">
        <Link
          href="/signup"
          className="rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/[0.06]"
        >
          Créer un compte
        </Link>
        <Link
          href={hubUrl ? `${hubUrl}/login?return=${encodeURIComponent("/dashboard")}` : "#"}
          className="text-xs text-white/50 underline-offset-4 hover:text-white hover:underline"
        >
          J&apos;ai déjà un compte
        </Link>
      </div>
    </main>
  );
}
