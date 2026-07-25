/**
 * Helpers d'affichage partagés (admin + page publique).
 * Purs et testés — et surtout écrits UNE fois au lieu d'être dupliqués
 * dans chaque page (le bug classique : on corrige l'un, on oublie l'autre).
 */

/** Nom humain d'un round : "Finale", "Demi-finales", "Quarts de finale", "Round N". */
export function nomRound(round: number, nbRounds: number): string {
  if (round === nbRounds) return "Finale";
  if (round === nbRounds - 1) return "Demi-finales";
  if (round === nbRounds - 2) return "Quarts de finale";
  return `Round ${round}`;
}
