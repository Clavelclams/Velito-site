/**
 * SERVICE DEVIS ET FACTURES (09/11/2026) : fonctions PURES, aucune base.
 *
 * Règles (cahier des charges « Gestion Compta Nova », plus le droit français
 * de la facturation, appliqués comme des RÈGLES et non comme du conseil) :
 *  1. montants en centimes entiers, quantités en millièmes entiers, taux de
 *     TVA en centièmes de pour cent : aucun flottant ne transporte une valeur ;
 *  2. totaux : HT arrondi PAR LIGNE, somme PAR TAUX, TVA arrondie une fois
 *     par taux, TTC = HT + TVA (voir calculerTotaux) ;
 *  3. devis : brouillon, envoyé, accepté, refusé ; « expiré » se calcule ;
 *  4. facture : le brouillon n'a pas de numéro ; la BASE attribue le numéro
 *     légal à l'émission ; une facture émise ne change plus : on la corrige
 *     par un avoir (série AV à part) ;
 *  5. jamais de paiement fictif : on rattache des recettes réelles, le
 *     statut payé se calcule ; une facture n'est jamais une recette ;
 *  6. chaque mention est un champ : absente, elle est signalée « à compléter »
 *     et l'émission est refusée tant qu'une mention obligatoire manque ;
 *  7. données structurées (concepts EN 16931) prêtes pour une plateforme
 *     agréée, sans aucune connexion.
 *
 * Tests : node scripts/test.mjs lib/services/facturation.test.ts
 */
import type { Categorie, Transaction, TypeJuridique } from "@/types/database";
import type {
  ClientFacturation,
  Devis,
  Facture,
  InstantaneAcheteur,
  InstantaneVendeur,
  LigneDocument,
  NatureOperation,
  NouveauClientFacturation,
  NouveauDevis,
  NouveauPaiementFacture,
  NouveauxParametresFacturation,
  NouvelleFacture,
  NouvelleLigneDocument,
  ParametresFacturation,
  RegimeTva,
  StatutDevis,
  StatutDevisStocke,
  StatutFacture,
  TypeClient,
} from "@/types/facturation";
import { centimesVersSaisie, eurosVersCentimes, formaterCentimes } from "@/lib/services/montants";
import { echapperChampCsv } from "@/lib/services/export";
import { normaliser } from "@/lib/services/ik";

type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreurs: string[] };

// ============================================================================
// Libellés et suggestions
// ============================================================================

export const LIBELLES_STATUT_DEVIS: Record<StatutDevis, string> = {
  brouillon: "Brouillon",
  envoye: "Envoyé",
  accepte: "Accepté",
  refuse: "Refusé",
  expire: "Expiré",
};

export const LIBELLES_STATUT_FACTURE: Record<StatutFacture, string> = {
  brouillon: "Brouillon",
  emise: "Émise",
  payee_partiellement: "Payée partiellement",
  payee: "Payée",
  annulee: "Annulée par avoir",
};

export const LIBELLES_NATURE: Record<NatureOperation, string> = {
  biens: "Livraison de biens",
  services: "Prestation de services",
  mixte: "Mixte (biens et services)",
};

export const LIBELLES_REGIME: Record<RegimeTva, string> = {
  franchise_base: "Franchise en base de TVA",
  assujetti: "Assujetti à la TVA",
  non_assujetti: "Non assujetti à la TVA",
};

export const LIBELLES_TYPE_CLIENT: Record<TypeClient, string> = {
  particulier: "Particulier",
  professionnel: "Professionnel",
};

/** Mention donnée par le cahier des charges pour la franchise en base. */
export const MENTION_TVA_FRANCHISE = "TVA non applicable, article 293 B du CGI";

/** Texte préremplissable (modifiable) de l'indemnité forfaitaire de recouvrement. */
export const MENTION_INDEMNITE_SUGGEREE =
  "En cas de retard de paiement, indemnité forfaitaire pour frais de recouvrement de 40 € (article D. 441-5 du Code de commerce).";

export const RAPPEL_EXPERT = "Suggestion à vérifier avec ton expert-comptable.";

/** Catégorie de recette proposée lors du rattachement d'un encaissement (plan associatif). */
export const NOM_CATEGORIE_VENTES = "Ventes et prestations";

/** Texte de l'encadré de la page des factures (réforme de la facturation électronique). */
export const ENCADRE_REFORME =
  "À partir du 1er septembre 2027, les factures entre entreprises devront passer par une plateforme agréée. Ce module prépare les données ; l'envoi se fera par la plateforme choisie par la structure.";

/**
 * [09/11/2026] Suggestion de mention de TVA selon le régime : seule la
 * franchise en base a un texte fourni par le cahier des charges. Pour les
 * autres régimes, aucune mention n'est inventée (null) : la structure la
 * saisit avec son expert-comptable.
 */
export function suggestionMentionTva(regime: RegimeTva | null | undefined): string | null {
  return regime === "franchise_base" ? MENTION_TVA_FRANCHISE : null;
}

/** Un régime qui interdit de facturer de la TVA (taux 0 obligatoire sur chaque ligne). */
export function regimeSansTva(regime: RegimeTva | null | undefined): boolean {
  return regime === "franchise_base" || regime === "non_assujetti";
}

// ============================================================================
// Outils de saisie
// ============================================================================

function estDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

/** Ajoute n jours à une date ISO (calcul en UTC, sans fuseau). */
export function ajouterJours(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

const propre = (v: string | null | undefined) => (v ?? "").trim().replace(/\s+/g, " ");
/** Texte libre multiligne (adresse) : lignes nettoyées, vides retirées. */
const propreMultiligne = (v: string | null | undefined) =>
  (v ?? "")
    .split(/\r?\n/)
    .map((l) => l.trim().replace(/\s+/g, " "))
    .filter(Boolean)
    .join("\n");
const ouNull = (v: string) => (v.length > 0 ? v : null);
const sansEspaces = (v: string | null | undefined) => (v ?? "").replace(/[\s.\-  ]/g, "").toUpperCase();

/**
 * [09/11/2026] Quantité saisie → millièmes entiers, par analyse de TEXTE
 * comme eurosVersCentimes : « 1,5 » → 1500, « 0.333 » → 333, « 12 » → 12000.
 * Trois décimales au plus (numeric(12,3) en base). null si invalide ou nulle.
 */
export function quantiteVersMilliemes(saisie: string): number | null {
  const t = (saisie ?? "").replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^\d{1,9}(\.\d{1,3})?$/.test(t)) return null;
  const [ent, dec = ""] = t.split(".");
  const m = Number(ent) * 1000 + Number(dec.padEnd(3, "0"));
  return m > 0 ? m : null;
}

/** Millièmes → texte envoyé à la base (« 1.500 ») : jamais un flottant. */
export function milliemesVersTexte(m: number): string {
  return `${Math.trunc(m / 1000)}.${String(m % 1000).padStart(3, "0")}`;
}

/** Valeur lue en base (nombre ou texte) → millièmes. */
export function quantiteDepuisBase(v: number | string): number {
  return quantiteVersMilliemes(String(v)) ?? 0;
}

/** Millièmes → affichage français sans zéros inutiles : 1500 → « 1,5 », 12000 → « 12 ». */
export function formaterQuantite(m: number): string {
  const ent = Math.trunc(m / 1000);
  const dec = String(m % 1000).padStart(3, "0").replace(/0+$/, "");
  return dec ? `${ent},${dec}` : String(ent);
}

/** Taux saisi en pour cent → centièmes : « 20 » → 2000, « 5,5 » → 550, « 0 » → 0. */
export function tauxVersCentiemes(saisie: string): number | null {
  const t = (saisie ?? "").replace(/[\s%  ]/g, "").replace(",", ".");
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(t)) return null;
  const [ent, dec = ""] = t.split(".");
  const c = Number(ent) * 100 + Number(dec.padEnd(2, "0"));
  return c <= 10000 ? c : null;
}

