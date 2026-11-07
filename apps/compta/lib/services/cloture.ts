/**
 * SERVICE CLÔTURE D'EXERCICE — couche logique métier (07/11/2026).
 *
 * Fonctions 100 % PURES : aucune base, aucune date « maintenant » cachée (on
 * la passe en paramètre). Testées dans cloture.test.ts ; la signature est en
 * plus comparée à celle de Postgres dans sql/test_cloture.mjs.
 *
 * Règles reprises du cahier des charges « Compta Nova » (sql/10_cloture.sql) :
 *   - l'exercice est l'ANNÉE CIVILE de date_transaction ;
 *   - une ligne se contrôle sur quatre dimensions INDÉPENDANTES : classement,
 *     validation, justification (pièce OU exception motivée), pointage sur le
 *     relevé (comptes courant et livret seulement). « Validé » ne vaut ni
 *     pointage ni justification ;
 *   - jambe de virement interne : dispensée de catégorie et de pièce, mais
 *     pointée si elle est sur un compte bancaire ;
 *   - une ligne sans compte bloque la clôture ;
 *   - un mois sans mouvement n'est JAMAIS terminé d'office : il faut un relevé
 *     du mois, saisi et concordant.
 * Tous les montants sont en CENTIMES entiers. Inconnu = null, jamais 0.
 */
import type {
  Categorie,
  CompteTresorerie,
  NatureCompte,
  SoldeObserve,
  Transaction,
  TypeFlux,
} from "@/types/database";
import { formaterCentimes } from "@/lib/services/montants";
import { controleMensuel, finDeMois, soldeRepris, type LigneControle } from "@/lib/services/tresorerie";

// ============================================================================
// Types propres à la clôture (colonnes ajoutées par sql/10)
// ============================================================================

/** Colonnes de `transaction` ajoutées par sql/10 (pas encore dans types/database). */
export interface ChampsControle {
  pointe_le: string | null;
  pointe_ref: string | null;
  exception_justificatif: string | null;
}

/** Une ligne telle que la lit la clôture : transaction + pointage + exception. */
export type LigneControlee = Transaction & ChampsControle;

export type StatutCloture = "cloture" | "rouvert";

/** Miroir de la table cloture_exercice (sql/10). */
export interface ClotureExercice {
  id: string;
  entite_id: string;
  exercice: number;
  statut: StatutCloture;
  cloture_le: string;
  cloture_par: string | null;
  motif: string;
  instantane: Instantane;
  signature: string;
  rouvert_le: string | null;
  rouvert_par: string | null;
  motif_reouverture: string | null;
}

type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreur: string };

// Bornes : les mêmes que les CHECK de sql/10.
export const POINTE_REF_MIN = 3;
export const POINTE_REF_MAX = 120;
export const EXCEPTION_MIN = 10;
export const EXCEPTION_MAX = 1000;
export const MOTIF_MAX = 500;
export const MOTIF_REOUVERTURE_MIN = 10;

// ============================================================================
// Exercice et comptes
// ============================================================================

/** Le pointage n'est exigé que sur ces natures (pour une caisse : le comptage). */
export const NATURES_BANCAIRES: readonly NatureCompte[] = ["courant", "livret"];

export function estCompteBancaire(nature: NatureCompte | null | undefined): boolean {
  return nature !== null && nature !== undefined && NATURES_BANCAIRES.includes(nature);
}

export function exerciceDe(date: string): number {
  return Number(date.slice(0, 4));
}

export function bornesExercice(annee: number): { debut: string; fin: string } {
  return { debut: `${annee}-01-01`, fin: `${annee}-12-31` };
}

/** Terminé = on est APRÈS le 31/12 (même règle que current_date > fin en SQL). */
export function estExerciceTermine(annee: number, aujourdHui: string): boolean {
  return aujourdHui > bornesExercice(annee).fin;
}

function dansExercice(date: string, annee: number): boolean {
  return date.startsWith(`${annee}-`);
}

function dateFr(iso: string): string {
  return `${iso.slice(8, 10)}/${iso.slice(5, 7)}/${iso.slice(0, 4)}`;
}

// ============================================================================
// État d'une ligne sur les quatre dimensions
// ============================================================================

