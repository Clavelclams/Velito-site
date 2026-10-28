/**
 * stages.config.ts — Périodes de stage déjà prises (page /stages).
 *
 * C'EST LE SEUL FICHIER À MODIFIER quand une période se libère ou se prend.
 * Format d'une période : { debut: "AAAA-MM-JJ", fin: "AAAA-MM-JJ" }, dates
 * INCLUSES (le stagiaire est là le jour de début ET le jour de fin).
 * Après modification : commit + push, Vercel redéploie, la page est à jour.
 *
 * Les périodes déjà terminées ne s'affichent plus toutes seules (voir
 * periodesAVenir) : pas besoin de les supprimer, mais tu peux faire le ménage.
 *
 * [16/10/2026] Créé pour la page Stages. Volontairement un fichier et pas une
 * table : 3 ou 4 lignes par an, modifiées par une seule personne.
 */

export interface Periode {
  /** Premier jour du stage, format "AAAA-MM-JJ". */
  debut: string;
  /** Dernier jour du stage (inclus), format "AAAA-MM-JJ". */
  fin: string;
}

export const PERIODES_PRISES: Periode[] = [
  { debut: "2026-11-09", fin: "2026-11-29" },
  { debut: "2026-12-14", fin: "2026-12-18" },
  { debut: "2027-03-22", fin: "2027-04-18" },
];

/**
 * Deux périodes se chevauchent si chacune commence avant (ou le jour où)
 * l'autre finit. On compare des chaînes "AAAA-MM-JJ" : dans ce format,
 * l'ordre alphabétique est exactement l'ordre chronologique, donc pas besoin
 * de créer des objets Date (et aucun piège de fuseau horaire).
 *
 * Exemple : demande du 20 au 27 novembre, période prise du 9 au 29 novembre
 *   "2026-11-20" <= "2026-11-29" et "2026-11-09" <= "2026-11-27" → chevauchement.
 */
export function seChevauchent(a: Periode, b: Periode): boolean {
  return a.debut <= b.fin && b.debut <= a.fin;
}

/** Les périodes prises que la demande touche (liste vide = dates libres). */
export function periodesEnConflit(demande: Periode, prises: Periode[] = PERIODES_PRISES): Periode[] {
  return prises.filter((p) => seChevauchent(demande, p));
}

/** Les périodes pas encore terminées, triées par date (pour l'affichage). */
export function periodesAVenir(aujourdhui: string, prises: Periode[] = PERIODES_PRISES): Periode[] {
  return prises
    .filter((p) => p.fin >= aujourdhui)
    .sort((x, y) => x.debut.localeCompare(y.debut));
}

/** Vrai si la chaîne est une date réelle au format "AAAA-MM-JJ". */
export function estDateValide(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
}

/** "2026-11-09" → "9 novembre 2026" (affichage). */
export function dateEnFrancais(s: string): string {
  return new Date(`${s}T12:00:00Z`).toLocaleDateString("fr-FR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Paris",
  });
}

/** Date du jour à Paris au format "AAAA-MM-JJ" (le serveur Vercel est en UTC). */
export function aujourdhuiParis(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}