/** Centièmes → « 20 % », « 5,5 % », « 0 % ». */
export function formaterTaux(c: number): string {
  const ent = Math.trunc(c / 100);
  const dec = String(c % 100).padStart(2, "0").replace(/0+$/, "");
  return `${dec ? `${ent},${dec}` : ent} %`;
}

/** Centièmes → saisie éditable : 550 → « 5,5 ». */
export function tauxVersSaisie(c: number): string {
  return formaterTaux(c).replace(" %", "");
}

// ============================================================================
// Calculs : lignes et totaux
// ============================================================================

/**
 * [09/11/2026] Montant HT d'une ligne = quantité × prix unitaire, arrondi au
 * centime (demi vers le haut, comme round() de Postgres sur un positif).
 * BigInt : millièmes × centimes peut dépasser 2^53 avant la division.
 */
export function montantLigneHt(quantiteMilliemes: number, prixUnitaireCentimes: number): number {
  const produit = BigInt(quantiteMilliemes) * BigInt(prixUnitaireCentimes);
  return Number((produit + 500n) / 1000n);
}

/** TVA d'une base HT à un taux (centièmes de pour cent), arrondie au centime. */
export function tvaSurBase(baseHtCentimes: number, tauxCentiemes: number): number {
  return Number((BigInt(baseHtCentimes) * BigInt(tauxCentiemes) + 5000n) / 10000n);
}

export interface TotalParTaux {
  tauxCentiemes: number;
  baseHtCentimes: number;
  tvaCentimes: number;
}

export interface Totaux {
  parTaux: TotalParTaux[];
  totalHtCentimes: number;
  totalTvaCentimes: number;
  totalTtcCentimes: number;
}

type LigneMontant = Pick<LigneDocument, "montant_ht_centimes" | "taux_tva_centiemes">;

/**
 * [09/11/2026] Totaux d'un document. CHOIX DE L'ARRONDI, à défendre :
 *  - le montant HT est arrondi PAR LIGNE (c'est ce que le client lit sur
 *    chaque ligne, et la base le vérifie : quantité × prix arrondi) ;
 *  - les lignes sont SOMMÉES PAR TAUX (base imposable du taux) ;
 *  - la TVA est calculée sur cette somme et arrondie UNE fois par taux ;
 *  - TTC = HT + TVA, au centime près, sans nouvel arrondi.
 * Pourquoi pas une TVA arrondie ligne par ligne puis sommée ? Parce que la
 * norme EN 16931 (celle des plateformes agréées) contrôle que la TVA d'un
 * taux = base du taux × taux, arrondie : trois lignes à 3,33 € à 20 %
 * donneraient 2,01 € (0,67 × 3) au lieu de 2,00 €, et la facture serait
 * rejetée pour un centime. La fonction SQL totaux_facture fait exactement le
 * même calcul : les totaux figés à l'émission sont ceux affichés ici.
 */
export function calculerTotaux(lignes: LigneMontant[]): Totaux {
  const bases = new Map<number, number>();
  for (const l of lignes) {
    const t = Number(l.taux_tva_centiemes);
    bases.set(t, (bases.get(t) ?? 0) + Number(l.montant_ht_centimes));
  }
  const parTaux = [...bases.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([tauxCentiemes, baseHtCentimes]) => ({ tauxCentiemes, baseHtCentimes, tvaCentimes: tvaSurBase(baseHtCentimes, tauxCentiemes) }));
  const totalHtCentimes = parTaux.reduce((s, x) => s + x.baseHtCentimes, 0);
  const totalTvaCentimes = parTaux.reduce((s, x) => s + x.tvaCentimes, 0);
  return { parTaux, totalHtCentimes, totalTvaCentimes, totalTtcCentimes: totalHtCentimes + totalTvaCentimes };
}

/** Totaux d'une facture : figés en base si émise, calculés sinon. */
export function totauxFacture(f: Pick<Facture, "statut" | "total_ht_centimes" | "total_tva_centimes" | "total_ttc_centimes">, lignes: LigneMontant[]): Totaux {
  const calcules = calculerTotaux(lignes);
  if (f.statut === "emise" && f.total_ttc_centimes !== null) {
    return {
      parTaux: calcules.parTaux,
      totalHtCentimes: Number(f.total_ht_centimes),
      totalTvaCentimes: Number(f.total_tva_centimes),
      totalTtcCentimes: Number(f.total_ttc_centimes),
    };
  }
  return calcules;
}

// ============================================================================
// Paramètres vendeur
// ============================================================================

export interface SaisieParametres {
  denomination: string;
  formeJuridique: string;
  capitalSocial: string; // euros, vide = inconnu
  adresse: string;
  siren: string;
  siret: string;
  villeRcs: string;
  numeroTvaIntra: string;
  regimeTva: string; // "" = inconnu
  mentionTva: string;
  conditionsPaiement: string;
  penalitesRetard: string;
  indemniteRecouvrement: string;
  iban: string;
  email: string;
}

const REGIMES: RegimeTva[] = ["franchise_base", "assujetti", "non_assujetti"];

/** Valide les paramètres du vendeur. Tout est facultatif ici : c'est l'émission qui exige. */
export function preparerParametres(entiteId: string, s: SaisieParametres): Resultat<NouveauxParametresFacturation> {
  const erreurs: string[] = [];
  const siren = sansEspaces(s.siren);
  const siret = sansEspaces(s.siret);
  const tva = sansEspaces(s.numeroTvaIntra);
  const iban = sansEspaces(s.iban);
  if (siren && !/^\d{9}$/.test(siren)) erreurs.push("Le SIREN compte 9 chiffres.");
  if (siret && !/^\d{14}$/.test(siret)) erreurs.push("Le SIRET compte 14 chiffres.");
  if (siren && siret && /^\d{14}$/.test(siret) && !siret.startsWith(siren)) erreurs.push("Le SIRET doit commencer par le SIREN.");
  if (tva && !/^[A-Z]{2}[0-9A-Z]{2,13}$/.test(tva)) erreurs.push("Numéro de TVA intracommunautaire mal formé (ex. FR + 11 caractères).");
  if (iban && !/^[A-Z]{2}\d{2}[0-9A-Z]{10,30}$/.test(iban)) erreurs.push("IBAN mal formé.");
  let capital: number | null = null;
  if (propre(s.capitalSocial)) {
    capital = eurosVersCentimes(s.capitalSocial);
    if (capital === null) erreurs.push("Capital social : montant invalide (ex. 500 ou 500,00).");
  }
  const regime = s.regimeTva ? (REGIMES.find((r) => r === s.regimeTva) ?? null) : null;
  if (s.regimeTva && !regime) erreurs.push("Régime de TVA inconnu.");
  const champs = {
    denomination: [propre(s.denomination), 200, "Dénomination"],
    forme_juridique: [propre(s.formeJuridique), 100, "Forme juridique"],
    adresse: [propreMultiligne(s.adresse), 500, "Adresse"],
    ville_rcs: [propre(s.villeRcs), 100, "Ville du RCS"],
    mention_tva: [propre(s.mentionTva), 300, "Mention de TVA"],
    conditions_paiement: [propre(s.conditionsPaiement), 500, "Conditions de paiement"],
    penalites_retard: [propre(s.penalitesRetard), 500, "Pénalités de retard"],
    indemnite_recouvrement: [propre(s.indemniteRecouvrement), 500, "Indemnité de recouvrement"],
    email: [propre(s.email), 200, "E-mail"],
  } as const;
  for (const [, [v, max, nom]] of Object.entries(champs)) {
    if (v.length > max) erreurs.push(`${nom} : ${max} caractères au plus.`);
  }
  const email = champs.email[0];
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erreurs.push("E-mail invalide.");
  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: {
      entite_id: entiteId,
      denomination: ouNull(champs.denomination[0]),
      forme_juridique: ouNull(champs.forme_juridique[0]),
      capital_social_centimes: capital,
      adresse: ouNull(champs.adresse[0]),
      siren: ouNull(siren),
      siret: ouNull(siret),
      ville_rcs: ouNull(champs.ville_rcs[0]),
      numero_tva_intra: ouNull(tva),
      regime_tva: regime,
      mention_tva: ouNull(champs.mention_tva[0]),
      conditions_paiement: ouNull(champs.conditions_paiement[0]),
      penalites_retard: ouNull(champs.penalites_retard[0]),
      indemnite_recouvrement: ouNull(champs.indemnite_recouvrement[0]),
      iban: ouNull(iban),
      email: ouNull(email),
    },
  };
}

