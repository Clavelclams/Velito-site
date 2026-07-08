/**
 * SERVICE PONT PARTIE SIMPLE → PARTIE DOUBLE — couche métier, PURE.
 *
 * Transforme une transaction (recette/dépense, montants TTC + TVA) en les
 * LIGNES d'une écriture comptable ÉQUILIBRÉE. C'est le cœur intellectuel du
 * Bloc 5.2 : à partir d'un flux « bancaire » simple, on reconstitue la double
 * écriture normalisée (débit/crédit sur des comptes PCG).
 *
 * Schémas d'écriture appliqués :
 *
 *   DÉPENSE TTC=120, TVA=20 (HT=100), réglée par banque :
 *     débit  606xx (charge)        100
 *     débit  44566 (TVA déductible) 20
 *     crédit 512   (banque)             120
 *
 *   RECETTE TTC=240, TVA=40 (HT=200), encaissée en banque :
 *     débit  512   (banque)        240
 *     crédit 706xx (produit)            200
 *     crédit 44571 (TVA collectée)       40
 *
 * Sans TVA, la ligne de TVA disparaît. L'équilibre est garanti par
 * construction (Σdébit = Σcrédit = TTC) et re-vérifié par validerEcriture.
 * Pur → testable, et le résultat est prêt pour le repository (Bloc 5.2 suite).
 */
import type { Transaction } from "@/types/database";
import {
  validerEcriture,
  type LigneSaisie,
  type Resultat,
} from "@/lib/services/comptabilite";

/**
 * Identifiants des comptes à mobiliser, résolus par l'appelant (repository)
 * à partir du plan comptable de l'entité et de la catégorie de la transaction.
 * Le générateur ne connaît PAS la base : on lui passe des ids déjà résolus.
 */
export interface ComptesResolus {
  /** 512 — banque (contrepartie de trésorerie). */
  banqueId: string;
  /** Charge (6xx) pour une dépense, produit (7xx) pour une recette. */
  contrepartieId: string;
  /** 44566 — requis si dépense avec TVA. */
  tvaDeductibleId?: string;
  /** 44571 — requis si recette avec TVA. */
  tvaCollecteeId?: string;
}

const debit = (compteId: string, montant: number): LigneSaisie => ({
  compteId,
  debitCentimes: montant,
  creditCentimes: 0,
});
const credit = (compteId: string, montant: number): LigneSaisie => ({
  compteId,
  debitCentimes: 0,
  creditCentimes: montant,
});

/**
 * Génère les lignes équilibrées de l'écriture correspondant à une transaction.
 * Renvoie une erreur si un compte de TVA manque alors que la transaction en
 * porte (on refuse de fabriquer une écriture bancale plutôt que de deviner).
 */
export function genererLignesEcriture(
  transaction: Pick<
    Transaction,
    "type" | "montant_ttc_centimes" | "montant_tva_centimes"
  >,
  comptes: ComptesResolus,
): Resultat<LigneSaisie[]> {
  const ttc = transaction.montant_ttc_centimes;
  const tva = transaction.montant_tva_centimes;
  const ht = ttc - tva;
  const lignes: LigneSaisie[] = [];

  if (transaction.type === "depense") {
    // Charges + TVA déductible au débit ; banque au crédit.
    if (ht > 0) lignes.push(debit(comptes.contrepartieId, ht));
    if (tva > 0) {
      if (!comptes.tvaDeductibleId) {
        return { ok: false, erreurs: ["Compte de TVA déductible (44566) manquant."] };
      }
      lignes.push(debit(comptes.tvaDeductibleId, tva));
    }
    lignes.push(credit(comptes.banqueId, ttc));
  } else {
    // Banque au débit ; produits + TVA collectée au crédit.
    lignes.push(debit(comptes.banqueId, ttc));
    if (ht > 0) lignes.push(credit(comptes.contrepartieId, ht));
    if (tva > 0) {
      if (!comptes.tvaCollecteeId) {
        return { ok: false, erreurs: ["Compte de TVA collectée (44571) manquant."] };
      }
      lignes.push(credit(comptes.tvaCollecteeId, tva));
    }
  }

  // Ceinture + bretelles : on repasse par la validation d'équilibre générale.
  return validerEcriture(lignes);
}

/**
 * Numéros PCG mobilisés par la génération automatique (comptes par défaut).
 * Le mapping fin catégorie → compte précis viendra plus tard ; pour l'instant
 * on classe toute dépense en 606 et toute recette en 706.
 */
export const NUMEROS_PONT = {
  banque: "512",
  tvaDeductible: "44566",
  tvaCollectee: "44571",
  chargeDefaut: "606",
  produitDefaut: "706",
} as const;

export interface EcritureConstruite {
  journal: string;
  lignes: LigneSaisie[];
}

/**
 * Construit l'écriture complète (journal + lignes équilibrées) à partir d'une
 * transaction et du plan comptable de l'entité (map numéro → id de compte).
 * Renvoie une erreur si un compte indispensable manque (ex : PCG non initialisé)
 * — l'appelant décide alors d'ignorer la génération sans bloquer la transaction.
 */
export function construireEcritureDepuisTransaction(
  transaction: Pick<
    Transaction,
    "type" | "montant_ttc_centimes" | "montant_tva_centimes"
  >,
  compteIdParNumero: Map<string, string>,
  contrepartieCompteId?: string | null,
): Resultat<EcritureConstruite> {
  const banqueId = compteIdParNumero.get(NUMEROS_PONT.banque);
  if (!banqueId) {
    return { ok: false, erreurs: ["Plan comptable non initialisé (compte 512 manquant)."] };
  }

  // Contrepartie : le compte lié à la catégorie s'il est défini, sinon le
  // compte par défaut (dépense→606, recette→706). C'est le mapping fin.
  const numeroContrepartie =
    transaction.type === "depense" ? NUMEROS_PONT.chargeDefaut : NUMEROS_PONT.produitDefaut;
  const contrepartieId =
    contrepartieCompteId ?? compteIdParNumero.get(numeroContrepartie);
  if (!contrepartieId) {
    return { ok: false, erreurs: [`Compte ${numeroContrepartie} manquant dans le plan comptable.`] };
  }

  const lignesRes = genererLignesEcriture(transaction, {
    banqueId,
    contrepartieId,
    tvaDeductibleId: compteIdParNumero.get(NUMEROS_PONT.tvaDeductible),
    tvaCollecteeId: compteIdParNumero.get(NUMEROS_PONT.tvaCollectee),
  });
  if (!lignesRes.ok) return lignesRes;

  const journal = transaction.type === "depense" ? "ACH" : "VEN";
  return { ok: true, valeur: { journal, lignes: lignesRes.valeur } };
}
