/**
 * Types TypeScript miroir du schéma SQL (sql/01_schema_noyau.sql).
 *
 * RÈGLE : ce fichier est le REFLET EXACT de la base — mêmes noms de colonnes
 * (snake_case, volontairement, alors que le reste du code est en camelCase) :
 * une ligne renvoyée par Supabase se range dans ces types SANS renommage.
 * Chaque renommage manuel serait une occasion de bug. Si une migration SQL
 * change une table, on change ce fichier dans le même commit.
 *
 * À noter pour le jury : les types unions ("recette" | "depense") sont le
 * pendant TypeScript des contraintes CHECK de la base. Double barrière :
 * TypeScript refuse à la COMPILATION ce que Postgres refuserait à l'EXÉCUTION.
 */

/** Sens d'une transaction — miroir du CHECK sur transaction.type et categorie.type. */
export type TypeFlux = "recette" | "depense";

/**
 * Cycle de vie d'une transaction — miroir du CHECK sur transaction.statut.
 * [07/11/2026] sql/06 ajoute « a_classer » (aucune catégorie encore).
 * Libellés affichés : a_classer = « À classer », a_verifier = « À valider »,
 * validee = « Validé » (voir LIBELLES_STATUT dans services/tresorerie).
 */
export type StatutTransaction = "a_classer" | "a_verifier" | "validee";

/** Nature d'un compte réel — miroir du CHECK sur compte_tresorerie.nature (sql/06). */
export type NatureCompte = "courant" | "livret" | "caisse" | "autre";

/** Forme juridique d'une entité — miroir du CHECK sur entite.type_juridique. */
export type TypeJuridique = "association" | "societe";

/** Profil applicatif (table utilisateur). 1-pour-1 avec auth.users. */
export interface Utilisateur {
  id: string; // uuid
  email: string;
  nom_affichage: string | null;
  cree_le: string; // timestamptz — arrive en ISO 8601 côté JS
}

/** Structure juridique gérée : VEA ou VENA (table entite). */
export interface Entite {
  id: string;
  proprietaire_id: string;
  nom: string;
  type_juridique: TypeJuridique;
  cree_le: string;
}

/** Poste de recette/dépense, propre à une entité (table categorie). */
export interface Categorie {
  id: string;
  entite_id: string;
  nom: string;
  type: TypeFlux;
  active: boolean;
  /** Compte PCG de rattachement (nullable) — pont partie double (sql/05). */
  compte_id: string | null;
  cree_le: string;
}

/** Une recette ou une dépense (table transaction) — le cœur du modèle. */
export interface Transaction {
  id: string;
  entite_id: string;
  categorie_id: string | null; // null = pas encore catégorisée (import CSV)
  type: TypeFlux;
  statut: StatutTransaction;
  date_transaction: string; // type date SQL — "2026-07-05"
  libelle: string;
  /** Montants en CENTIMES (bigint côté SQL, number côté JS — exact jusqu'à 2^53). */
  montant_ttc_centimes: number;
  montant_tva_centimes: number;
  /** Colonne générée par Postgres (TTC - TVA) : on la LIT, on ne l'écrit jamais. */
  montant_ht_centimes: number;
  /** [07/11/2026] sql/06 : compte réel (null = pas encore connu). */
  compte_tresorerie_id: string | null;
  /** Identifiant partagé par les deux jambes d'un virement interne. */
  virement_id: string | null;
  /** Provenance : fichier source, puis page ou ligne. */
  source_fichier: string | null;
  source_ref: string | null;
  /** Clé stable d'import (anti-doublon au réimport). */
  source_cle: string | null;
  commentaire: string | null;
  /** [07/11/2026] sql/08 : dossier de subvention lié (financement lié), distinct de la catégorie. */
  subvention_id: string | null;
  /** [07/11/2026] sql/10 : pointage sur le relevé (date + référence) et exception de justificatif motivée. */
  pointe_le: string | null;
  pointe_ref: string | null;
  exception_justificatif: string | null;
  cree_le: string;
  modifie_le: string;
}

/** Compte réel d'une entité (table compte_tresorerie — sql/06). */
export interface CompteTresorerie {
  id: string;
  entite_id: string;
  nom: string;
  nature: NatureCompte;
  /** Signé. null = solde initial inconnu (jamais remplacé par 0). */
  solde_initial_centimes: number | null;
  date_solde_initial: string | null;
  active: boolean;
  cree_le: string;
}

/** DTO de création d'un compte réel. */
export interface NouveauCompteTresorerie {
  entite_id: string;
  nom: string;
  nature: NatureCompte;
  solde_initial_centimes: number | null;
  date_solde_initial: string | null;
}