// ============================================================================
// Clients
// ============================================================================

export interface SaisieClient {
  typeClient: string;
  nom: string;
  siren: string;
  numeroTvaIntra: string;
  adresseFacturation: string;
  adresseLivraison: string;
  email: string;
  commentaire: string;
}

export function preparerClient(entiteId: string, s: SaisieClient): Resultat<NouveauClientFacturation> {
  const erreurs: string[] = [];
  const type: TypeClient | null = s.typeClient === "particulier" || s.typeClient === "professionnel" ? s.typeClient : null;
  if (!type) erreurs.push("Choisis particulier ou professionnel.");
  const nom = propre(s.nom);
  if (nom.length < 1 || nom.length > 200) erreurs.push("Indique le nom du client (200 caractères au plus).");
  const siren = sansEspaces(s.siren);
  if (siren && !/^\d{9}$/.test(siren)) erreurs.push("Le SIREN compte 9 chiffres.");
  const tva = sansEspaces(s.numeroTvaIntra);
  if (tva && !/^[A-Z]{2}[0-9A-Z]{2,13}$/.test(tva)) erreurs.push("Numéro de TVA intracommunautaire mal formé.");
  const facturation = propreMultiligne(s.adresseFacturation);
  const livraison = propreMultiligne(s.adresseLivraison);
  if (facturation.length > 500 || livraison.length > 500) erreurs.push("Adresse : 500 caractères au plus.");
  const email = propre(s.email);
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erreurs.push("E-mail invalide.");
  const commentaire = (s.commentaire ?? "").trim();
  if (commentaire.length > 1000) erreurs.push("Commentaire trop long.");
  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: {
      entite_id: entiteId,
      type_client: type as TypeClient,
      nom,
      siren: ouNull(siren),
      numero_tva_intra: ouNull(tva),
      adresse_facturation: ouNull(facturation),
      // Livraison identique à la facturation : on ne la duplique pas.
      adresse_livraison: livraison && livraison !== facturation ? livraison : null,
      email: ouNull(email),
      commentaire: ouNull(commentaire),
    },
  };
}

// ============================================================================
// Lignes (devis et factures)
// ============================================================================

export interface SaisieLigne {
  designation: string;
  quantite: string;
  unite: string;
  prixUnitaire: string; // euros HT
  taux: string; // pour cent
}

/**
 * Ligne de devis ou de facture, sans son parent (devis_id ou facture_id
 * ajouté par l'appelant). Régime sans TVA (franchise, non assujetti) :
 * tout taux supérieur à 0 est refusé.
 */
export function preparerLigne(
  entiteId: string,
  s: SaisieLigne,
  regime: RegimeTva | null,
  position: number,
): Resultat<NouvelleLigneDocument> {
  const erreurs: string[] = [];
  const designation = propre(s.designation);
  if (designation.length < 1 || designation.length > 500) erreurs.push("Décris la ligne (500 caractères au plus).");
  const q = quantiteVersMilliemes(s.quantite);
  if (q === null) erreurs.push("Quantité invalide : supérieure à 0, trois décimales au plus (ex. 1,5).");
  const unite = propre(s.unite);
  if (unite.length > 30) erreurs.push("Unité : 30 caractères au plus.");
  const pu = propre(s.prixUnitaire) === "" ? null : eurosVersCentimes(s.prixUnitaire);
  if (pu === null) erreurs.push("Prix unitaire HT invalide (ex. 120 ou 120,50).");
  else if (pu > 100_000_000_000) erreurs.push("Prix unitaire trop élevé.");
  const taux = tauxVersCentiemes(s.taux);
  if (taux === null) erreurs.push("Taux de TVA invalide (ex. 20, 5,5 ou 0).");
  else if (taux > 0 && regimeSansTva(regime)) {
    erreurs.push(`Régime « ${LIBELLES_REGIME[regime as RegimeTva]} » : le taux de TVA doit être 0.`);
  }
  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: {
      entite_id: entiteId,
      position,
      designation,
      quantite: milliemesVersTexte(q as number),
      unite: ouNull(unite),
      prix_unitaire_ht_centimes: pu as number,
      taux_tva_centiemes: taux as number,
      montant_ht_centimes: montantLigneHt(q as number, pu as number),
    },
  };
}

/** Copie de lignes (devis → facture, facture → avoir ou correction), positions conservées. */
export function copierLignes(lignes: LigneDocument[]): NouvelleLigneDocument[] {
  return [...lignes]
    .sort((a, b) => a.position - b.position)
    .map((l, i) => ({
      entite_id: l.entite_id,
      position: i,
      designation: l.designation,
      quantite: milliemesVersTexte(quantiteDepuisBase(l.quantite)),
      unite: l.unite,
      prix_unitaire_ht_centimes: Number(l.prix_unitaire_ht_centimes),
      taux_tva_centiemes: Number(l.taux_tva_centiemes),
      montant_ht_centimes: Number(l.montant_ht_centimes),
    }));
}

/** Prochaine position libre (ordre d'affichage). */
export function prochainePosition(lignes: Pick<LigneDocument, "position">[]): number {
  return lignes.reduce((m, l) => Math.max(m, l.position + 1), 0);
}

// ============================================================================
// Devis
// ============================================================================

export interface SaisieDevis {
  clientId: string;
  objet: string;
  date: string;
  /** Date de fin de validité ; vide = calculée depuis la durée. */
  dateFin: string;
  /** Durée de validité en jours, utilisée si dateFin est vide. */
  dureeJours: string;
  notes: string;
}

export function preparerDevis(entiteId: string, s: SaisieDevis, clients: Pick<ClientFacturation, "id">[]): Resultat<NouveauDevis> {
  const erreurs: string[] = [];
  if (!clients.some((c) => c.id === s.clientId)) erreurs.push("Choisis un client de la structure.");
  const objet = propre(s.objet);
  if (objet.length > 200) erreurs.push("Objet : 200 caractères au plus.");
  if (!estDate(s.date)) erreurs.push("La date du devis doit être une date réelle.");
  let fin: string | null = null;
  if (propre(s.dateFin)) {
    if (!estDate(s.dateFin)) erreurs.push("La date de fin de validité doit être une date réelle.");
    else fin = s.dateFin;
  } else if (/^\d{1,3}$/.test(propre(s.dureeJours)) && Number(s.dureeJours) > 0 && estDate(s.date)) {
    fin = ajouterJours(s.date, Number(s.dureeJours));
  } else {
    erreurs.push("Indique une durée de validité (en jours) ou une date de fin.");
  }
  if (fin && estDate(s.date) && fin < s.date) erreurs.push("La fin de validité ne peut pas précéder la date du devis.");
  const notes = (s.notes ?? "").trim();
  if (notes.length > 2000) erreurs.push("Notes : 2 000 caractères au plus.");
  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: { entite_id: entiteId, client_id: s.clientId, objet: ouNull(objet), date_devis: s.date, date_fin_validite: fin as string, notes: ouNull(notes) },
  };
}

/**
 * [09/11/2026] Transitions STOCKÉES permises, miroir du trigger controle_devis
 * (sql/13). Accepté et refusé sont finaux.
 */
export const TRANSITIONS_DEVIS: Record<StatutDevisStocke, StatutDevisStocke[]> = {
  brouillon: ["envoye"],
  envoye: ["brouillon", "accepte", "refuse"],
  accepte: [],
  refuse: [],
};