/** ok = fait ; manquant = bloque la clôture ; dispense = non exigé pour cette ligne. */
export type EtatDimension = "ok" | "manquant" | "dispense";

export interface EtatLigne {
  classement: EtatDimension;
  validation: EtatDimension;
  justification: EtatDimension;
  pointage: EtatDimension;
  sansCompte: boolean;
  bloquante: boolean;
}

type LignePourEtat = Pick<
  LigneControlee,
  "statut" | "categorie_id" | "virement_id" | "compte_tresorerie_id" | "pointe_le" | "pointe_ref" | "exception_justificatif"
>;

export function exceptionValable(texte: string | null | undefined): boolean {
  return (texte ?? "").trim().length >= EXCEPTION_MIN;
}

export function estPointee(t: Pick<LigneControlee, "pointe_le" | "pointe_ref">): boolean {
  return t.pointe_le !== null && (t.pointe_ref ?? "").trim().length >= POINTE_REF_MIN;
}

/**
 * État d'une ligne. Même règle, ligne pour ligne, que les compteurs de
 * cloturer_exercice() en SQL.
 * @param natureCompte nature du compte de la ligne, null si sans compte.
 * @param aUnePiece au moins un justificatif joint.
 */
export function etatLigne(t: LignePourEtat, natureCompte: NatureCompte | null, aUnePiece: boolean): EtatLigne {
  const virement = t.virement_id !== null && t.virement_id !== undefined;
  const classement: EtatDimension = virement ? "dispense" : t.categorie_id ? "ok" : "manquant";
  const validation: EtatDimension = t.statut === "validee" ? "ok" : "manquant";
  const justification: EtatDimension = virement
    ? "dispense"
    : aUnePiece || exceptionValable(t.exception_justificatif)
      ? "ok"
      : "manquant";
  const pointage: EtatDimension = !estCompteBancaire(natureCompte) ? "dispense" : estPointee(t) ? "ok" : "manquant";
  const sansCompte = t.compte_tresorerie_id === null;
  const bloquante =
    sansCompte || [classement, validation, justification, pointage].some((d) => d === "manquant");
  return { classement, validation, justification, pointage, sansCompte, bloquante };
}

// ============================================================================
// Données d'un exercice (ce que la page et l'action chargent)
// ============================================================================

type Observation = Pick<SoldeObserve, "compte_id" | "date_releve" | "solde_centimes" | "reference">;

export interface DonneesExercice {
  entiteId: string;
  annee: number;
  /** "AAAA-MM-JJ", passé en paramètre (pureté, tests). */
  aujourdHui: string;
  comptes: CompteTresorerie[];
  /** Lignes de l'entité, au moins jusqu'au 31/12 de l'exercice (pour les soldes). */
  lignes: LigneControlee[];
  /** Ids des lignes qui ont au moins une pièce jointe. */
  idsAvecPiece: Set<string>;
  observations: Observation[];
}

function natureParCompte(comptes: CompteTresorerie[]): Map<string, NatureCompte> {
  return new Map(comptes.map((c) => [c.id, c.nature]));
}

function etatDe(t: LigneControlee, natures: Map<string, NatureCompte>, idsAvecPiece: Set<string>): EtatLigne {
  const nature = t.compte_tresorerie_id ? natures.get(t.compte_tresorerie_id) ?? null : null;
  return etatLigne(t, nature, idsAvecPiece.has(t.id));
}

export interface CompteursBlocage {
  nonValidees: number;
  nonClassees: number;
  sansCompte: number;
  nonJustifiees: number;
  nonPointees: number;
}

/** Compteurs sur un ensemble de lignes (un exercice ou un mois). */
export function compterBlocages(
  lignes: LigneControlee[],
  comptes: CompteTresorerie[],
  idsAvecPiece: Set<string>,
): CompteursBlocage {
  const natures = natureParCompte(comptes);
  const c: CompteursBlocage = { nonValidees: 0, nonClassees: 0, sansCompte: 0, nonJustifiees: 0, nonPointees: 0 };
  for (const t of lignes) {
    const e = etatDe(t, natures, idsAvecPiece);
    if (e.validation === "manquant") c.nonValidees++;
    if (e.classement === "manquant") c.nonClassees++;
    if (e.sansCompte) c.sansCompte++;
    if (e.justification === "manquant") c.nonJustifiees++;
    if (e.pointage === "manquant") c.nonPointees++;
  }
  return c;
}

