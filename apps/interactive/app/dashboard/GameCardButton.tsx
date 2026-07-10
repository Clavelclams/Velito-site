"use client";

/**
 * <GameCardButton /> — bouton de card de jeu avec feedback de lancement.
 *
 * Retour playtest 07/2026 : "la card bug, pas cliquable, un délai s'opère
 * avant la salle d'attente". En réalité le clic déclenchait bien la Server
 * Action (auth + vérif abonnement + génération de code + insert session)
 * mais SANS AUCUN retour visuel pendant la latence réseau → l'hôte
 * re-cliquait en croyant au bug.
 *
 * useFormStatus lit l'état du <form> parent (le composant DOIT être rendu
 * à l'intérieur du form — c'est la règle de ce hook React) :
 *  - pending = true pendant toute l'exécution de la Server Action
 *  - on désactive le bouton (fini le double-submit qui créait 2 sessions)
 *  - on affiche un overlay "Création de la salle…" immédiatement
 */
import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

export default function GameCardButton({
  className,
  children,
}: {
  className: string;
  children: ReactNode;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={className + (pending ? " pointer-events-none" : "")}
    >
      {children}
      {pending && (
        <span className="absolute inset-0 z-10 grid place-items-center bg-ink/70 backdrop-blur-[2px]">
          <span className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/[0.06] px-4 py-2 font-display text-sm font-black text-white">
            <span
              aria-hidden="true"
              className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white"
            />
            Création de la salle…
          </span>
        </span>
      )}
    </button>
  );
}