/** Statut affiché : un devis envoyé dont la fin de validité est dépassée est « expiré ». */
export function statutDevis(d: Pick<Devis, "statut" | "date_fin_validite">, aujourdHui: string): StatutDevis {
  return d.statut === "envoye" && d.date_fin_validite < aujourdHui ? "expire" : d.statut;
}

export function devisModifiable(d: Pick<Devis, "statut">): boolean {
  return d.statut === "brouillon" || d.statut === "envoye";
}

/** Contrôle d'un changement de statut de devis. Renvoie le message, ou null si permis. */
export function controlerTransitionDevis(
  d: Pick<Devis, "statut" | "date_devis" | "date_fin_validite">,
  vers: StatutDevisStocke,
  nbLignes: number,
  aujourdHui: string,
  dateAcceptation?: string,
): string | null {
  if (!TRANSITIONS_DEVIS[d.statut].includes(vers)) {
    return `Passage de « ${LIBELLES_STATUT_DEVIS[d.statut]} » à « ${LIBELLES_STATUT_DEVIS[vers]} » impossible.`;
  }
  if (vers === "envoye" && nbLignes === 0) return "Ajoute au moins une ligne avant d'envoyer le devis.";
  if (vers === "accepte") {
    const da = dateAcceptation ?? "";
    if (!estDate(da)) return "Indique la date d'acceptation (date du « Bon pour accord »).";
    if (da < d.date_devis) return "La date d'acceptation ne peut pas précéder la date du devis.";
    if (da > aujourdHui) return "La date d'acceptation ne peut pas être dans le futur.";
    if (da > d.date_fin_validite) return "Le devis était expiré à cette date : prépare un nouveau devis.";
  }
  return null;
}

export function peutTransformerDevis(d: Pick<Devis, "statut" | "facture_id">): boolean {
  return d.statut === "accepte" && d.facture_id === null;
}

/**
 * [09/11/2026] Devis accepté → NOUVEAU brouillon de facture : lignes copiées,
 * aucune date d'émission (fixée à l'émission), aucun encaissement. Le devis
 * n'est pas modifié, sauf son lien facture_id posé par l'action.
 */
export function factureDepuisDevis(
  d: Pick<Devis, "entite_id" | "numero" | "client_id" | "objet" | "statut" | "facture_id">,
  lignes: LigneDocument[],
): Resultat<{ facture: NouvelleFacture; lignes: NouvelleLigneDocument[] }> {
  if (!peutTransformerDevis(d)) {
    return { ok: false, erreurs: [d.facture_id ? "Ce devis a déjà été transformé en facture." : "Seul un devis accepté se transforme en facture."] };
  }
  if (lignes.length === 0) return { ok: false, erreurs: ["Ce devis n'a aucune ligne."] };
  return {
    ok: true,
    valeur: {
      facture: {
        entite_id: d.entite_id,
        sens: "facture",
        client_id: d.client_id,
        date_emission: null,
        date_prestation: null,
        date_echeance: null,
        nature_operation: null,
        tva_sur_debits: false,
        objet: d.objet,
        notes: `D'après le devis ${d.numero}.`,
        facture_origine_id: null,
        correction_de: null,
      },
      lignes: copierLignes(lignes),
    },
  };
}

// ============================================================================
// Factures : saisie du brouillon
// ============================================================================

export interface SaisieFacture {
  clientId: string;
  objet: string;
  dateEmission: string; // vide = fixée à l'émission
  datePrestation: string;
  dateEcheance: string;
  natureOperation: string;
  tvaSurDebits: boolean;
  notes: string;
}

const NATURES: NatureOperation[] = ["biens", "services", "mixte"];

/** En-tête d'un brouillon (facture ou avoir). Rien n'est exigé ici : l'émission contrôle. */
export function preparerFacture(
  entiteId: string,
  s: SaisieFacture,
  clients: Pick<ClientFacturation, "id">[],
  base: Pick<NouvelleFacture, "sens" | "facture_origine_id" | "correction_de"> = { sens: "facture", facture_origine_id: null, correction_de: null },
): Resultat<NouvelleFacture> {
  const erreurs: string[] = [];
  if (!clients.some((c) => c.id === s.clientId)) erreurs.push("Choisis un client de la structure.");
  const dates = { emission: s.dateEmission, prestation: s.datePrestation, echeance: s.dateEcheance };
  for (const [nom, v] of Object.entries(dates)) {
    if (v && !estDate(v)) erreurs.push(`Date ${nom === "emission" ? "d'émission" : nom === "prestation" ? "de prestation" : "d'échéance"} invalide.`);
  }
  if (s.dateEmission && s.dateEcheance && s.dateEcheance < s.dateEmission) erreurs.push("L'échéance ne peut pas précéder la date d'émission.");
  const nature = s.natureOperation ? (NATURES.find((n) => n === s.natureOperation) ?? null) : null;
  if (s.natureOperation && !nature) erreurs.push("Nature de l'opération inconnue.");
  const objet = propre(s.objet);
  if (objet.length > 200) erreurs.push("Objet : 200 caractères au plus.");
  const notes = (s.notes ?? "").trim();
  if (notes.length > 2000) erreurs.push("Notes : 2 000 caractères au plus.");
  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: {
      entite_id: entiteId,
      sens: base.sens,
      client_id: s.clientId,
      date_emission: s.dateEmission || null,
      date_prestation: s.datePrestation || null,
      date_echeance: s.dateEcheance || null,
      nature_operation: nature,
      tva_sur_debits: Boolean(s.tvaSurDebits),
      objet: ouNull(objet),
      notes: ouNull(notes),
      facture_origine_id: base.facture_origine_id,
      correction_de: base.correction_de,
    },
  };
}

export function factureModifiable(f: Pick<Facture, "statut">): boolean {
  return f.statut === "brouillon";
}

// ============================================================================
// Mentions obligatoires
// ============================================================================

export interface MentionManquante {
  /** Où la compléter : paramètres vendeur, fiche client, en-tête ou lignes. */
  zone: "vendeur" | "client" | "document" | "lignes";
  libelle: string;
  /** true : l'émission est refusée tant qu'elle manque. */
  bloquante: boolean;
}

type VendeurMentions = Pick<
  ParametresFacturation,
  | "denomination"
  | "forme_juridique"
  | "capital_social_centimes"
  | "adresse"
  | "siren"
  | "siret"
  | "ville_rcs"
  | "numero_tva_intra"
  | "regime_tva"
  | "mention_tva"
  | "conditions_paiement"
  | "penalites_retard"
  | "indemnite_recouvrement"
>;
type AcheteurMentions = Pick<ClientFacturation, "type_client" | "nom" | "siren" | "adresse_facturation">;

/**
 * [09/11/2026] Liste des mentions absentes d'un document, sans rien
 * inventer. Les règles retenues (à valider par l'expert-comptable, voir le
 * rapport) :
 *  - vendeur : dénomination, forme juridique, adresse, SIREN, régime et
 *    conditions de paiement toujours ; capital social et ville du RCS pour
 *    une société ; texte de mention de TVA si le régime ne facture pas de
 *    TVA ; pénalités et indemnité de recouvrement si le client est un
 *    professionnel ; SIRET et TVA intracommunautaire conseillés ;
 *  - acheteur : nom et adresse ; SIREN si professionnel (réforme) ;
 *  - document : date d'émission, date de prestation, nature de l'opération,
 *    échéance (facture seulement) ; au moins une ligne ; taux 0 si le régime
 *    ne facture pas de TVA.
 */