/** Solde lu sur un relevé (table solde_observe — sql/06). Pas une transaction. */
export interface SoldeObserve {
  id: string;
  entite_id: string;
  compte_id: string;
  date_releve: string;
  solde_centimes: number;
  reference: string | null;
  cree_le: string;
}

/** Métadonnées d'une pièce jointe (table justificatif). Le fichier vit dans Storage. */
export interface Justificatif {
  id: string;
  transaction_id: string;
  chemin_stockage: string;
  nom_fichier: string;
  type_mime: string;
  taille_octets: number | null;
  cree_le: string;
}

/**
 * Données nécessaires pour CRÉER une transaction (formulaire de saisie).
 * Sous-ensemble de Transaction : pas d'id (généré), pas de HT (colonne
 * générée), pas d'horodatage (défauts SQL).
 */
export interface NouvelleTransaction {
  entite_id: string;
  categorie_id: string | null;
  type: TypeFlux;
  date_transaction: string;
  libelle: string;
  montant_ttc_centimes: number;
  montant_tva_centimes: number;
  /** [07/11/2026] sql/06 — tous optionnels : une saisie simple reste valide. */
  statut?: StatutTransaction;
  compte_tresorerie_id?: string | null;
  virement_id?: string | null;
  source_fichier?: string | null;
  source_ref?: string | null;
  source_cle?: string | null;
  commentaire?: string | null;
  subvention_id?: string | null;
  pointe_le?: string | null;
  pointe_ref?: string | null;
  exception_justificatif?: string | null;
}

/**
 * Données nécessaires pour CRÉER une catégorie (formulaire).
 * Sous-ensemble de Categorie : pas d'id (généré), pas de `active` (défaut
 * true à la création), pas d'horodatage (défaut SQL).
 */
export interface NouvelleCategorie {
  entite_id: string;
  nom: string;
  type: TypeFlux;
  compte_id?: string | null;
}

/** Compte du plan comptable (table compte, partie double — sql/04). */
export interface Compte {
  id: string;
  entite_id: string;
  numero: string;
  libelle: string;
  classe: number;
  active: boolean;
  cree_le: string;
}

/** En-tête d'écriture (table ecriture — sql/04). */
export interface Ecriture {
  id: string;
  entite_id: string;
  transaction_id: string | null;
  journal: string;
  date_ecriture: string;
  libelle: string;
  piece: string | null;
  cree_le: string;
}

/** Ligne au débit OU au crédit d'un compte (table ligne_ecriture — sql/04). */
export interface LigneEcriture {
  id: string;
  ecriture_id: string;
  entite_id: string;
  compte_id: string;
  debit_centimes: number;
  credit_centimes: number;
}

/** DTO de création d'un compte (id/active/cree_le gérés par la base). */
export interface NouveauCompte {
  entite_id: string;
  numero: string;
  libelle: string;
  classe: number;
}

// ---------------------------------------------------------------------------
// [07/11/2026] sql/08 : subventions et contributions volontaires en nature
// ---------------------------------------------------------------------------

/** Miroir du CHECK sur subvention.statut. */
export type StatutSubvention = "a_preparer" | "deposee" | "notifiee" | "soldee" | "refusee";

export interface Subvention {
  id: string;
  entite_id: string;
  financeur: string;
  action: string;
  exercice: number;
  statut: StatutSubvention;
  /** null = inconnu (jamais 0 par défaut). */
  montant_demande_centimes: number | null;
  montant_notifie_centimes: number | null;
  date_depot: string | null;
  date_notification: string | null;
  echeance: string | null;
  commentaire: string | null;
  cree_le: string;
  modifie_le: string;
}

export type NouvelleSubvention = Omit<Subvention, "id" | "cree_le" | "modifie_le">;

/** Miroir des CHECK sur contribution_nature. */
export type TypeContribution = "heures_benevoles" | "don_nature" | "frais_abandonnes";
export type StatutContribution = "brouillon" | "a_verifier" | "verifie" | "annule";

export interface ContributionNature {
  id: string;
  entite_id: string;
  type: TypeContribution;
  date_contribution: string;
  libelle: string;
  statut: StatutContribution;
  minutes: number | null;
  taux_horaire_centimes: number | null;
  nb_personnes: number | null;
  valeur_centimes: number;
  date_renonciation: string | null;
  commentaire: string | null;
  source: string | null;
  source_cle: string | null;
  cree_le: string;
  modifie_le: string;
}

export type NouvelleContribution = Omit<ContributionNature, "id" | "cree_le" | "modifie_le">;
