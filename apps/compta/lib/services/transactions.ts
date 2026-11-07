/**
 * SERVICE TRANSACTIONS — couche logique métier.
 *
 * Rôle : transformer une SAISIE utilisateur (des chaînes : "12,50", une date,
 * un libellé…) en un DTO propre prêt pour la base, OU en une liste d'erreurs
 * lisibles. Fonction pure → testable sans base (voir transactions.test.ts).
 *
 * C'est ICI que se fait la conversion euros → centimes, en déléguant à
 * montants.ts (le SEUL endroit qui manipule cette frontière). La page ne
 * calcule jamais un montant, elle passe des chaînes au service.
 *
 * Toutes les validations sont le MIROIR applicatif des contraintes SQL de
 * la table transaction (montant > 0, TVA ≤ TTC, libellé 1..255) : on renvoie
 * un message clair AVANT l'insert ; la base reste le dernier rempart.
 */
import type { NouvelleTransaction, StatutTransaction, TypeFlux } from "@/types/database";
import {
  eurosVersCentimes,
  estMontantValide,
  estTvaCoherente,
} from "@/lib/services/montants";

/** Résultat de validation discriminé par `ok` (même convention que categories). */
export type Resultat<T> =
  | { ok: true; valeur: T }
  | { ok: false; erreurs: string[] };

/** Longueur max d'un libellé — miroir du CHECK SQL char_length ≤ 255. */
export const LIBELLE_MAX = 255;

/** Forme brute reçue du formulaire (tout est chaîne — c'est ce que tape l'humain). */
export interface SaisieTransaction {
  entiteId: string;
  categorieId: string | null;
  type: string;
  dateTransaction: string; // attendu "AAAA-MM-JJ" (input type=date)
  libelle: string;
  montantTtc: string; // "12,50"
  montantTva: string; // "" ou "2,50" → 0 par défaut
  /** [07/11/2026] Lot 6 — optionnels : une saisie simple reste valide. */
  compteId?: string | null; // compte réel ("" ou null = inconnu)
  statut?: string; // "" = déduit (classée → validée, sinon à classer)
  commentaire?: string;
}

/** Longueur max d'un commentaire — miroir du CHECK SQL (sql/06). */
export const COMMENTAIRE_MAX = 1000;

function estTypeFluxValide(v: string): v is TypeFlux {
  return v === "recette" || v === "depense";
}

/** Une date "AAAA-MM-JJ" est-elle réelle (pas juste bien formée) ? */
function estDateValide(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  const d = new Date(iso + "T00:00:00Z");
  // Round-trip : Date accepte "2026-02-31" en le décalant → on vérifie que
  // la date reconstruite est identique à la saisie (donc qu'elle existe).
  return d.toISOString().slice(0, 10) === iso;
}

/**
 * Valide une saisie et prépare le DTO d'insertion.
 * `entiteId` vient du contexte (URL), pas d'un champ modifiable.
 */
export function preparerNouvelleTransaction(
  saisie: SaisieTransaction,
): Resultat<NouvelleTransaction> {
  const erreurs: string[] = [];

  // --- type ---
  if (!estTypeFluxValide(saisie.type)) {
    erreurs.push("Le type doit être « recette » ou « dépense ».");
  }

  // --- date ---
  if (!estDateValide(saisie.dateTransaction)) {
    erreurs.push("La date est obligatoire et doit être une date réelle.");
  }

  // --- libellé ---
  const libelle = (saisie.libelle ?? "").trim();
  if (libelle.length === 0) {
    erreurs.push("Le libellé est obligatoire.");
  } else if (libelle.length > LIBELLE_MAX) {
    erreurs.push(`Le libellé ne peut pas dépasser ${LIBELLE_MAX} caractères.`);
  }

  // --- montant TTC ---
  const ttc = eurosVersCentimes(saisie.montantTtc ?? "");
  if (ttc === null || !estMontantValide(ttc)) {
    erreurs.push("Le montant TTC est obligatoire et doit être supérieur à 0.");
  }

  // --- montant TVA (0 par défaut si vide) ---
  const tvaBrut = (saisie.montantTva ?? "").trim();
  const tva = tvaBrut === "" ? 0 : eurosVersCentimes(tvaBrut);
  if (tva === null) {
    erreurs.push("La TVA doit être un montant valide (ou vide pour 0).");
  }

  // --- cohérence TVA ≤ TTC (seulement si les deux montants sont exploitables) ---
  if (ttc !== null && tva !== null && !estTvaCoherente(tva, ttc)) {
    erreurs.push("La TVA ne peut pas dépasser le montant TTC.");
  }

  // --- [07/11/2026] statut (règle Nova : on ne valide pas une ligne non classée) ---
  const categorieId = saisie.categorieId || null;
  const statutBrut = (saisie.statut ?? "").trim();
  let statut: StatutTransaction;
  if (statutBrut === "") {
    // Pas de choix explicite : une ligne classée est validée (saisie manuelle
    // d'une dépense connue), une ligne sans catégorie reste à classer.
    statut = categorieId ? "validee" : "a_classer";
  } else if (statutBrut === "a_classer" || statutBrut === "a_verifier" || statutBrut === "validee") {
    statut = statutBrut;
  } else {
    erreurs.push("Statut inconnu.");
    statut = "a_classer";
  }
  if (statut === "validee" && !categorieId) {
    erreurs.push("Une opération validée doit avoir une catégorie : choisis-en une, ou laisse-la « À classer ».");
  }

  // --- commentaire ---
  const commentaire = (saisie.commentaire ?? "").trim();
  if (commentaire.length > COMMENTAIRE_MAX) {
    erreurs.push(`Le commentaire ne peut pas dépasser ${COMMENTAIRE_MAX} caractères.`);
  }

  if (erreurs.length > 0) {
    return { ok: false, erreurs };
  }

  return {
    ok: true,
    valeur: {
      entite_id: saisie.entiteId,
      categorie_id: categorieId,
      statut,
      compte_tresorerie_id: saisie.compteId || null,
      commentaire: commentaire || null,
      type: saisie.type as TypeFlux,
      date_transaction: saisie.dateTransaction,
      libelle,
      // Non-null assertions sûres : on n'arrive ici que si erreurs est vide.
      montant_ttc_centimes: ttc as number,
      montant_tva_centimes: tva as number,
    },
  };
}