export function mentionsManquantes(
  doc: { type: "devis" | "facture" | "avoir"; date_emission?: string | null; date_prestation?: string | null; date_echeance?: string | null; nature_operation?: string | null },
  lignes: Pick<LigneDocument, "taux_tva_centiemes">[],
  vendeur: VendeurMentions | null,
  acheteur: AcheteurMentions | null,
  typeJuridique: TypeJuridique,
): MentionManquante[] {
  const m: MentionManquante[] = [];
  const pro = acheteur?.type_client === "professionnel";
  const facture = doc.type !== "devis";
  const v = (zone: MentionManquante["zone"], libelle: string, bloquante = true) => m.push({ zone, libelle, bloquante });

  if (!vendeur) {
    v("vendeur", "Paramètres de facturation de la structure");
  } else {
    if (!vendeur.denomination) v("vendeur", "Dénomination du vendeur");
    if (!vendeur.forme_juridique) v("vendeur", "Forme juridique du vendeur");
    if (!vendeur.adresse) v("vendeur", "Adresse du vendeur");
    if (!vendeur.siren) v("vendeur", "SIREN du vendeur");
    if (!vendeur.siret) v("vendeur", "SIRET du vendeur", false);
    if (typeJuridique === "societe" && vendeur.capital_social_centimes === null) v("vendeur", "Capital social");
    if (typeJuridique === "societe" && !vendeur.ville_rcs) v("vendeur", "Ville d'immatriculation au RCS");
    if (!vendeur.regime_tva) v("vendeur", "Régime de TVA");
    if (regimeSansTva(vendeur.regime_tva) && !vendeur.mention_tva) v("vendeur", "Mention de TVA (motif de non-application)");
    if (vendeur.regime_tva === "assujetti" && !vendeur.numero_tva_intra) v("vendeur", "Numéro de TVA intracommunautaire", false);
    // Conditions de règlement : exigées sur une facture (un avoir ne se paie pas).
    const aPayer = doc.type === "facture";
    if (!vendeur.conditions_paiement) v("vendeur", "Conditions de paiement", aPayer);
    if (pro && !vendeur.penalites_retard) v("vendeur", "Taux des pénalités de retard", aPayer);
    if (pro && !vendeur.indemnite_recouvrement) v("vendeur", "Mention de l'indemnité forfaitaire de recouvrement", aPayer);
  }

  if (!acheteur) {
    v("client", "Client");
  } else {
    if (!acheteur.nom) v("client", "Nom du client");
    if (!acheteur.adresse_facturation) v("client", "Adresse de facturation du client");
    if (pro && !acheteur.siren) v("client", "SIREN du client professionnel", facture);
  }

  if (facture) {
    if (!doc.date_emission) v("document", "Date d'émission");
    if (!doc.date_prestation) v("document", "Date de la prestation ou de la livraison");
    if (!doc.nature_operation) v("document", "Nature de l'opération (biens, services ou mixte)");
    if (doc.type === "facture" && !doc.date_echeance) v("document", "Date d'échéance");
  }
  if (lignes.length === 0) v("lignes", "Au moins une ligne");
  if (vendeur && regimeSansTva(vendeur.regime_tva) && lignes.some((l) => Number(l.taux_tva_centiemes) > 0)) {
    v("lignes", "Taux de TVA à 0 sur chaque ligne (régime sans TVA)");
  }
  return m;
}

/**
 * Contrôle d'émission côté app (la base refait numéro, chronologie, totaux
 * et plafond des avoirs). Renvoie la liste des refus, vide si émettable.
 */
export function controlerEmission(
  f: Pick<Facture, "statut" | "sens" | "date_emission" | "date_prestation" | "date_echeance" | "nature_operation">,
  lignes: Pick<LigneDocument, "taux_tva_centiemes" | "montant_ht_centimes">[],
  vendeur: VendeurMentions | null,
  acheteur: AcheteurMentions | null,
  typeJuridique: TypeJuridique,
  aujourdHui: string,
  derniereDateEmise: string | null,
): string[] {
  if (f.statut !== "brouillon") return ["Ce document est déjà émis."];
  const erreurs = mentionsManquantes({ type: f.sens, ...f }, lignes, vendeur, acheteur, typeJuridique)
    .filter((x) => x.bloquante)
    .map((x) => `À compléter : ${x.libelle}.`);
  if (f.date_emission && f.date_emission > aujourdHui) erreurs.push("La date d'émission ne peut pas être dans le futur.");
  if (f.date_emission && derniereDateEmise && f.date_emission < derniereDateEmise) {
    erreurs.push(`Un document de la même série est déjà émis le ${dateFr(derniereDateEmise)} : la numérotation suit l'ordre des dates.`);
  }
  if (lignes.length > 0 && calculerTotaux(lignes).totalTtcCentimes <= 0) erreurs.push("Le total doit être supérieur à 0.");
  return erreurs;
}

// ============================================================================
// Impression : chaque mention est un champ, absente = « à compléter »
// ============================================================================

/** Une information imprimée : null + requise = « à compléter » ; null + facultative = masquée. */
export interface ChampImpression {
  libelle: string;
  valeur: string | null;
  requis: boolean;
}

type VendeurImpression = VendeurMentions & Pick<ParametresFacturation, "iban" | "email">;

/**
 * [09/11/2026] Mentions du vendeur à imprimer. Pour un document émis, la page
 * passe l'INSTANTANÉ figé à l'émission, jamais la fiche actuelle.
 */
export function champsVendeur(v: VendeurImpression | null, typeJuridique: TypeJuridique): ChampImpression[] {
  const societe = typeJuridique === "societe";
  const capital = v?.capital_social_centimes == null ? null : `${formaterCentimes(Number(v.capital_social_centimes))}`;
  return [
    { libelle: "", valeur: v?.adresse ?? null, requis: true },
    { libelle: "Forme juridique", valeur: v?.forme_juridique ?? null, requis: true },
    { libelle: "Capital social", valeur: capital, requis: societe },
    { libelle: "SIREN", valeur: v?.siren ?? null, requis: true },
    { libelle: "SIRET", valeur: v?.siret ?? null, requis: true },
    { libelle: "RCS", valeur: v?.ville_rcs ?? null, requis: societe },
    { libelle: "TVA intracommunautaire", valeur: v?.numero_tva_intra ?? null, requis: false },
    { libelle: "E-mail", valeur: v?.email ?? null, requis: false },
  ];
}

type AcheteurImpression = Pick<ClientFacturation, "type_client" | "siren" | "numero_tva_intra" | "adresse_facturation" | "adresse_livraison" | "email">;

export function champsAcheteur(a: AcheteurImpression | null, avecSirenExige: boolean): ChampImpression[] {
  const pro = a?.type_client === "professionnel";
  return [
    { libelle: "", valeur: a?.adresse_facturation ?? null, requis: true },
    { libelle: "SIREN", valeur: a?.siren ?? null, requis: pro && avecSirenExige },
    { libelle: "TVA intracommunautaire", valeur: a?.numero_tva_intra ?? null, requis: false },
    { libelle: "Adresse de livraison", valeur: a?.adresse_livraison ?? null, requis: false },
    { libelle: "E-mail", valeur: a?.email ?? null, requis: false },
  ];
}

/** Mention de TVA : exigée quand le régime ne facture pas de TVA ; régime inconnu : à compléter. */
export function champMentionTva(v: Pick<ParametresFacturation, "regime_tva" | "mention_tva"> | null): ChampImpression | null {
  if (!v?.regime_tva) return { libelle: "Mention de TVA", valeur: v?.mention_tva ?? null, requis: true };
  if (v.mention_tva) return { libelle: "", valeur: v.mention_tva, requis: false };
  return regimeSansTva(v.regime_tva) ? { libelle: "Mention de TVA", valeur: null, requis: true } : null;
}

export function champsPaiement(
  v: Pick<ParametresFacturation, "conditions_paiement" | "penalites_retard" | "indemnite_recouvrement" | "iban"> | null,
  clientPro: boolean,
  estFacture: boolean,
): ChampImpression[] {
  return [
    { libelle: "Conditions de paiement", valeur: v?.conditions_paiement ?? null, requis: estFacture },
    { libelle: "Pénalités de retard", valeur: v?.penalites_retard ?? null, requis: estFacture && clientPro },
    { libelle: "Indemnité forfaitaire de recouvrement", valeur: v?.indemnite_recouvrement ?? null, requis: estFacture && clientPro },
    { libelle: "IBAN", valeur: v?.iban ? formaterIban(v.iban) : null, requis: false },
  ];
}

