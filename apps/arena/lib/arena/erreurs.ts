/**
 * Traduction des erreurs Postgres / PostgREST en phrases pour le staff.
 *
 * Pourquoi : les Server Actions redirigent vers la page d'origine avec
 * `?erreur=<message>` (cf. actions.ts, redirectionErreur). Relayer
 * `error.message` tel quel y mettait des phrases comme « duplicate key value
 * violates unique constraint "participations_tournoi_id_joueur_id_key" » —
 * illisible pour le staff en plein tournoi, et une description gratuite de
 * la structure de la base dans l'URL (audit du 06/09/2026).
 *
 * Règle : le CODE SQLSTATE décide de la phrase, le message brut ne sort
 * jamais vers l'écran — l'appelant le journalise côté serveur.
 *
 * Module pur, testé : une mauvaise traduction se voit en test, pas le jour J.
 * Codes : https://www.postgresql.org/docs/current/errcodes-appendix.html
 */

export interface ErreurBase {
  code?: string | null;
  message?: string | null;
}

const PAR_CODE: Record<string, string> = {
  // Classe 23 — violations de contraintes d'intégrité
  "23505": "cette valeur existe déjà (doublon).",
  "23503": "l'élément lié n'existe plus (supprimé entre-temps ?). Recharge la page.",
  "23514": "valeur refusée par une règle de la base (hors bornes ou incohérente).",
  "23502": "un champ obligatoire est vide.",
  // Classe 22 — données invalides
  "22P02": "format de donnée invalide (identifiant ou nombre mal formé).",
  "22001": "texte trop long pour ce champ.",
  // Classe 42 — droits
  "42501": "droits insuffisants pour cette opération.",
  // PostgREST
  PGRST116: "élément introuvable, ou plusieurs éléments là où un seul était attendu.",
  // Classe 40 — concurrence
  "40001": "une autre modification a eu lieu en même temps. Réessaie.",
  "40P01": "une autre modification a eu lieu en même temps. Réessaie.",
};

/**
 * Phrase courte pour l'écran, précédée du contexte fourni par l'appelant
 * (« Inscription impossible », « Saisie impossible »…).
 */
export function messageErreurBase(erreur: ErreurBase | null | undefined, contexte: string): string {
  const code = erreur?.code ?? "";
  const traduction = PAR_CODE[code];
  if (traduction) return `${contexte} : ${traduction}`;
  // Code inconnu : on donne le code (utile pour signaler le bug) mais jamais
  // le message brut.
  return code
    ? `${contexte} : erreur technique (code ${code}). Réessaie ; si ça persiste, signale-le.`
    : `${contexte} : erreur technique. Réessaie ; si ça persiste, signale-le.`;
}
