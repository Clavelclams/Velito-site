/**
 * SERVICE « À TRAITER » — classer et valider les lignes importées (07/11/2026).
 * Fonctions PURES : aucune base. L'action exécute ce que ce service décide.
 *
 * Trois gestes sur une ligne non validée :
 *  - classer : choisir la catégorie (ou la retirer) → « À valider » (ou « À classer ») ;
 *  - valider : la ligne est vérifiée (relevé, justificatif) → « Validé » ;
 *  - virement interne : ce n'était ni une recette ni une dépense de
 *    l'association, mais un mouvement entre deux de ses comptes (retrait
 *    d'espèces vers la caisse, dépôt de la caisse en banque…).
 *
 * Règles reprises du Lot 6 : on ne valide pas une ligne dont on ignore la
 * nature ; une catégorie recette ne classe pas une dépense ; un virement ne
 * se classe pas, il est neutre pour l'association.
 */
import type { Categorie, NouvelleTransaction, StatutTransaction, Transaction } from "@/types/database";
import { COMMENTAIRE_MAX } from "@/lib/services/transactions";

type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

export interface ChampsClassement {
  categorie_id: string | null;
  statut: StatutTransaction;
  commentaire: string | null;
}

/** Lignes à traiter : non validées, hors virements. « À classer » d'abord, puis par date. */
export function lignesATraiter<T extends Pick<Transaction, "statut" | "virement_id" | "date_transaction">>(tx: T[]): T[] {
  const rang = (s: StatutTransaction) => (s === "a_classer" ? 0 : 1);
  return tx
    .filter((t) => t.statut !== "validee" && !t.virement_id)
    .sort((a, b) => rang(a.statut) - rang(b.statut) || a.date_transaction.localeCompare(b.date_transaction));
}

export function preparerClassement(
  tx: Pick<Transaction, "type" | "virement_id" | "categorie_id" | "commentaire">,
  categorie: Pick<Categorie, "id" | "type"> | null,
  geste: "classer" | "valider",
  commentaire?: string,
): Resultat<ChampsClassement> {
  if (tx.virement_id) return { ok: false, erreur: "Un virement interne ne se classe pas." };
  if (categorie && categorie.type !== tx.type) {
    return {
      ok: false,
      erreur: tx.type === "recette" ? "Cette ligne est une recette : choisis une catégorie de recette." : "Cette ligne est une dépense : choisis une catégorie de dépense.",
    };
  }
  if (geste === "valider" && !categorie) {
    return { ok: false, erreur: "Choisis d'abord la catégorie : on ne valide pas une ligne dont on ignore la nature." };
  }
  let note = tx.commentaire;
  if (commentaire !== undefined) {
    const propre = commentaire.trim();
    if (propre.length > COMMENTAIRE_MAX) return { ok: false, erreur: `Commentaire trop long (${COMMENTAIRE_MAX} caractères au plus).` };
    note = propre || null;
  }
  return {
    ok: true,
    valeur: {
      categorie_id: categorie?.id ?? null,
      statut: geste === "valider" ? "validee" : categorie ? "a_verifier" : "a_classer",
      commentaire: note,
    },
  };
}

export interface ConversionVirement {
  /** Ce que devient la ligne existante : la jambe sur son propre compte. */
  majOriginale: {
    categorie_id: null;
    statut: "validee";
    virement_id: string;
    montant_tva_centimes: 0;
    commentaire: string;
  };
  /** La jambe opposée, à créer sur l'autre compte. */
  contrepartie: NouvelleTransaction;
}

/**
 * Transforme une ligne en virement interne. La ligne existante devient une
 * jambe (elle garde sa clé d'import : réimporter le relevé ne la recrée pas) ;
 * l'autre jambe est créée sur l'autre compte, en sens inverse.
 * Une dépense sur le compte A devient A → B ; une recette sur A devient B → A.
 */
export function preparerConversionVirement(
  tx: Pick<Transaction, "entite_id" | "type" | "virement_id" | "compte_tresorerie_id" | "date_transaction" | "libelle" | "montant_ttc_centimes" | "commentaire">,
  autreCompteId: string,
  virementId: string,
): Resultat<ConversionVirement> {
  if (tx.virement_id) return { ok: false, erreur: "Cette ligne est déjà un virement interne." };
  if (!tx.compte_tresorerie_id) return { ok: false, erreur: "Indique d'abord sur quel compte cette ligne est passée." };
  if (!autreCompteId) return { ok: false, erreur: "Choisis l'autre compte." };
  if (autreCompteId === tx.compte_tresorerie_id) return { ok: false, erreur: "Un virement interne relie deux comptes différents." };

  const note = [tx.commentaire, "Transformée en virement interne (ni recette ni dépense de l'association)."]
    .filter(Boolean)
    .join(" ")
    .slice(0, COMMENTAIRE_MAX);

  return {
    ok: true,
    valeur: {
      majOriginale: { categorie_id: null, statut: "validee", virement_id: virementId, montant_tva_centimes: 0, commentaire: note },
      contrepartie: {
        entite_id: tx.entite_id,
        categorie_id: null,
        type: tx.type === "depense" ? "recette" : "depense",
        statut: "validee",
        date_transaction: tx.date_transaction,
        libelle: tx.libelle,
        montant_ttc_centimes: tx.montant_ttc_centimes,
        montant_tva_centimes: 0,
        compte_tresorerie_id: autreCompteId,
        virement_id: virementId,
        commentaire: "Jambe créée en transformant une ligne importée en virement interne.",
      },
    },
  };
}
