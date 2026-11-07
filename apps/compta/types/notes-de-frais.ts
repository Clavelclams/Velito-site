/**
 * Types TypeScript miroir de sql/12_notes_de_frais.sql (07/11/2026).
 *
 * Même règle que types/database.ts : noms de colonnes en snake_case, reflet
 * exact de la base. Fichier séparé le temps de l'intégration : à fusionner
 * dans types/database.ts (bloc « sql/12 ») quand le module sera relu.
 */

/** Miroir du CHECK sur note_frais.statut. */
export type StatutNoteFrais = "brouillon" | "a_verifier" | "validee" | "remboursee" | "refusee" | "abandonnee";

/** Miroir du CHECK sur note_frais_ligne.origine. */
export type OrigineLigne = "saisie" | "operation" | "ik";

export interface NoteFrais {
  id: string;
  entite_id: string;
  /** NDF-AAAA-NNN, attribué par la base (trigger), jamais par l'app. */
  numero: string;
  annee_numero: number;
  rang: number;
  beneficiaire: string;
  objet: string;
  date_note: string;
  statut: StatutNoteFrais;
  motif_refus: string | null;
  date_renonciation: string | null;
  contribution_id: string | null;
  transaction_remboursement_id: string | null;
  virement_id: string | null;
  correction_de: string | null;
  commentaire: string | null;
  cree_le: string;
  modifie_le: string;
}

/** DTO de création : numéro, statut et liens de règlement sont gérés ailleurs. */
export interface NouvelleNoteFrais {
  entite_id: string;
  beneficiaire: string;
  objet: string;
  date_note: string;
  commentaire: string | null;
  correction_de?: string | null;
}

export interface LigneNoteFrais {
  id: string;
  entite_id: string;
  note_id: string;
  origine: OrigineLigne;
  date_depense: string;
  libelle: string;
  categorie_id: string | null;
  montant_ttc_centimes: number;
  transaction_id: string | null;
  trajet_id: string | null;
  cree_le: string;
  modifie_le: string;
}

export type NouvelleLigneNoteFrais = Omit<LigneNoteFrais, "id" | "cree_le" | "modifie_le">;

export interface TrajetIk {
  id: string;
  entite_id: string;
  beneficiaire: string;
  date_trajet: string;
  depart: string;
  arrivee: string;
  motif: string;
  /** numeric(8,2) : arrive en nombre (API) ou en texte (pilote Postgres). */
  distance_km: number | string;
  /** Case informative : la distance saisie est déjà la distance réelle totale. */
  aller_retour: boolean;
  /** Taux en dix-millièmes d'euro par km (0,6360 €/km = 6360), saisi par l'association. */
  taux_km_dixmillimes: number;
  montant_centimes: number;
  commentaire: string | null;
  cree_le: string;
  modifie_le: string;
}

export type NouveauTrajetIk = Omit<TrajetIk, "id" | "cree_le" | "modifie_le" | "distance_km"> & {
  /** Envoyé en texte (« 12.35 ») : aucun flottant ne transporte la distance. */
  distance_km: string;
};
