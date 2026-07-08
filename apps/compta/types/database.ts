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

/** Cycle de vie d'une transaction — miroir du CHECK sur transaction.statut. */
export type StatutTransaction = "a_verifier" | "validee";

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
  cree_le: string;
  modifie_le: string;
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
