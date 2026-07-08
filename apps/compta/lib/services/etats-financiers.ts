/**
 * SERVICE ÉTATS FINANCIERS — bilan & compte de résultat, PUR (Bloc 5.4).
 *
 * À partir des lignes d'écriture (partie double) et du plan comptable, calcule
 * de façon 100 % déterministe :
 *  - le COMPTE DE RÉSULTAT (charges classe 6, produits classe 7, résultat) ;
 *  - le BILAN (actif = soldes débiteurs, passif = soldes créditeurs + résultat).
 *
 * Invariant prouvé (voir tests) : si toutes les écritures sont équilibrées,
 * le bilan l'est aussi (totalActif = totalPassif). Démonstration : la somme des
 * soldes (débit−crédit) sur TOUS les comptes vaut 0 ; en séparant bilan (1-5)
 * et résultat (6-7), on montre que résultat = solde net des comptes de bilan,
 * ce qui referme l'équilibre.
 *
 * Tous les montants sont en CENTIMES. Aucun arrondi introduit.
 * ⚠️ États INDICATIFS de pré-comptabilité — à valider par l'expert-comptable.
 */
import type { LigneEcriture, Compte } from "@/types/database";

export interface LigneEtat {
  numero: string;
  libelle: string;
  montant: number; // centimes
}

export interface CompteDeResultat {
  detailCharges: LigneEtat[];
  detailProduits: LigneEtat[];
  totalCharges: number;
  totalProduits: number;
  resultat: number; // produits − charges (négatif = perte)
}

export interface Bilan {
  actif: LigneEtat[];
  passif: LigneEtat[]; // inclut la ligne « Résultat de l'exercice »
  totalActif: number;
  totalPassif: number;
  resultat: number;
  equilibre: boolean;
}

/** Somme des débits/crédits par compte. */
function soldesParCompte(lignes: LigneEcriture[]): Map<string, { debit: number; credit: number }> {
  const m = new Map<string, { debit: number; credit: number }>();
  for (const l of lignes) {
    const acc = m.get(l.compte_id) ?? { debit: 0, credit: 0 };
    acc.debit += l.debit_centimes;
    acc.credit += l.credit_centimes;
    m.set(l.compte_id, acc);
  }
  return m;
}

export function compteDeResultat(
  lignes: LigneEcriture[],
  comptes: Compte[],
): CompteDeResultat {
  const soldes = soldesParCompte(lignes);
  const detailCharges: LigneEtat[] = [];
  const detailProduits: LigneEtat[] = [];
  let totalCharges = 0;
  let totalProduits = 0;

  for (const c of comptes) {
    const s = soldes.get(c.id) ?? { debit: 0, credit: 0 };
    if (c.classe === 6) {
      const montant = s.debit - s.credit; // charge = solde débiteur
      if (montant !== 0) {
        detailCharges.push({ numero: c.numero, libelle: c.libelle, montant });
        totalCharges += montant;
      }
    } else if (c.classe === 7) {
      const montant = s.credit - s.debit; // produit = solde créditeur
      if (montant !== 0) {
        detailProduits.push({ numero: c.numero, libelle: c.libelle, montant });
        totalProduits += montant;
      }
    }
  }

  return {
    detailCharges,
    detailProduits,
    totalCharges,
    totalProduits,
    resultat: totalProduits - totalCharges,
  };
}

export function bilan(lignes: LigneEcriture[], comptes: Compte[]): Bilan {
  const soldes = soldesParCompte(lignes);
  const actif: LigneEtat[] = [];
  const passif: LigneEtat[] = [];
  let totalActif = 0;
  let totalPassifHorsResultat = 0;

  for (const c of comptes) {
    if (c.classe === 6 || c.classe === 7) continue; // comptes de résultat
    const s = soldes.get(c.id) ?? { debit: 0, credit: 0 };
    const solde = s.debit - s.credit;
    if (solde > 0) {
      actif.push({ numero: c.numero, libelle: c.libelle, montant: solde });
      totalActif += solde;
    } else if (solde < 0) {
      const montant = -solde;
      passif.push({ numero: c.numero, libelle: c.libelle, montant });
      totalPassifHorsResultat += montant;
    }
  }

  const resultat = compteDeResultat(lignes, comptes).resultat;
  // Le résultat va au passif (capitaux). Une perte (négatif) réduit le passif.
  passif.push({ numero: "120", libelle: "Résultat de l'exercice", montant: resultat });
  const totalPassif = totalPassifHorsResultat + resultat;

  return {
    actif,
    passif,
    totalActif,
    totalPassif,
    resultat,
    equilibre: totalActif === totalPassif,
  };
}

/** Une ligne de balance générale : cumuls et solde d'un compte. */
export interface LigneBalance {
  numero: string;
  libelle: string;
  totalDebit: number; // centimes
  totalCredit: number; // centimes
  solde: number; // débit - crédit (signé)
}

export interface Balance {
  lignes: LigneBalance[];
  totalDebit: number;
  totalCredit: number;
  equilibre: boolean; // total débit = total crédit (invariant partie double)
}

/**
 * Balance générale : pour chaque compte mouvementé, le total des débits, des
 * crédits et le solde. Le total débit doit égaler le total crédit (invariant
 * de la partie double). Triée par numéro de compte.
 */
export function balanceGenerale(
  lignes: LigneEcriture[],
  comptes: Compte[],
): Balance {
  const soldes = soldesParCompte(lignes);
  const parId = new Map(comptes.map((c) => [c.id, c]));

  const out: LigneBalance[] = [];
  let totalDebit = 0;
  let totalCredit = 0;

  for (const [compteId, s] of soldes) {
    if (s.debit === 0 && s.credit === 0) continue;
    const c = parId.get(compteId);
    out.push({
      numero: c?.numero ?? "??",
      libelle: c?.libelle ?? "Compte inconnu",
      totalDebit: s.debit,
      totalCredit: s.credit,
      solde: s.debit - s.credit,
    });
    totalDebit += s.debit;
    totalCredit += s.credit;
  }

  out.sort((a, b) => (a.numero < b.numero ? -1 : a.numero > b.numero ? 1 : 0));

  return { lignes: out, totalDebit, totalCredit, equilibre: totalDebit === totalCredit };
}