// ============================================================================
// Concordance des comptes bancaires au dernier relevé de décembre
// ============================================================================

export type EtatSoldeDecembre = "concorde" | "ecart" | "releve_manquant" | "solde_initial_inconnu";

export interface ControleSoldeDecembre {
  compteId: string;
  nom: string;
  etat: EtatSoldeDecembre;
  dateReleve: string | null;
  soldeObserve: number | null;
  soldeAttendu: number | null;
}

/**
 * Comptes bancaires concernés par l'exercice : courant ou livret, ET des
 * lignes dans l'exercice, OU actif avec quelque chose de connu au plus tard le
 * 31/12 (solde initial, ligne, relevé). Même règle que controle_soldes_decembre.
 */
export function comptesBancairesConcernes(
  comptes: CompteTresorerie[],
  lignes: Pick<Transaction, "compte_tresorerie_id" | "date_transaction">[],
  observations: Observation[],
  annee: number,
): CompteTresorerie[] {
  const { fin } = bornesExercice(annee);
  return comptes.filter((c) => {
    if (!estCompteBancaire(c.nature)) return false;
    const duCompte = lignes.filter((t) => t.compte_tresorerie_id === c.id);
    if (duCompte.some((t) => dansExercice(t.date_transaction, annee))) return true;
    if (!c.active) return false;
    return (
      (c.date_solde_initial !== null && c.date_solde_initial <= fin) ||
      duCompte.some((t) => t.date_transaction <= fin) ||
      observations.some((o) => o.compte_id === c.id && o.date_releve <= fin)
    );
  });
}

/**
 * Pour chaque compte bancaire concerné : le dernier relevé de décembre
 * concorde-t-il avec le solde reconstruit depuis le relevé précédent (ou le
 * solde initial) ? Même calcul que soldeRepris(strict) et que la fonction SQL.
 */
export function controleSoldesDecembre(
  comptes: CompteTresorerie[],
  lignes: LigneControlee[],
  observations: Observation[],
  annee: number,
): ControleSoldeDecembre[] {
  const debutDecembre = `${annee}-12-01`;
  const { fin } = bornesExercice(annee);
  return comptesBancairesConcernes(comptes, lignes, observations, annee).map((c) => {
    const obs = observations
      .filter((o) => o.compte_id === c.id && o.date_releve >= debutDecembre && o.date_releve <= fin)
      .sort((a, b) => b.date_releve.localeCompare(a.date_releve))[0];
    if (!obs) {
      return { compteId: c.id, nom: c.nom, etat: "releve_manquant", dateReleve: null, soldeObserve: null, soldeAttendu: null };
    }
    const attendu = soldeRepris(c, lignes, observations, obs.date_releve, true);
    const etat: EtatSoldeDecembre =
      attendu === null ? "solde_initial_inconnu" : attendu === obs.solde_centimes ? "concorde" : "ecart";
    return {
      compteId: c.id,
      nom: c.nom,
      etat,
      dateReleve: obs.date_releve,
      soldeObserve: obs.solde_centimes,
      soldeAttendu: attendu,
    };
  });
}

export const LIBELLES_SOLDE_DECEMBRE: Record<EtatSoldeDecembre, string> = {
  concorde: "Concorde",
  ecart: "Écart avec le relevé",
  releve_manquant: "Relevé de décembre à saisir",
  solde_initial_inconnu: "Solde initial inconnu",
};

// ============================================================================
// Mois terminés
// ============================================================================

export interface EtatMoisCloture {
  mois: number; // 1..12
  termine: boolean;
  /** Pourquoi le mois n'est pas terminé (vide si terminé). */
  raisons: string[];
}

function pluriel(n: number, singulier: string, plurielTexte: string): string {
  return `${n} ${n > 1 ? plurielTexte : singulier}`;
}