/** Lignes prêtes à afficher (écran et impression), dans l'ordre des positions. */
export function vueLignes(lignes: LigneDocument[]) {
  return [...lignes]
    .sort((a, b) => a.position - b.position)
    .map((l) => ({
      id: l.id,
      designation: l.designation,
      quantite: formaterQuantite(quantiteDepuisBase(l.quantite)),
      unite: l.unite,
      prixUnitaireCentimes: Number(l.prix_unitaire_ht_centimes),
      taux: formaterTaux(Number(l.taux_tva_centiemes)),
      montantHtCentimes: Number(l.montant_ht_centimes),
    }));
}

/** Totaux prêts à afficher (taux formatés). */
export function vueTotaux(t: Totaux) {
  return {
    parTaux: t.parTaux.map((x) => ({ taux: formaterTaux(x.tauxCentiemes), baseHtCentimes: x.baseHtCentimes, tvaCentimes: x.tvaCentimes })),
    totalHtCentimes: t.totalHtCentimes,
    totalTvaCentimes: t.totalTvaCentimes,
    totalTtcCentimes: t.totalTtcCentimes,
  };
}

/** IBAN par groupes de quatre caractères. */
export function formaterIban(iban: string): string {
  return iban.replace(/(.{4})/g, "$1 ").trim();
}

// ============================================================================
// Statuts calculés, avoirs et corrections
// ============================================================================

/**
 * [09/11/2026] Statut affiché d'une FACTURE (sens facture). Jamais saisi :
 *  - brouillon tant qu'elle n'est pas émise ;
 *  - annulée par avoir si les avoirs émis couvrent tout le TTC ;
 *  - sinon payée si les encaissements couvrent le reste dû (TTC − avoirs),
 *    payée partiellement s'il y en a, émise sinon.
 * Un avoir n'a que brouillon ou émise.
 */
export function statutFacture(
  f: Pick<Facture, "statut" | "sens" | "total_ttc_centimes">,
  encaisseCentimes: number,
  avoirsCentimes: number,
): StatutFacture {
  if (f.statut === "brouillon") return "brouillon";
  if (f.sens === "avoir") return "emise";
  const ttc = Number(f.total_ttc_centimes ?? 0);
  if (avoirsCentimes >= ttc) return "annulee";
  if (encaisseCentimes > 0 && encaisseCentimes >= ttc - avoirsCentimes) return "payee";
  if (encaisseCentimes > 0) return "payee_partiellement";
  return "emise";
}

/** Reste à encaisser = TTC − avoirs émis − encaissements, jamais négatif ; 0 pour un brouillon ou un avoir. */
export function resteAEncaisser(f: Pick<Facture, "statut" | "sens" | "total_ttc_centimes">, encaisseCentimes: number, avoirsCentimes: number): number {
  if (f.statut !== "emise" || f.sens !== "facture") return 0;
  return Math.max(0, Number(f.total_ttc_centimes ?? 0) - avoirsCentimes - encaisseCentimes);
}

/** Somme des encaissements par facture (une passe). */
export function encaissementsParFacture(paiements: { facture_id: string; montant_centimes: number }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of paiements) m.set(p.facture_id, (m.get(p.facture_id) ?? 0) + Number(p.montant_centimes));
  return m;
}

/** Somme des avoirs ÉMIS par facture d'origine. */
export function avoirsParFacture(factures: Pick<Facture, "sens" | "statut" | "facture_origine_id" | "total_ttc_centimes">[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const f of factures) {
    if (f.sens === "avoir" && f.statut === "emise" && f.facture_origine_id) {
      m.set(f.facture_origine_id, (m.get(f.facture_origine_id) ?? 0) + Number(f.total_ttc_centimes ?? 0));
    }
  }
  return m;
}

/** Avoirs déjà liés à une facture : un brouillon en cours, et le TTC des avoirs émis. */
export interface EtatAvoirs {
  brouillonEnCours: boolean;
  dejaAvoirCentimes: number;
}

/**
 * [09/11/2026] Brouillon d'avoir d'une facture émise : il copie les lignes
 * (montants positifs, sens « avoir ») et référence l'origine. Pour un avoir
 * PARTIEL, on ajuste ensuite les lignes du brouillon (la base refuse à
 * l'émission tout dépassement du reste). Refusé si un brouillon d'avoir est
 * déjà en cours (on le termine d'abord) ou si la facture est déjà
 * entièrement annulée.
 */
export function preparerAvoirTotal(
  f: Pick<Facture, "id" | "entite_id" | "sens" | "statut" | "numero" | "client_id" | "date_prestation" | "nature_operation" | "objet" | "tva_sur_debits" | "total_ttc_centimes">,
  lignes: LigneDocument[],
  etat: EtatAvoirs,
): Resultat<{ avoir: NouvelleFacture; lignes: NouvelleLigneDocument[] }> {
  if (f.sens !== "facture" || f.statut !== "emise") return { ok: false, erreurs: ["Un avoir se prépare depuis une facture émise."] };
  if (etat.brouillonEnCours) return { ok: false, erreurs: ["Un brouillon d'avoir existe déjà pour cette facture : complète-le ou émets-le."] };
  if (etat.dejaAvoirCentimes >= Number(f.total_ttc_centimes ?? 0)) {
    return { ok: false, erreurs: ["Cette facture est déjà entièrement annulée par avoir."] };
  }
  const partiel = etat.dejaAvoirCentimes > 0;
  return {
    ok: true,
    valeur: {
      avoir: {
        entite_id: f.entite_id,
        sens: "avoir",
        client_id: f.client_id,
        date_emission: null,
        date_prestation: f.date_prestation,
        date_echeance: null,
        nature_operation: f.nature_operation,
        tva_sur_debits: f.tva_sur_debits,
        objet: `Avoir sur la facture ${f.numero}`.slice(0, 200),
        notes: partiel
          ? `Avoir sur la facture ${f.numero}. Des avoirs existent déjà : ajuste les lignes au reste à annuler.`
          : `Avoir total annulant la facture ${f.numero}.`,
        facture_origine_id: f.id,
        correction_de: null,
      },
      lignes: copierLignes(lignes),
    },
  };
}

/**
 * [09/11/2026] « Préparer une correction » : l'avoir total ET un nouveau
 * brouillon de facture copié (correction_de = l'original). Les deux sont des
 * brouillons : rien n'est émis ni numéroté tant que l'utilisateur ne l'a pas
 * décidé. L'original n'est pas modifié.
 */
export function preparerCorrection(
  f: Pick<Facture, "id" | "entite_id" | "sens" | "statut" | "numero" | "client_id" | "date_prestation" | "date_echeance" | "nature_operation" | "objet" | "notes" | "tva_sur_debits" | "total_ttc_centimes">,
  lignes: LigneDocument[],
  etat: EtatAvoirs,
): Resultat<{ avoir: NouvelleFacture; brouillon: NouvelleFacture; lignes: NouvelleLigneDocument[] }> {
  // L'avoir d'une correction est TOTAL : impossible si un avoir existe déjà.
  if (etat.brouillonEnCours || etat.dejaAvoirCentimes > 0) {
    return { ok: false, erreurs: ["Un avoir existe déjà pour cette facture : la correction complète n'est plus possible, prépare un avoir du reste."] };
  }
  const avoir = preparerAvoirTotal(f, lignes, etat);
  if (!avoir.ok) return avoir;
  return {
    ok: true,
    valeur: {
      avoir: avoir.valeur.avoir,
      brouillon: {
        entite_id: f.entite_id,
        sens: "facture",
        client_id: f.client_id,
        date_emission: null,
        date_prestation: f.date_prestation,
        date_echeance: null,
        nature_operation: f.nature_operation,
        tva_sur_debits: f.tva_sur_debits,
        objet: f.objet,
        notes: `Remplace la facture ${f.numero}.${f.notes ? ` ${f.notes}` : ""}`.slice(0, 2000),
        facture_origine_id: null,
        correction_de: f.id,
      },
      lignes: avoir.valeur.lignes,
    },
  };
}

