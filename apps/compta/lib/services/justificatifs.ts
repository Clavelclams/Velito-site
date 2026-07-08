/**
 * SERVICE JUSTIFICATIFS — couche logique métier (fonctions pures).
 *
 * Deux responsabilités, sans accès base :
 *  1. VALIDER un fichier avant upload (type MIME, taille) et construire son
 *     chemin de stockage selon la convention {entite}/{transaction}/{fichier} ;
 *  2. DÉTECTER les transactions sans justificatif (audit / contrôle fiscal).
 * Testable unitairement (voir justificatifs.test.ts).
 */
import type { Transaction } from "@/types/database";

/** Types acceptés : photos de tickets + PDF de factures. Rien d'exécutable. */
export const TYPES_MIME_AUTORISES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;

/** Taille max : 10 Mo. Un ticket photographié dépasse rarement 3-4 Mo. */
export const TAILLE_MAX_OCTETS = 10 * 1024 * 1024;

export type Resultat<T> =
  | { ok: true; valeur: T }
  | { ok: false; erreurs: string[] };

export function estTypeMimeAutorise(mime: string): boolean {
  return (TYPES_MIME_AUTORISES as readonly string[]).includes(mime);
}

export function estTailleValide(octets: number): boolean {
  return Number.isFinite(octets) && octets > 0 && octets <= TAILLE_MAX_OCTETS;
}

/**
 * Assainit un nom de fichier pour un chemin de stockage sûr : on garde
 * lettres/chiffres/point/tiret, on remplace le reste par « _ », et on borne
 * la longueur. Évite les caractères qui casseraient une clé Storage ou
 * ouvriraient un traversal (« ../ »).
 */
export function assainirNomFichier(nom: string): string {
  const base = nom
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // enlève les accents
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^[._]+/, "") // pas de point/underscore de tête (fichiers cachés / ..)
    .slice(0, 80);
  return base || "fichier";
}

/**
 * Construit le chemin de stockage. Le préfixe temporel rend le nom unique
 * (deux « ticket.jpg » ne s'écrasent pas) et respecte l'unicité SQL de
 * justificatif.chemin_stockage. Le 1er segment (entiteId) pilote la RLS Storage.
 */
export function construireCheminStockage(
  entiteId: string,
  transactionId: string,
  nomFichier: string,
): string {
  return `${entiteId}/${transactionId}/${Date.now()}-${assainirNomFichier(nomFichier)}`;
}

/** Valide un fichier (type + taille) avant tout upload. */
export function validerFichier(fichier: {
  type: string;
  taille: number;
}): Resultat<true> {
  const erreurs: string[] = [];
  if (!estTypeMimeAutorise(fichier.type)) {
    erreurs.push("Format non accepté : seuls les images (JPEG, PNG, WebP) et PDF sont autorisés.");
  }
  if (!estTailleValide(fichier.taille)) {
    erreurs.push(`Fichier trop volumineux (max ${Math.round(TAILLE_MAX_OCTETS / 1024 / 1024)} Mo).`);
  }
  return erreurs.length > 0 ? { ok: false, erreurs } : { ok: true, valeur: true };
}

/**
 * Renvoie les transactions qui n'ont AUCUN justificatif.
 * @param idsAvecJustificatif ensemble des transaction_id ayant ≥ 1 pièce.
 * Le calcul (le "LEFT JOIN ... IS NULL") se fait ici, en mémoire, à partir de
 * deux listes chargées séparément — pas de jointure SQL à écrire.
 */
export function transactionsSansJustificatif(
  transactions: Transaction[],
  idsAvecJustificatif: Set<string>,
): Transaction[] {
  return transactions.filter((t) => !idsAvecJustificatif.has(t.id));
}