/**
 * Un mois est terminé si : il est passé ; toutes ses lignes sont validées,
 * justifiées, avec un compte, pointées si bancaires ; et chaque compte
 * bancaire actif (ou ayant bougé ce mois-là) a un relevé du mois qui concorde
 * (état « concorde » de controleMensuel). Au moins un relevé concordant est
 * exigé : un mois sans mouvement ne se termine jamais tout seul.
 */
export function moisTermines(d: DonneesExercice): EtatMoisCloture[] {
  const controles = new Map<string, LigneControle[]>();
  const controleDe = (c: CompteTresorerie) => {
    let l = controles.get(c.id);
    if (!l) {
      l = controleMensuel(c, d.lignes, d.observations, d.annee, d.aujourdHui);
      controles.set(c.id, l);
    }
    return l;
  };
  const bancaires = d.comptes.filter((c) => estCompteBancaire(c.nature));

  const resultat: EtatMoisCloture[] = [];
  for (let mois = 1; mois <= 12; mois++) {
    const prefixe = `${d.annee}-${String(mois).padStart(2, "0")}`;
    const raisons: string[] = [];

    if (finDeMois(d.annee, mois) >= d.aujourdHui) {
      resultat.push({ mois, termine: false, raisons: ["Mois pas encore terminé."] });
      continue;
    }

    const duMois = d.lignes.filter((t) => t.date_transaction.startsWith(prefixe));
    const b = compterBlocages(duMois, d.comptes, d.idsAvecPiece);
    if (b.nonValidees) raisons.push(pluriel(b.nonValidees, "ligne non validée", "lignes non validées"));
    if (b.nonClassees) raisons.push(pluriel(b.nonClassees, "ligne sans catégorie", "lignes sans catégorie"));
    if (b.sansCompte) raisons.push(pluriel(b.sansCompte, "ligne sans compte", "lignes sans compte"));
    if (b.nonJustifiees) raisons.push(pluriel(b.nonJustifiees, "ligne sans justificatif", "lignes sans justificatif"));
    if (b.nonPointees) raisons.push(pluriel(b.nonPointees, "ligne bancaire non pointée", "lignes bancaires non pointées"));

    let concordants = 0;
    let comptesVus = 0;
    for (const c of bancaires) {
      const aBouge = duMois.some((t) => t.compte_tresorerie_id === c.id);
      if (!c.active && !aBouge) continue;
      const l = controleDe(c)[mois - 1]!;
      if (l.etat === "avant_ouverture") continue;
      comptesVus++;
      if (l.etat === "concorde") concordants++;
      else if (l.etat === "ecart") raisons.push(`${c.nom} : écart de ${formaterCentimes(l.ecart ?? 0)} avec le relevé.`);
      else if (l.etat === "non_observe") raisons.push(`${c.nom} : relevé du mois à saisir.`);
      else if (l.etat === "solde_initial_inconnu") raisons.push(`${c.nom} : solde initial inconnu.`);
    }
    if (comptesVus === 0) {
      raisons.push("Aucun compte bancaire ouvert ce mois-là : aucun relevé ne peut l'attester.");
    } else if (concordants === 0 && raisons.length === 0) {
      raisons.push("Aucun relevé concordant pour ce mois.");
    }

    resultat.push({ mois, termine: raisons.length === 0, raisons });
  }
  return resultat;
}

// ============================================================================
// Checklist de clôture
// ============================================================================

export type CodeControle =
  | "exercice_termine"
  | "non_validees"
  | "non_classees"
  | "sans_compte"
  | "non_justifiees"
  | "non_pointees"
  | "soldes_decembre";

export interface SousPoint {
  libelle: string;
  nombre: number;
  lien: string;
}

export interface PointChecklist {
  code: CodeControle;
  libelle: string;
  ok: boolean;
  /** Nombre de blocages (0 si ok). */
  nombre: number;
  /** Où corriger (null si rien à faire dans l'app). */
  lien: string | null;
  sousPoints: SousPoint[];
}

export interface Checklist {
  points: PointChecklist[];
  /** Somme des blocages de tous les points. */
  nbBlocages: number;
  toutVert: boolean;
  nbLignes: number;
  signature: string;
  soldesDecembre: ControleSoldeDecembre[];
}

/**
 * Checklist de clôture d'un exercice. Chaque point porte son nombre de
 * blocages et le lien de la page où le corriger. Le motif, lui, se saisit
 * dans le formulaire : il n'est pas dans la checklist.
 */
