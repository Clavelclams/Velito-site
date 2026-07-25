/**
 * Machine à états du cycle de vie d'un tournoi — LOGIQUE PURE, testée.
 *
 * Extraite de actions.ts pour être testable sans base de données (même
 * principe que lib/bracket.ts : les règles métier ne touchent jamais l'I/O).
 *
 * BROUILLON ⇄ OUVERT → EN_COURS → TERMINE
 *      ↘        ↘          ↘
 *              ANNULE (depuis tout état non terminal)
 *
 * NOTE : OUVERT → EN_COURS n'est PAS ici : ce passage se fait uniquement via
 * demarrerTournoi (qui génère le bracket), jamais par simple changement d'état.
 */
import type { StatutTournoi } from "./types";

const TRANSITIONS: Record<StatutTournoi, readonly StatutTournoi[]> = {
  BROUILLON: ["OUVERT", "ANNULE"],
  OUVERT: ["BROUILLON", "ANNULE"],
  EN_COURS: ["TERMINE", "ANNULE"],
  TERMINE: [],
  ANNULE: [],
};

export function transitionAutorisee(
  depuis: StatutTournoi,
  vers: StatutTournoi
): boolean {
  return TRANSITIONS[depuis].includes(vers);
}

/** Garde de validation : la valeur vient d'un FormData, on ne lui fait pas confiance. */
export function estStatutTournoi(valeur: string): valeur is StatutTournoi {
  return ["BROUILLON", "OUVERT", "EN_COURS", "TERMINE", "ANNULE"].includes(valeur);
}