// ============================================================================
// Encaissements : rattacher des recettes réelles
// ============================================================================

type TxEncaissement = Pick<Transaction, "id" | "entite_id" | "type" | "virement_id" | "montant_ttc_centimes" | "date_transaction">;

/**
 * [09/11/2026] Prépare un rattachement. Miroir du trigger
 * controle_facture_paiement : facture émise (pas un avoir), recette réelle
 * hors virement, somme ≤ TTC de la facture et ≤ montant de l'opération.
 * Montant vide = le plus petit entre le reste de la facture et le reste de
 * l'opération.
 */
export function preparerEncaissement(
  f: Pick<Facture, "id" | "entite_id" | "sens" | "statut" | "total_ttc_centimes" | "numero">,
  tx: TxEncaissement,
  montantSaisi: string,
  dejaAffecteFacture: number,
  dejaAffecteOperation: number,
): Resultat<NouveauPaiementFacture> {
  if (f.statut !== "emise" || f.sens !== "facture") return { ok: false, erreurs: ["Un encaissement se rattache à une facture émise."] };
  if (tx.entite_id !== f.entite_id) return { ok: false, erreurs: ["Opération introuvable."] };
  if (tx.type !== "recette" || tx.virement_id) return { ok: false, erreurs: ["Seule une recette réelle (hors virement interne) encaisse une facture."] };
  const resteFacture = Number(f.total_ttc_centimes ?? 0) - dejaAffecteFacture;
  const resteOperation = Number(tx.montant_ttc_centimes) - dejaAffecteOperation;
  const montant = propre(montantSaisi) === "" ? Math.min(resteFacture, resteOperation) : eurosVersCentimes(montantSaisi);
  if (montant === null || montant <= 0) return { ok: false, erreurs: ["Montant affecté invalide (supérieur à 0)."] };
  if (montant > resteFacture) {
    return {
      ok: false,
      erreurs: [`Refusé : il ne reste que ${formaterCentimes(Math.max(0, resteFacture))} à encaisser sur la facture ${f.numero}.`],
    };
  }
  if (montant > resteOperation) {
    return { ok: false, erreurs: [`Refusé : il ne reste que ${formaterCentimes(Math.max(0, resteOperation))} de cette opération à affecter.`] };
  }
  return { ok: true, valeur: { entite_id: f.entite_id, facture_id: f.id, transaction_id: tx.id, montant_centimes: montant } };
}

/**
 * Recettes réelles qui peuvent encore encaisser : hors virement, avec un
 * reste non affecté. Celles dont le reste égale le reste dû d'abord, puis par
 * date décroissante.
 */
export function candidatesEncaissement<T extends TxEncaissement>(
  transactions: T[],
  affecteParOperation: Map<string, number>,
  resteFacture: number,
): (T & { resteCentimes: number })[] {
  return transactions
    .filter((t) => t.type === "recette" && !t.virement_id)
    .map((t) => ({ ...t, resteCentimes: Number(t.montant_ttc_centimes) - (affecteParOperation.get(t.id) ?? 0) }))
    .filter((t) => t.resteCentimes > 0)
    .sort(
      (a, b) =>
        Number(b.resteCentimes === resteFacture) - Number(a.resteCentimes === resteFacture) ||
        b.date_transaction.localeCompare(a.date_transaction),
    );
}

/** Somme affectée par opération (une passe). */
export function affecteParOperation(paiements: { transaction_id: string; montant_centimes: number }[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of paiements) m.set(p.transaction_id, (m.get(p.transaction_id) ?? 0) + Number(p.montant_centimes));
  return m;
}

/** Catégorie « Ventes et prestations » (recette, active) si elle existe : proposée, jamais imposée. */
export function categorieVentes(categories: Pick<Categorie, "id" | "nom" | "type" | "active">[]): string | null {
  const cible = normaliser(NOM_CATEGORIE_VENTES);
  return categories.find((c) => c.type === "recette" && c.active && normaliser(c.nom) === cible)?.id ?? null;
}

// ============================================================================
// Listes : filtres et exercices
// ============================================================================

export interface Filtre {
  statut?: string;
  exercice?: string;
  clientId?: string;
}

export function filtrerDevis<T extends Pick<Devis, "statut" | "date_devis" | "date_fin_validite" | "client_id">>(
  devis: T[],
  f: Filtre,
  aujourdHui: string,
): T[] {
  return devis.filter((d) => {
    if (f.statut && f.statut in LIBELLES_STATUT_DEVIS && statutDevis(d, aujourdHui) !== f.statut) return false;
    if (f.exercice && /^\d{4}$/.test(f.exercice) && !d.date_devis.startsWith(f.exercice)) return false;
    if (f.clientId && d.client_id !== f.clientId) return false;
    return true;
  });
}

/** Date de référence d'une facture pour l'exercice : émission, sinon création (brouillon). */
export function dateReference(f: Pick<Facture, "date_emission" | "cree_le">): string {
  return f.date_emission ?? f.cree_le.slice(0, 10);
}

export function filtrerFactures<T extends Pick<Facture, "date_emission" | "cree_le" | "client_id"> & { statutAffiche: StatutFacture }>(
  factures: T[],
  f: Filtre,
): T[] {
  return factures.filter((x) => {
    if (f.statut && f.statut in LIBELLES_STATUT_FACTURE && x.statutAffiche !== f.statut) return false;
    if (f.exercice && /^\d{4}$/.test(f.exercice) && !dateReference(x).startsWith(f.exercice)) return false;
    if (f.clientId && x.client_id !== f.clientId) return false;
    return true;
  });
}

export function exercicesDe(dates: string[]): number[] {
  return [...new Set(dates.map((d) => Number(d.slice(0, 4))))].sort((a, b) => b - a);
}

/** Dernière date d'émission d'une série (sens) dans la structure, pour le contrôle de chronologie. */
export function derniereDateEmise(factures: Pick<Facture, "sens" | "statut" | "date_emission">[], sens: Facture["sens"]): string | null {
  let max: string | null = null;
  for (const f of factures) {
    if (f.sens === sens && f.statut === "emise" && f.date_emission && (!max || f.date_emission > max)) max = f.date_emission;
  }
  return max;
}

// ============================================================================
// Données structurées (concepts de la norme EN 16931)
// ============================================================================

const dateFr = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;

/** Centimes → décimal texte « 1234.56 » (aucun flottant). */
export function centimesVersDecimal(c: number): string {
  const n = Math.abs(c);
  return `${c < 0 ? "-" : ""}${Math.trunc(n / 100)}.${String(n % 100).padStart(2, "0")}`;
}

/** Centièmes de pour cent → « 20.00 ». */
function tauxVersDecimal(c: number): string {
  return `${Math.trunc(c / 100)}.${String(c % 100).padStart(2, "0")}`;
}