export function checklistCloture(d: DonneesExercice): Checklist {
  const base = `/${d.entiteId}`;
  const lignesExercice = d.lignes.filter((t) => dansExercice(t.date_transaction, d.annee));
  const b = compterBlocages(lignesExercice, d.comptes, d.idsAvecPiece);
  const natures = natureParCompte(d.comptes);

  // Lignes non pointées, par compte : lien vers le premier mois à pointer.
  const nonPointeesParCompte = new Map<string, { nombre: number; premierMois: string }>();
  for (const t of lignesExercice) {
    if (etatDe(t, natures, d.idsAvecPiece).pointage !== "manquant") continue;
    const id = t.compte_tresorerie_id as string;
    const mois = t.date_transaction.slice(0, 7);
    const actuel = nonPointeesParCompte.get(id);
    if (!actuel) nonPointeesParCompte.set(id, { nombre: 1, premierMois: mois });
    else {
      actuel.nombre++;
      if (mois < actuel.premierMois) actuel.premierMois = mois;
    }
  }
  const nomCompte = new Map(d.comptes.map((c) => [c.id, c.nom]));
  const sousPointage: SousPoint[] = [...nonPointeesParCompte.entries()].map(([id, v]) => ({
    libelle: nomCompte.get(id) ?? "Compte",
    nombre: v.nombre,
    lien: `${base}/tresorerie/${id}/pointage?mois=${v.premierMois}`,
  }));

  const soldesDecembre = controleSoldesDecembre(d.comptes, d.lignes, d.observations, d.annee);
  const soldesEnDefaut = soldesDecembre.filter((s) => s.etat !== "concorde");
  const sousSoldes: SousPoint[] = soldesEnDefaut.map((s) => ({
    libelle: `${s.nom} : ${LIBELLES_SOLDE_DECEMBRE[s.etat]}`,
    nombre: 1,
    lien: `${base}/tresorerie/${s.compteId}?annee=${d.annee}`,
  }));

  const termine = estExerciceTermine(d.annee, d.aujourdHui);
  const point = (
    code: CodeControle,
    libelle: string,
    nombre: number,
    lien: string | null,
    sousPoints: SousPoint[] = [],
  ): PointChecklist => ({ code, libelle, ok: nombre === 0, nombre, lien: nombre === 0 ? null : lien, sousPoints });

  const points: PointChecklist[] = [
    point(
      "exercice_termine",
      termine ? `Exercice ${d.annee} terminé` : `Exercice ${d.annee} pas encore terminé (clôture possible à partir du 01/01/${d.annee + 1})`,
      termine ? 0 : 1,
      null,
    ),
    point("non_validees", "Lignes validées", b.nonValidees, `${base}/a-traiter`),
    point("non_classees", "Lignes classées dans une catégorie (hors virements internes)", b.nonClassees, `${base}/a-traiter`),
    point("sans_compte", "Lignes rattachées à un compte", b.sansCompte, `${base}/transactions?compte=sans`),
    point(
      "non_justifiees",
      "Lignes justifiées (pièce jointe ou exception motivée, hors virements internes)",
      b.nonJustifiees,
      `${base}/transactions/sans-justificatif?exercice=${d.annee}`,
    ),
    point(
      "non_pointees",
      "Lignes bancaires pointées sur le relevé",
      b.nonPointees,
      sousPointage[0]?.lien ?? null,
      sousPointage,
    ),
    point(
      "soldes_decembre",
      "Comptes bancaires concordants au dernier relevé de décembre",
      soldesEnDefaut.length,
      sousSoldes[0]?.lien ?? null,
      sousSoldes,
    ),
  ];

  const nbBlocages = points.reduce((s, p) => s + p.nombre, 0);
  return {
    points,
    nbBlocages,
    toutVert: nbBlocages === 0,
    nbLignes: lignesExercice.length,
    signature: signatureExercice(d.lignes, d.annee),
    soldesDecembre,
  };
}

// ============================================================================
// Signature (identique à public.signature_exercice en SQL)
// ============================================================================

