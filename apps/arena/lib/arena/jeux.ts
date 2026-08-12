/**
 * Référentiel des jeux — V1 : liste maîtrisée dans le code + saisie libre.
 *
 * Problème réel constaté (tournoi test du 11/08 : "street fihter") : un champ
 * texte libre produit des typos qui cassent le regroupement des joueurs par
 * jeu. Solution V1 sans migration : un <datalist> (autocomplétion native,
 * zéro JavaScript) adossé à cette liste + normalisation côté serveur.
 * La table référentielle arena.jeux (migration 002) prendra le relais en V2.
 */

import { DISCIPLINES } from "./disciplines";

/**
 * La liste vient désormais de lib/arena/disciplines.ts, qui sert AUSSI à la
 * page d'accueil. Une seule source : impossible qu'une discipline soit
 * proposée à la création mais absente de la vitrine, ou l'inverse.
 * Elle couvre les deux verticales : sans « Padel » ici, la normalisation
 * laisserait passer « padel », « PADEL » et « Padel » comme trois disciplines
 * différentes.
 */
export const JEUX_SUGGERES: readonly string[] = DISCIPLINES.map((d) => d.jeu);

/**
 * Normalisation serveur : espaces propres + correction des saisies qui
 * matchent un jeu connu à la casse près. "street fighter 6" → "Street Fighter 6".
 * Une saisie inconnue reste telle quelle (on n'invente pas).
 */
export function normaliserJeu(saisie: string): string {
  const propre = saisie.trim().replace(/\s+/g, " ");
  const connu = JEUX_SUGGERES.find(
    (j) => j.toLowerCase() === propre.toLowerCase()
  );
  return connu ?? propre;
}