export interface DonneesStructurees {
  format: "velito-compta/en16931-concepts";
  version: 1;
  avertissement: string;
  facture: {
    numero: string; // BT-1
    date_emission: string; // BT-2
    type_document: "380" | "381"; // BT-3 : 380 facture, 381 avoir
    devise: "EUR"; // BT-5
    date_echeance: string | null; // BT-9
    date_livraison: string | null; // BT-72
    nature_operation: NatureOperation | null;
    tva_sur_debits: boolean;
    objet: string | null;
    note: string | null; // BT-22
    reference_facture_precedente: { numero: string | null; date_emission: string | null } | null; // BG-3
  };
  vendeur: {
    nom: string | null; // BT-27
    forme_juridique: string | null; // BT-33 (informations juridiques)
    capital_social: string | null;
    siren: string | null; // BT-30
    siret: string | null;
    ville_rcs: string | null;
    numero_tva: string | null; // BT-31
    adresse: string | null; // BG-5
    email: string | null; // BT-43
    regime_tva: RegimeTva | null;
    mention_tva: string | null;
  };
  acheteur: {
    nom: string; // BT-44
    type: TypeClient;
    siren: string | null; // BT-47
    numero_tva: string | null; // BT-48
    adresse: string | null; // BG-8
    email: string | null; // BT-49
  };
  livraison: { adresse: string | null } | null; // BG-15
  paiement: {
    conditions: string | null; // BT-20
    iban: string | null; // BT-84
    penalites_retard: string | null;
    indemnite_recouvrement: string | null;
  };
  lignes: {
    numero: number; // BT-126
    designation: string; // BT-153
    quantite: string; // BT-129
    unite: string | null; // BT-130 (texte libre, code UN/ECE à établir par la plateforme)
    prix_unitaire_ht: string; // BT-146
    montant_ht: string; // BT-131
    taux_tva: string; // BT-152
  }[];
  tva: {
    taux: string; // BT-119
    base_ht: string; // BT-116
    montant: string; // BT-117
    code_categorie: "S" | null; // BT-118 (S pour un taux positif ; à établir pour 0 %)
    motif_exoneration: string | null; // BT-120
  }[];
  totaux: {
    somme_lignes_ht: string; // BT-106
    total_ht: string; // BT-109
    total_tva: string; // BT-110
    total_ttc: string; // BT-112
    deja_paye: string; // BT-113
    montant_a_payer: string; // BT-115
  };
}

/**
 * [09/11/2026] Données structurées d'une facture ou d'un avoir ÉMIS, en JSON,
 * avec des champs nommés d'après les concepts de la norme EN 16931 (le
 * numéro BT-xx est en commentaire du type). AUCUNE connexion : c'est la
 * matière que la plateforme agréée choisie par la structure transformera
 * dans son format (Factur-X, UBL ou CII). Sources : instantanés vendeur et
 * acheteur figés à l'émission, jamais les fiches actuelles. Le code de
 * catégorie de TVA d'un taux 0 n'est pas deviné (null) : il dépend du motif
 * (franchise, exonération, hors champ) et se fixe avec la plateforme.
 */
export function donneesStructurees(
  f: Pick<Facture, "numero" | "sens" | "statut" | "date_emission" | "date_echeance" | "date_prestation" | "nature_operation" | "tva_sur_debits" | "objet" | "notes" | "total_ht_centimes" | "total_tva_centimes" | "total_ttc_centimes" | "vendeur" | "acheteur">,
  lignes: LigneDocument[],
  origine: { numero: string | null; date_emission: string | null } | null,
  dejaEncaisseCentimes: number,
): Resultat<DonneesStructurees> {
  if (f.statut !== "emise" || !f.numero || !f.date_emission || !f.vendeur || !f.acheteur) {
    return { ok: false, erreurs: ["Seul un document émis a des données structurées (numéro légal, instantanés)."] };
  }
  const v: InstantaneVendeur = f.vendeur;
  const a: InstantaneAcheteur = f.acheteur;
  const totaux = calculerTotaux(lignes);
  const ttc = Number(f.total_ttc_centimes);
  const tries = [...lignes].sort((x, y) => x.position - y.position);
  return {
    ok: true,
    valeur: {
      format: "velito-compta/en16931-concepts",
      version: 1,
      avertissement: "Données préparées pour une plateforme agréée. Elles ne constituent pas un envoi.",
      facture: {
        numero: f.numero,
        date_emission: f.date_emission,
        type_document: f.sens === "avoir" ? "381" : "380",
        devise: "EUR",
        date_echeance: f.date_echeance,
        date_livraison: f.date_prestation,
        nature_operation: f.nature_operation,
        tva_sur_debits: f.tva_sur_debits,
        objet: f.objet,
        note: f.notes,
        reference_facture_precedente: origine,
      },
      vendeur: {
        nom: v.denomination,
        forme_juridique: v.forme_juridique,
        capital_social: v.capital_social_centimes === null ? null : centimesVersDecimal(Number(v.capital_social_centimes)),
        siren: v.siren,
        siret: v.siret,
        ville_rcs: v.ville_rcs,
        numero_tva: v.numero_tva_intra,
        adresse: v.adresse,
        email: v.email,
        regime_tva: v.regime_tva,
        mention_tva: v.mention_tva,
      },
      acheteur: {
        nom: a.nom,
        type: a.type_client,
        siren: a.siren,
        numero_tva: a.numero_tva_intra,
        adresse: a.adresse_facturation,
        email: a.email,
      },
      livraison: a.adresse_livraison ? { adresse: a.adresse_livraison } : null,
      paiement: {
        conditions: v.conditions_paiement,
        iban: v.iban,
        penalites_retard: v.penalites_retard,
        indemnite_recouvrement: v.indemnite_recouvrement,
      },
      lignes: tries.map((l, i) => ({
        numero: i + 1,
        designation: l.designation,
        quantite: milliemesVersTexte(quantiteDepuisBase(l.quantite)),
        unite: l.unite,
        prix_unitaire_ht: centimesVersDecimal(Number(l.prix_unitaire_ht_centimes)),
        montant_ht: centimesVersDecimal(Number(l.montant_ht_centimes)),
        taux_tva: tauxVersDecimal(Number(l.taux_tva_centiemes)),
      })),
      tva: totaux.parTaux.map((t) => ({
        taux: tauxVersDecimal(t.tauxCentiemes),
        base_ht: centimesVersDecimal(t.baseHtCentimes),
        montant: centimesVersDecimal(t.tvaCentimes),
        code_categorie: t.tauxCentiemes > 0 ? "S" : null,
        motif_exoneration: t.tauxCentiemes === 0 ? v.mention_tva : null,
      })),
      totaux: {
        somme_lignes_ht: centimesVersDecimal(totaux.totalHtCentimes),
        total_ht: centimesVersDecimal(Number(f.total_ht_centimes)),
        total_tva: centimesVersDecimal(Number(f.total_tva_centimes)),
        total_ttc: centimesVersDecimal(ttc),
        deja_paye: centimesVersDecimal(dejaEncaisseCentimes),
        montant_a_payer: centimesVersDecimal(Math.max(0, ttc - dejaEncaisseCentimes)),
      },
    },
  };
}

/** Nom du fichier JSON : « FAC-2026-0001.json ». */
export function nomFichierJson(numero: string): string {
  return `${numero.replace(/[^A-Z0-9-]/gi, "_")}.json`;
}

// ============================================================================
// Export CSV de la liste des factures
// ============================================================================

export const EN_TETES_CSV_FACTURES = [
  "Numéro",
  "Type",
  "Date d'émission",
  "Client",
  "Statut",
  "Total HT",
  "TVA",
  "Total TTC",
  "Encaissé",
  "Reste à encaisser",
  "Échéance",
] as const;

export interface LigneCsvFacture {
  numero: string | null;
  sens: Facture["sens"];
  dateEmission: string | null;
  client: string;
  statut: StatutFacture;
  htCentimes: number;
  tvaCentimes: number;
  ttcCentimes: number;
  encaisseCentimes: number;
  resteCentimes: number;
  echeance: string | null;
}

/** CSV « ; » + CRLF, comme services/export (Excel en français). Le BOM est ajouté par la route. */
export function genererCsvFactures(lignes: LigneCsvFacture[]): string {
  const l = (champs: readonly string[]) => champs.map(echapperChampCsv).join(";");
  return (
    [
      l(EN_TETES_CSV_FACTURES),
      ...lignes.map((x) =>
        l([
          x.numero ?? "Brouillon",
          x.sens === "avoir" ? "Avoir" : "Facture",
          x.dateEmission ? dateFr(x.dateEmission) : "",
          x.client,
          LIBELLES_STATUT_FACTURE[x.statut],
          centimesVersSaisie(x.htCentimes),
          centimesVersSaisie(x.tvaCentimes),
          centimesVersSaisie(x.ttcCentimes),
          centimesVersSaisie(x.encaisseCentimes),
          centimesVersSaisie(x.resteCentimes),
          x.echeance ? dateFr(x.echeance) : "",
        ]),
      ),
    ].join("\r\n") + "\r\n"
  );
}