const RE_HORODATAGE =
  /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?(Z|[+-]\d{2}(?::?\d{2})?)?$/;

/**
 * [07/11/2026] Horodatage Postgres (« 2026-11-07T10:20:30.123456+00:00 » tel
 * que renvoyé par Supabase) → microsecondes depuis 1970. On ne passe PAS par
 * Date : elle tronque à la milliseconde, la signature ne correspondrait plus.
 * null si le texte n'est pas un horodatage.
 */
export function horodatageEnMicrosecondes(texte: string): number | null {
  const m = RE_HORODATAGE.exec(texte.trim());
  if (!m) return null;
  const [, a, mo, j, h, mi, s, fraction, fuseau] = m;
  let decalageMinutes = 0;
  if (fuseau && fuseau !== "Z") {
    const signe = fuseau.startsWith("-") ? -1 : 1;
    const chiffres = fuseau.slice(1).replace(":", "");
    decalageMinutes = signe * (Number(chiffres.slice(0, 2)) * 60 + Number(chiffres.slice(2, 4) || "0"));
  }
  const ms = Date.UTC(Number(a), Number(mo) - 1, Number(j), Number(h), Number(mi), Number(s)) - decalageMinutes * 60000;
  // floor() comme en SQL : au-delà de 6 chiffres, on tronque.
  const micro = Number((fraction ?? "").slice(0, 6).padEnd(6, "0"));
  return ms * 1000 + micro;
}

/**
 * Signature des lignes d'un exercice : « nombre|somme signée|max(modifie_le)
 * en microsecondes ». Même formule que public.signature_exercice (sql/10).
 * Calculée à l'affichage, renvoyée par le navigateur, recalculée en base : si
 * une ligne a bougé entre-temps, la clôture est refusée.
 */
export function signatureExercice(
  lignes: Pick<Transaction, "date_transaction" | "type" | "montant_ttc_centimes" | "modifie_le">[],
  annee: number,
): string {
  let n = 0;
  let somme = 0;
  let max = 0;
  for (const t of lignes) {
    if (!dansExercice(t.date_transaction, annee)) continue;
    n++;
    somme += t.type === "recette" ? t.montant_ttc_centimes : -t.montant_ttc_centimes;
    const micro = horodatageEnMicrosecondes(t.modifie_le);
    if (micro === null) throw new Error(`Horodatage illisible : ${t.modifie_le}`);
    if (n === 1 || micro > max) max = micro;
  }
  return `${n}|${somme}|${n === 0 ? 0 : max}`;
}

// ============================================================================
// Instantané figé à la clôture
// ============================================================================

export interface TotalCategorie {
  categorieId: string | null;
  nom: string;
  type: TypeFlux;
  totalCentimes: number;
  nbLignes: number;
}

export interface SoldeFinExercice {
  compteId: string;
  nom: string;
  nature: NatureCompte;
  /** null = solde inconnu (jamais 0 inventé). */
  soldeCentimes: number | null;
}

export interface Instantane {
  version: 1;
  exercice: number;
  /** Jour du calcul (AAAA-MM-JJ). */
  calculeLe: string;
  signature: string;
  nbLignes: number;
  /** Hors virements internes. */
  recettesCentimes: number;
  depensesCentimes: number;
  resultatCentimes: number;
  categories: TotalCategorie[];
  soldes: SoldeFinExercice[];
  controles: { compteId: string; nom: string; mois: LigneControle[] }[];
  soldesDecembre: ControleSoldeDecembre[];
}

/**
 * Instantané de l'exercice : totaux hors virements par catégorie, solde de
 * chaque compte au 31/12, nombre de lignes, contrôles mensuels. Une fois
 * enregistré, il ne bouge plus, même si l'exercice est rouvert puis modifié :
 * c'est la trace de ce qui a été clôturé.
 */
