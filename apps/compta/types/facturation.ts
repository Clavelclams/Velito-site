/**
 * Types TypeScript miroir de sql/13_devis_factures.sql (09/11/2026).
 *
 * Même règle que types/database.ts : noms de colonnes en snake_case, reflet
 * exact de la base. Fichier séparé, comme types/notes-de-frais.ts.
 */

/** Miroir du CHECK sur facturation_parametres.regime_tva. */
export type RegimeTva = "franchise_base" | "assujetti" | "non_assujetti";

/** Miroir du CHECK sur client_facturation.type_client. */
export type TypeClient = "particulier" | "professionnel";

/** Miroir du CHECK sur devis.statut (« expiré » se calcule, il n'est pas stocké). */
export type StatutDevisStocke = "brouillon" | "envoye" | "accepte" | "refuse";
/** Statut affiché d'un devis. */
export type StatutDevis = StatutDevisStocke | "expire";

/** Miroir du CHECK sur facture.sens. */
export type SensFacture = "facture" | "avoir";
/** Miroir du CHECK sur facture.statut (cycle de vie stocké). */
export type StatutFactureStocke = "brouillon" | "emise";
/** Statut affiché : payée, payée partiellement et annulée se calculent. */
export type StatutFacture = "brouillon" | "emise" | "payee_partiellement" | "payee" | "annulee";

/** Miroir du CHECK sur facture.nature_operation. */
export type NatureOperation = "biens" | "services" | "mixte";

export interface ParametresFacturation {
  entite_id: string;
  denomination: string | null;
  forme_juridique: string | null;
  capital_social_centimes: number | null;
  adresse: string | null;
  siren: string | null;
  siret: string | null;
  ville_rcs: string | null;
  numero_tva_intra: string | null;
  regime_tva: RegimeTva | null;
  mention_tva: string | null;
  conditions_paiement: string | null;
  penalites_retard: string | null;
  indemnite_recouvrement: string | null;
  iban: string | null;
  email: string | null;
  cree_le: string;
  modifie_le: string;
}

export type NouveauxParametresFacturation = Omit<ParametresFacturation, "cree_le" | "modifie_le">;

export interface ClientFacturation {
  id: string;
  entite_id: string;
  type_client: TypeClient;
  nom: string;
  siren: string | null;
  numero_tva_intra: string | null;
  adresse_facturation: string | null;
  /** NULL = identique à l'adresse de facturation. */
  adresse_livraison: string | null;
  email: string | null;
  commentaire: string | null;
  cree_le: string;
  modifie_le: string;
}

export type NouveauClientFacturation = Omit<ClientFacturation, "id" | "cree_le" | "modifie_le">;

/** Champs d'une ligne communs aux devis et aux factures. */
export interface LigneDocument {
  id: string;
  entite_id: string;
  position: number;
  designation: string;
  /** numeric(12,3) : arrive en nombre (API) ou en texte (pilote Postgres). */
  quantite: number | string;
  unite: string | null;
  prix_unitaire_ht_centimes: number;
  /** Centièmes de pour cent : 20 % = 2000, 5,5 % = 550, 0 accepté. */
  taux_tva_centiemes: number;
  /** Quantité × prix unitaire, arrondi au centime (vérifié par la base). */
  montant_ht_centimes: number;
  cree_le: string;
  modifie_le: string;
}

export interface LigneDevis extends LigneDocument {
  devis_id: string;
}

export interface LigneFacture extends LigneDocument {
  facture_id: string;
}

/** DTO de ligne : la quantité part en TEXTE (« 1.500 ») : aucun flottant ne la transporte. */
export type NouvelleLigneDocument = Omit<LigneDocument, "id" | "cree_le" | "modifie_le" | "quantite"> & { quantite: string };
export type NouvelleLigneDevis = NouvelleLigneDocument & { devis_id: string };
export type NouvelleLigneFacture = NouvelleLigneDocument & { facture_id: string };

export interface Devis {
  id: string;
  entite_id: string;
  /** DEV-AAAA-NNN, attribué par la base à la création. */
  numero: string;
  annee_numero: number;
  rang: number;
  client_id: string;
  objet: string | null;
  date_devis: string;
  date_fin_validite: string;
  statut: StatutDevisStocke;
  date_acceptation: string | null;
  signataire_accord: string | null;
  facture_id: string | null;
  notes: string | null;
  cree_le: string;
  modifie_le: string;
}

export interface NouveauDevis {
  entite_id: string;
  client_id: string;
  objet: string | null;
  date_devis: string;
  date_fin_validite: string;
  notes: string | null;
}

/** Instantané du vendeur figé à l'émission (paramètres sans entite_id ni horodatage). */
export type InstantaneVendeur = Omit<ParametresFacturation, "entite_id" | "cree_le" | "modifie_le">;
/** Instantané de l'acheteur figé à l'émission. */
export type InstantaneAcheteur = Omit<ClientFacturation, "entite_id" | "cree_le" | "modifie_le" | "commentaire">;

export interface Facture {
  id: string;
  entite_id: string;
  sens: SensFacture;
  statut: StatutFactureStocke;
  /** FAC-AAAA-NNNN ou AV-AAAA-NNNN, attribué par la base à l'émission ; NULL en brouillon. */
  numero: string | null;
  annee_numero: number | null;
  rang: number | null;
  client_id: string;
  date_emission: string | null;
  date_prestation: string | null;
  date_echeance: string | null;
  nature_operation: NatureOperation | null;
  tva_sur_debits: boolean;
  objet: string | null;
  notes: string | null;
  facture_origine_id: string | null;
  correction_de: string | null;
  /** Figés à l'émission ; NULL en brouillon. */
  total_ht_centimes: number | null;
  total_tva_centimes: number | null;
  total_ttc_centimes: number | null;
  vendeur: InstantaneVendeur | null;
  acheteur: InstantaneAcheteur | null;
  emise_le: string | null;
  cree_le: string;
  modifie_le: string;
}

/** DTO de création ou de modification d'un brouillon (numéro, totaux et instantanés : la base). */
export interface NouvelleFacture {
  entite_id: string;
  sens: SensFacture;
  client_id: string;
  date_emission: string | null;
  date_prestation: string | null;
  date_echeance: string | null;
  nature_operation: NatureOperation | null;
  tva_sur_debits: boolean;
  objet: string | null;
  notes: string | null;
  facture_origine_id: string | null;
  correction_de: string | null;
}

export interface PaiementFacture {
  id: string;
  entite_id: string;
  facture_id: string;
  transaction_id: string;
  montant_centimes: number;
  cree_le: string;
}

export type NouveauPaiementFacture = Omit<PaiementFacture, "id" | "cree_le">;
