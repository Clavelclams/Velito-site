/**
 * DashboardLoggedOut — écran d'invitation à la connexion sur /dashboard.
 *
 * Côté UX : on est sur le tableau de bord animateur, mais on n'a pas de session.
 * Plutôt que de rediriger sec vers /login, on garde le contexte (l'user voit
 * "Interactive" et comprend pourquoi on lui demande d'ouvrir un compte) et on
 * propose UN bouton clair : "Continuer avec VENA".
 *
 * Le composant ContinueWithVena (@repo/ui) lit l'URL courante côté navigateur
 * et la passe en `?return=` au hub. Au retour, l'user revient EXACTEMENT ici.
 *
 * Volontairement Client Component → ContinueWithVena est "use client" + il a
 * besoin de window.location.href. On reste minimal.
 */
"use client";

import { ContinueWithVena } from "@repo/ui/continue-with-vena";

export default function DashboardLoggedOut() {
  const hubUrl = process.env.NEXT_PUBLIC_HUB_URL;

  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 py-12 text-center">
      <p className="text-xs uppercase tracking-[0.3em] text-white/40">
        Espace animateur
      </p>
      <h1 className="neon-title mt-3 text-4xl md:text-5xl">Tableau de bord</h1>
      <p className="mt-4 max-w-md text-sm text-white/60">
        Pour lancer une session, consulter ton catalogue et tes stats, connecte-toi
        avec ton compte Velito. Un seul compte sert toutes les apps de l&apos;écosystème
        (Hub, VEA, Interactive…).
      </p>

      <div className="mt-8">
        <ContinueWithVena hubUrl={hubUrl} />
      </div>

      <p className="mt-6 text-xs text-white/40">
        Pas encore de compte ? Contacte Velito pour la phase pilote.
      </p>
    </main>
  );
}