export function construireInstantane(
  d: DonneesExercice,
  categories: Pick<Categorie, "id" | "nom" | "type">[],
): Instantane {
  const { fin } = bornesExercice(d.annee);
  const lignesExercice = d.lignes.filter((t) => dansExercice(t.date_transaction, d.annee));
  const nomsCategories = new Map(categories.map((c) => [c.id, c.nom]));

  let recettes = 0;
  let depenses = 0;
  const parCategorie = new Map<string, TotalCategorie>();
  for (const t of lignesExercice) {
    if (t.virement_id) continue;
    if (t.type === "recette") recettes += t.montant_ttc_centimes;
    else depenses += t.montant_ttc_centimes;
    const cle = `${t.type}|${t.categorie_id ?? ""}`;
    const total = parCategorie.get(cle) ?? {
      categorieId: t.categorie_id,
      nom: t.categorie_id ? nomsCategories.get(t.categorie_id) ?? "Catégorie supprimée" : "Sans catégorie",
      type: t.type,
      totalCentimes: 0,
      nbLignes: 0,
    };
    total.totalCentimes += t.montant_ttc_centimes;
    total.nbLignes++;
    parCategorie.set(cle, total);
  }

  // Comptes retenus : actifs, ou ayant bougé pendant l'exercice.
  const comptes = d.comptes.filter(
    (c) => c.active || lignesExercice.some((t) => t.compte_tresorerie_id === c.id),
  );

  return {
    version: 1,
    exercice: d.annee,
    calculeLe: d.aujourdHui,
    signature: signatureExercice(d.lignes, d.annee),
    nbLignes: lignesExercice.length,
    recettesCentimes: recettes,
    depensesCentimes: depenses,
    resultatCentimes: recettes - depenses,
    categories: [...parCategorie.values()].sort(
      (a, b) => a.type.localeCompare(b.type) || a.nom.localeCompare(b.nom, "fr"),
    ),
    soldes: comptes.map((c) => ({
      compteId: c.id,
      nom: c.nom,
      nature: c.nature,
      soldeCentimes: soldeRepris(c, d.lignes, d.observations, fin),
    })),
    controles: comptes.map((c) => ({
      compteId: c.id,
      nom: c.nom,
      mois: controleMensuel(c, d.lignes, d.observations, d.annee, d.aujourdHui),
    })),
    soldesDecembre: controleSoldesDecembre(d.comptes, d.lignes, d.observations, d.annee),
  };
}

// ============================================================================
// Saisies : motifs, pointage, exception
// ============================================================================

export function validerMotifCloture(motif: string): Resultat<string> {
  const m = (motif ?? "").trim();
  if (m.length === 0) return { ok: false, erreur: "Indique le motif de la clôture." };
  if (m.length > MOTIF_MAX) return { ok: false, erreur: `Le motif ne peut pas dépasser ${MOTIF_MAX} caractères.` };
  return { ok: true, valeur: m };
}

export function validerMotifReouverture(motif: string): Resultat<string> {
  const m = (motif ?? "").trim();
  if (m.length < MOTIF_REOUVERTURE_MIN) {
    return { ok: false, erreur: `Le motif de réouverture doit faire au moins ${MOTIF_REOUVERTURE_MIN} caractères.` };
  }
  if (m.length > MOTIF_MAX) return { ok: false, erreur: `Le motif ne peut pas dépasser ${MOTIF_MAX} caractères.` };
  return { ok: true, valeur: m };
}

function estDateReelle(iso: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return false;
  return new Date(iso + "T00:00:00Z").toISOString().slice(0, 10) === iso;
}

/** "AAAA-MM" valide (mois 01 à 12). */
export function estMoisValide(mois: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(mois ?? "");
}

export interface ChampsPointage {
  pointe_le: string;
  pointe_ref: string;
}

/**
 * Pointer une ligne : date du relevé + référence (3 caractères au moins).
 * Le relevé ne peut pas être antérieur à la ligne : une opération n'apparaît
 * pas sur un relevé arrêté avant elle.
 */
export function preparerPointage(
  ligne: Pick<Transaction, "date_transaction">,
  saisie: { date: string; reference: string },
): Resultat<ChampsPointage> {
  const date = (saisie.date ?? "").trim();
  const reference = (saisie.reference ?? "").trim().replace(/\s+/g, " ");
  if (!estDateReelle(date)) return { ok: false, erreur: "La date du relevé doit être une date réelle." };
  if (date < ligne.date_transaction) {
    return { ok: false, erreur: "Le relevé ne peut pas être antérieur à l'opération." };
  }
  if (reference.length < POINTE_REF_MIN) {
    return { ok: false, erreur: `La référence du relevé doit faire au moins ${POINTE_REF_MIN} caractères.` };
  }
  if (reference.length > POINTE_REF_MAX) {
    return { ok: false, erreur: `La référence ne peut pas dépasser ${POINTE_REF_MAX} caractères.` };
  }
  return { ok: true, valeur: { pointe_le: date, pointe_ref: reference } };
}

