/**
 * Âge et minorité à partir d'une ANNÉE de naissance seule.
 *
 * Pourquoi l'année et pas la date : minimisation RGPD (art. 5-1-c). Pour
 * décider si un joueur est mineur, l'année suffit — à condition d'accepter
 * une zone d'incertitude et de trancher toujours dans le sens de la
 * protection. C'est le choix fait ici, et c'est le point à défendre :
 *
 *   Un joueur né en 2008 a 17 ou 18 ans pendant toute l'année 2026 selon son
 *   jour de naissance, que nous ne connaissons pas. On le traite comme MINEUR
 *   toute l'année 2026 : il ne sera considéré majeur qu'en 2027, quand il
 *   aura 18 ans à coup sûr. Un majeur est donc parfois protégé un an de trop ;
 *   un mineur n'est jamais exposé un jour de trop.
 *
 * Même logique pour le seuil des 15 ans (âge du consentement numérique en
 * France, art. 45 de la loi Informatique et Libertés, transposant l'art. 8
 * du RGPD) : sous ce seuil, le consentement d'un titulaire de l'autorité
 * parentale est requis.
 *
 * Module pur, sans date implicite : `anneeCourante` est TOUJOURS passée par
 * l'appelant. Une fonction qui lit l'horloge elle-même est intestable et
 * change de résultat au 1er janvier sans que personne ne l'ait décidé.
 */

/** Âge de la majorité civile en France. */
export const AGE_MAJORITE = 18;

/** Âge du consentement numérique en France (loi Informatique et Libertés, art. 45). */
export const AGE_CONSENTEMENT_NUMERIQUE = 15;

/** Bornes de saisie : on ne fait pas jouer un nourrisson ni un centenaire. */
const AGE_MINIMAL_SAISIE = 4;
const AGE_MAXIMAL_SAISIE = 99;

/**
 * Âge que le joueur est CERTAIN d'avoir atteint pendant `anneeCourante` :
 * c'est l'âge qu'il avait au 1er janvier, donc le plus bas possible.
 * Né en 2008, en 2026 → 17 (il en aura 18 dans l'année, mais pas sûrement
 * aujourd'hui).
 */
export function ageCertain(anneeNaissance: number, anneeCourante: number): number {
  return anneeCourante - anneeNaissance - 1;
}

/** Mineur tant qu'on n'est pas CERTAIN qu'il a 18 ans. */
export function estMineur(anneeNaissance: number, anneeCourante: number): boolean {
  return ageCertain(anneeNaissance, anneeCourante) < AGE_MAJORITE;
}

/** Sous 15 ans certains : consentement parental obligatoire. */
export function consentementParentalRequis(
  anneeNaissance: number,
  anneeCourante: number
): boolean {
  return ageCertain(anneeNaissance, anneeCourante) < AGE_CONSENTEMENT_NUMERIQUE;
}

/**
 * Valide une année saisie dans un formulaire. Renvoie l'entier, ou null si
 * la saisie est vide, non numérique ou hors des bornes plausibles. Le
 * formulaire HTML fait déjà ce contrôle ; le serveur le refait parce qu'on
 * ne fait jamais confiance au navigateur.
 */
export function validerAnneeNaissance(
  saisie: string | null | undefined,
  anneeCourante: number
): number | null {
  const brut = (saisie ?? "").trim();
  if (!/^\d{4}$/.test(brut)) return null;
  const annee = Number(brut);
  const age = anneeCourante - annee;
  if (age < AGE_MINIMAL_SAISIE || age > AGE_MAXIMAL_SAISIE) return null;
  return annee;
}

/**
 * Les champs à écrire sur arena.joueurs pour une année donnée. Centralisé
 * pour que la règle « mineur ⇒ profil restreint » n'existe qu'à un endroit —
 * la contrainte SQL mineur_profil_restreint la garantit en base, ceci la
 * garantit dans le code AVANT d'atteindre la base.
 */
export function champsJoueurPourAnnee(
  anneeNaissance: number,
  anneeCourante: number
): { annee_naissance: number; est_mineur: boolean; profil_public: boolean } {
  const mineur = estMineur(anneeNaissance, anneeCourante);
  return {
    annee_naissance: anneeNaissance,
    est_mineur: mineur,
    // Un mineur n'apparaît dans AUCUN classement public : pas d'option.
    profil_public: !mineur,
  };
}
