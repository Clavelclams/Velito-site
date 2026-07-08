/**
 * SERVICE COMPTABILITÉ (partie double) — couche logique métier, PURE.
 *
 * Règles de la comptabilité en partie double, indépendantes de la base :
 *  - une écriture est ÉQUILIBRÉE si Σdébits = Σcrédits (et > 0) ;
 *  - une ligne est SOIT au débit SOIT au crédit ;
 *  - la classe d'un compte = 1er chiffre du numéro (6/7 = résultat, 1-5 = bilan).
 * Miroir applicatif du trigger SQL (migration 04) : on refuse une écriture
 * déséquilibrée AVANT la base, avec un message clair. Testé unitairement.
 */

export type Resultat<T> =
  | { ok: true; valeur: T }
  | { ok: false; erreurs: string[] };

/** Une ligne d'écriture en saisie : un compte, un montant d'un seul côté. */
export interface LigneSaisie {
  compteId: string;
  debitCentimes: number;
  creditCentimes: number;
}

/** Compte du plan comptable de référence (seed). */
export interface CompteModele {
  numero: string;
  libelle: string;
  classe: number;
}

/** Classe PCG = 1er chiffre du numéro de compte. */
export function classeDeCompte(numero: string): number {
  return Number(numero.charAt(0));
}

/** Un compte de résultat (charges 6, produits 7) vs un compte de bilan (1-5). */
export function estCompteDeResultat(numero: string): boolean {
  const c = classeDeCompte(numero);
  return c === 6 || c === 7;
}

export function totalDebit(lignes: LigneSaisie[]): number {
  return lignes.reduce((s, l) => s + l.debitCentimes, 0);
}

export function totalCredit(lignes: LigneSaisie[]): number {
  return lignes.reduce((s, l) => s + l.creditCentimes, 0);
}

/** Une écriture est équilibrée si débit = crédit et le total est non nul. */
export function ecritureEstEquilibree(lignes: LigneSaisie[]): boolean {
  const d = totalDebit(lignes);
  const c = totalCredit(lignes);
  return d > 0 && d === c;
}

/**
 * Valide une écriture complète avant enregistrement :
 *  - au moins 2 lignes (une écriture a toujours une contrepartie) ;
 *  - chaque ligne a exactement UN côté renseigné, en entier positif ;
 *  - l'ensemble est équilibré.
 * Renvoie les lignes validées, ou la liste des problèmes.
 */
export function validerEcriture(lignes: LigneSaisie[]): Resultat<LigneSaisie[]> {
  const erreurs: string[] = [];

  if (lignes.length < 2) {
    erreurs.push("Une écriture doit avoir au moins deux lignes (débit et crédit).");
  }

  lignes.forEach((l, i) => {
    const d = l.debitCentimes;
    const c = l.creditCentimes;
    const entiers = Number.isSafeInteger(d) && Number.isSafeInteger(c) && d >= 0 && c >= 0;
    if (!entiers) {
      erreurs.push(`Ligne ${i + 1} : montants invalides.`);
      return;
    }
    const unSeulSens = (d > 0 && c === 0) || (c > 0 && d === 0);
    if (!unSeulSens) {
      erreurs.push(`Ligne ${i + 1} : renseigne le débit OU le crédit, pas les deux ni zéro.`);
    }
  });

  if (erreurs.length === 0 && !ecritureEstEquilibree(lignes)) {
    erreurs.push(
      `Écriture déséquilibrée : total débit ${totalDebit(lignes)} ≠ total crédit ${totalCredit(lignes)} (en centimes).`,
    );
  }

  return erreurs.length > 0 ? { ok: false, erreurs } : { ok: true, valeur: lignes };
}

/**
 * Plan comptable SIMPLIFIÉ de référence (commun asso + société). Source unique
 * pour un futur seed applicatif ; miroir de la liste commentée en SQL (04).
 * La classe est dérivée du numéro (cohérent avec le CHECK SQL).
 */
export const PCG_BASE: CompteModele[] = [
  { numero: "101", libelle: "Capital", classe: 1 },
  { numero: "106", libelle: "Réserves", classe: 1 },
  { numero: "120", libelle: "Résultat de l'exercice", classe: 1 },
  { numero: "218", libelle: "Matériel", classe: 2 },
  { numero: "401", libelle: "Fournisseurs", classe: 4 },
  { numero: "411", libelle: "Clients", classe: 4 },
  { numero: "44566", libelle: "TVA déductible", classe: 4 },
  { numero: "44571", libelle: "TVA collectée", classe: 4 },
  { numero: "512", libelle: "Banque", classe: 5 },
  { numero: "530", libelle: "Caisse", classe: 5 },
  { numero: "606", libelle: "Achats non stockés", classe: 6 },
  { numero: "613", libelle: "Locations", classe: 6 },
  { numero: "616", libelle: "Assurances", classe: 6 },
  { numero: "626", libelle: "Frais postaux et télécom", classe: 6 },
  { numero: "627", libelle: "Services bancaires", classe: 6 },
  { numero: "706", libelle: "Prestations de services", classe: 7 },
  { numero: "707", libelle: "Ventes de marchandises", classe: 7 },
  { numero: "740", libelle: "Subventions d'exploitation", classe: 7 },
  { numero: "756", libelle: "Cotisations", classe: 7 },
  { numero: "758", libelle: "Produits divers de gestion", classe: 7 },
];