/** Référence proposée pour un relevé : celle saisie si elle est assez longue, sinon « Relevé au JJ/MM/AAAA ». */
export function referenceReleve(dateReleve: string, reference: string | null): string {
  const r = (reference ?? "").trim();
  if (r.length >= POINTE_REF_MIN) return r.slice(0, POINTE_REF_MAX);
  return `Relevé au ${dateFr(dateReleve)}`;
}

/**
 * « Pointer toutes les lignes du mois » : permis seulement si le relevé du
 * mois CONCORDE. On ne pointe que les lignes du compte datées au plus tard du
 * jour du relevé (un relevé du 15 n'atteste pas une opération du 20), et pas
 * encore pointées.
 */
export function lignesAPointerDuMois(
  lignes: Pick<LigneControlee, "id" | "compte_tresorerie_id" | "date_transaction" | "pointe_le" | "pointe_ref">[],
  compteId: string,
  mois: string,
  controle: Pick<LigneControle, "etat" | "observe">,
): Resultat<{ ids: string[]; champs: ChampsPointage }> {
  if (controle.etat !== "concorde" || !controle.observe) {
    return { ok: false, erreur: "Le relevé du mois ne concorde pas : pointe ligne par ligne, ou corrige d'abord l'écart." };
  }
  const obs = controle.observe;
  const ids = lignes
    .filter(
      (t) =>
        t.compte_tresorerie_id === compteId &&
        t.date_transaction.startsWith(mois) &&
        t.date_transaction <= obs.date &&
        !estPointee(t),
    )
    .map((t) => t.id);
  return {
    ok: true,
    valeur: { ids, champs: { pointe_le: obs.date, pointe_ref: referenceReleve(obs.date, obs.reference) } },
  };
}

/**
 * Exception de justificatif : pourquoi il n'y a pas de pièce. Vide = on
 * retire l'exception (la ligne redevient « sans justificatif »).
 */
export function preparerException(texte: string): Resultat<string | null> {
  const t = (texte ?? "").trim();
  if (t.length === 0) return { ok: true, valeur: null };
  if (t.length < EXCEPTION_MIN) {
    return { ok: false, erreur: `Explique en au moins ${EXCEPTION_MIN} caractères pourquoi il n'y a pas de pièce.` };
  }
  if (t.length > EXCEPTION_MAX) return { ok: false, erreur: `Explication trop longue (${EXCEPTION_MAX} caractères au plus).` };
  return { ok: true, valeur: t };
}

/** Lignes d'un exercice à qui il manque la justification (pièce ou exception), virements exclus. */
export function lignesSansJustification<T extends LignePourEtat & Pick<Transaction, "id" | "date_transaction">>(
  lignes: T[],
  idsAvecPiece: Set<string>,
  annee: number | null,
): T[] {
  return lignes.filter(
    (t) =>
      (annee === null || dansExercice(t.date_transaction, annee)) &&
      etatLigne(t, null, idsAvecPiece.has(t.id)).justification === "manquant",
  );
}

// ============================================================================
// Historique
// ============================================================================

/** Clôture active d'un exercice, ou null. */
export function clotureActive(clotures: ClotureExercice[], annee: number): ClotureExercice | null {
  return clotures.find((c) => c.exercice === annee && c.statut === "cloture") ?? null;
}

/** Années proposées : de la plus ancienne ligne à l'année en cours, la plus récente d'abord. */
export function exercicesProposes(lignes: Pick<Transaction, "date_transaction">[], aujourdHui: string): number[] {
  const courante = exerciceDe(aujourdHui);
  let premiere = courante;
  for (const t of lignes) premiere = Math.min(premiere, exerciceDe(t.date_transaction));
  const annees: number[] = [];
  for (let a = courante; a >= premiere; a--) annees.push(a);
  return annees;
}
