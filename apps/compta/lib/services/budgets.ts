/**
 * SERVICE BUDGETS (07/11/2026) : fonctions PURES, sans base.
 *
 * Règles (cahier des charges « Compta Nova », reprises sans son code) :
 *  - une enveloppe = un exercice (année civile), une catégorie, un prévu ;
 *    le sens (recette ou dépense) se lit sur la catégorie (sql/11) ;
 *  - réalisé = somme des opérations de la catégorie sur l'exercice, virements
 *    internes EXCLUS ; toutes les opérations comptent quel que soit leur
 *    statut, mais on compte à côté celles qui ne sont pas encore validées ;
 *  - par catégorie : prévu, réalisé, écart (réalisé − prévu), taux ;
 *    catégorie sans enveloppe : prévu inconnu (null, affiché « — »), jamais 0 ;
 *  - comparaison annuelle : une année où l'entité n'a AUCUNE opération donne
 *    null pour toute la colonne, jamais 0 ;
 *  - une opération n'est comptée que dans SA catégorie (categorie_id), donc
 *    jamais deux fois, et renommer une catégorie ne change aucun montant
 *    (on agrège par identifiant, le nom n'est qu'une étiquette).
 *
 * Tests : node scripts/test.mjs lib/services/budgets.test.ts
 */
import type { Categorie, Transaction, TypeFlux } from "@/types/database";
import { centimesVersSaisie, eurosVersCentimes } from "@/lib/services/montants";
import { echapperChampCsv, nomFichierExport } from "@/lib/services/export";
import { horsVirements } from "@/lib/services/tresorerie";
import { COMMENTAIRE_MAX } from "@/lib/services/transactions";

type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreurs: string[] };

// ---------------------------------------------------------------------------
// Types propres au module (miroir de sql/11, déclarés ici : types/database.ts
// n'est pas modifié par ce lot).
// ---------------------------------------------------------------------------

/** Une ligne de la table budget. */
export interface Budget {
  id: string;
  entite_id: string;
  exercice: number;
  categorie_id: string;
  montant_centimes: number;
  commentaire: string | null;
  cree_le: string;
  modifie_le: string;
}

export type NouveauBudget = Pick<Budget, "entite_id" | "exercice" | "categorie_id" | "montant_centimes" | "commentaire">;

/** Colonnes d'une opération dont le budget a besoin (rien de plus n'est chargé). */
export type OperationBudget = Pick<
  Transaction,
  "categorie_id" | "type" | "statut" | "date_transaction" | "montant_ttc_centimes" | "virement_id"
>;

export type CategorieBudget = Pick<Categorie, "id" | "nom" | "type" | "active">;

export const EXERCICE_MIN = 2000;
export const EXERCICE_MAX = 2100;
/** Au-delà, le tableau de comparaison devient illisible. */
export const ANNEES_COMPAREES_MAX = 10;

export const LIBELLES_SENS: Record<TypeFlux, string> = {
  recette: "Recettes",
  depense: "Dépenses",
};

/** Étiquette de la ligne des opérations pas encore classées. */
export const LIBELLE_SANS_CATEGORIE = "Sans catégorie";

// ---------------------------------------------------------------------------
// Saisie
// ---------------------------------------------------------------------------

export function exerciceValide(n: number): boolean {
  return Number.isInteger(n) && n >= EXERCICE_MIN && n <= EXERCICE_MAX;
}

/** "2026" → 2026 ; toute autre valeur → l'exercice par défaut. */
export function lireExercice(brut: string | undefined, parDefaut: number): number {
  if (!/^\d{4}$/.test(brut ?? "")) return parDefaut;
  const n = Number(brut);
  return exerciceValide(n) ? n : parDefaut;
}

/**
 * [07/11/2026] "2025,2023,2024" (ou plusieurs paramètres ?annees=… envoyés par
 * un formulaire sans JavaScript) → [2023, 2024, 2025] : années valides,
 * dédoublonnées, triées, au plus ANNEES_COMPAREES_MAX (les plus récentes).
 * Rien de valide → les trois dernières années jusqu'à `anneeCourante`.
 */
export function lireAnnees(brut: string | string[] | undefined, anneeCourante: number): number[] {
  const morceaux = (Array.isArray(brut) ? brut : [brut ?? ""]).flatMap((b) => b.split(","));
  const annees = [
    ...new Set(
      morceaux
        .map((m) => m.trim())
        .filter((m) => /^\d{4}$/.test(m))
        .map(Number)
        .filter(exerciceValide),
    ),
  ].sort((a, b) => a - b);
  if (annees.length === 0) return [anneeCourante - 2, anneeCourante - 1, anneeCourante];
  return annees.slice(-ANNEES_COMPAREES_MAX);
}

export interface SaisieEnveloppe {
  entiteId: string;
  exercice: number;
  categorieId: string;
  /** Euros saisis ; "" = retirer l'enveloppe (la catégorie repasse à « — »). */
  montant: string;
  commentaire: string;
}

/**
 * Valide une enveloppe. La catégorie doit appartenir à l'entité (la base le
 * revérifie par FK composite). valeur null = demande de suppression.
 */
export function preparerEnveloppe(
  s: SaisieEnveloppe,
  categories: Pick<Categorie, "id" | "entite_id" | "active">[],
): Resultat<NouveauBudget | null> {
  const erreurs: string[] = [];
  if (!exerciceValide(s.exercice)) erreurs.push("L'exercice doit être une année.");
  const cat = categories.find((c) => c.id === s.categorieId && c.entite_id === s.entiteId);
  if (!cat) erreurs.push("Catégorie introuvable pour cette structure.");
  const commentaire = s.commentaire.trim();
  if (commentaire.length > COMMENTAIRE_MAX) erreurs.push("Commentaire trop long.");
  const saisie = s.montant.trim();
  let montant: number | null = null;
  if (saisie !== "") {
    // eurosVersCentimes refuse déjà tout signe : un prévu négatif n'existe pas.
    montant = eurosVersCentimes(saisie);
    if (montant === null) erreurs.push("Montant prévu invalide (exemple : 1 250,00).");
  }
  if (erreurs.length > 0) return { ok: false, erreurs };
  if (montant === null) return { ok: true, valeur: null };
  return {
    ok: true,
    valeur: {
      entite_id: s.entiteId,
      exercice: s.exercice,
      categorie_id: s.categorieId,
      montant_centimes: montant,
      commentaire: commentaire || null,
    },
  };
}

/**
 * [07/11/2026] « Copier le budget de l'exercice précédent » : ne renvoie que
 * les enveloppes MANQUANTES de l'exercice cible (aucune existante n'est
 * écrasée). Les catégories archivées ne reçoivent pas de nouvelle enveloppe.
 */
export function enveloppesACopier(
  precedent: Pick<Budget, "categorie_id" | "montant_centimes" | "commentaire">[],
  cible: Pick<Budget, "categorie_id">[],
  categories: Pick<Categorie, "id" | "active">[],
  entiteId: string,
  exerciceCible: number,
): NouveauBudget[] {
  const dejaLa = new Set(cible.map((b) => b.categorie_id));
  const actives = new Set(categories.filter((c) => c.active).map((c) => c.id));
  return precedent
    .filter((b) => !dejaLa.has(b.categorie_id) && actives.has(b.categorie_id))
    .map((b) => ({
      entite_id: entiteId,
      exercice: exerciceCible,
      categorie_id: b.categorie_id,
      montant_centimes: b.montant_centimes,
      commentaire: b.commentaire,
    }));
}

// ---------------------------------------------------------------------------
// Calculs
// ---------------------------------------------------------------------------

function anneeDe(op: Pick<OperationBudget, "date_transaction">): number {
  return Number(op.date_transaction.slice(0, 4));
}

/**
 * [07/11/2026] Contribution d'une opération au réalisé de sa catégorie.
 * Normalement le type de l'opération égale celui de la catégorie (traitement
 * le contrôle). Une opération de sens contraire (remboursement reçu classé en
 * dépense) vient en DÉDUCTION : elle ne gonfle pas l'autre sens, et la ligne
 * reste comptée une seule fois, dans sa catégorie.
 */
function contribution(op: OperationBudget, sens: TypeFlux): number {
  return op.type === sens ? op.montant_ttc_centimes : -op.montant_ttc_centimes;
}

/** Taux de réalisation en %, à une décimale. null si le prévu est inconnu ou nul. */
export function tauxRealisation(realise: number, prevu: number | null): number | null {
  if (prevu === null || prevu === 0) return null;
  return Math.round((realise * 1000) / prevu) / 10;
}

export interface LigneBudget {
  /** null = opérations sans catégorie (une ligne par sens). */
  categorieId: string | null;
  nom: string;
  sens: TypeFlux;
  active: boolean;
  /** null = aucune enveloppe : « — », pas 0. */
  prevu: number | null;
  realise: number;
  /** réalisé − prévu ; null si prévu inconnu. */
  ecart: number | null;
  taux: number | null;
  nbOperations: number;
  /** Opérations comptées mais pas encore au statut « Validé ». */
  nbNonValidees: number;
  commentaire: string | null;
}

export interface TotalSens {
  /** null = aucune enveloppe dans ce sens. */
  prevu: number | null;
  realise: number;
  ecart: number | null;
  taux: number | null;
  nbNonValidees: number;
}

export interface PrevuRealise {
  exercice: number;
  recettes: LigneBudget[];
  depenses: LigneBudget[];
  totaux: Record<TypeFlux, TotalSens>;
  /** Recettes − dépenses prévues ; null si l'exercice n'a aucune enveloppe. */
  soldePrevu: number | null;
  soldeRealise: number;
  nbEnveloppes: number;
}

function totalDe(lignes: LigneBudget[]): TotalSens {
  const avecPrevu = lignes.filter((l) => l.prevu !== null);
  const prevu = avecPrevu.length === 0 ? null : avecPrevu.reduce((s, l) => s + (l.prevu ?? 0), 0);
  const realise = lignes.reduce((s, l) => s + l.realise, 0);
  return {
    prevu,
    realise,
    ecart: prevu === null ? null : realise - prevu,
    taux: tauxRealisation(realise, prevu),
    nbNonValidees: lignes.reduce((s, l) => s + l.nbNonValidees, 0),
  };
}

function trierLignes(a: Pick<LigneBudget, "categorieId" | "nom">, b: Pick<LigneBudget, "categorieId" | "nom">): number {
  // Lignes « Sans catégorie » en dernier, puis ordre alphabétique français.
  if ((a.categorieId === null) !== (b.categorieId === null)) return a.categorieId === null ? 1 : -1;
  return a.nom.localeCompare(b.nom, "fr");
}

/**
 * Prévu contre réalisé d'un exercice. Lignes affichées : catégories actives,
 * plus les archivées qui ont une enveloppe ou des opérations sur l'exercice,
 * plus une ligne « Sans catégorie » par sens si des opérations ne sont pas
 * classées (sinon le total réalisé ne correspondrait pas aux opérations).
 */
export function prevuRealise(
  categories: CategorieBudget[],
  budgets: Pick<Budget, "exercice" | "categorie_id" | "montant_centimes" | "commentaire">[],
  operations: OperationBudget[],
  exercice: number,
): PrevuRealise {
  const enveloppes = new Map(
    budgets.filter((b) => b.exercice === exercice).map((b) => [b.categorie_id, b] as const),
  );
  const parId = new Map(categories.map((c) => [c.id, c] as const));
  const ops = horsVirements(operations).filter((o) => anneeDe(o) === exercice);

  const lignes = new Map<string, LigneBudget>();
  const ligne = (cle: string, base: Omit<LigneBudget, "realise" | "ecart" | "taux" | "nbOperations" | "nbNonValidees">) => {
    let l = lignes.get(cle);
    if (!l) {
      l = { ...base, realise: 0, ecart: null, taux: null, nbOperations: 0, nbNonValidees: 0 };
      lignes.set(cle, l);
    }
    return l;
  };
  const ligneCategorie = (c: CategorieBudget) => {
    const env = enveloppes.get(c.id);
    return ligne(c.id, {
      categorieId: c.id,
      nom: c.nom,
      sens: c.type,
      active: c.active,
      prevu: env ? env.montant_centimes : null,
      commentaire: env?.commentaire ?? null,
    });
  };

  for (const c of categories) {
    if (c.active || enveloppes.has(c.id)) ligneCategorie(c);
  }
  for (const op of ops) {
    const c = op.categorie_id ? parId.get(op.categorie_id) : undefined;
    // Catégorie inconnue (ne devrait pas arriver, FK) : traitée comme non classée.
    const l = c
      ? ligneCategorie(c)
      : ligne(`sans:${op.type}`, {
          categorieId: null,
          nom: LIBELLE_SANS_CATEGORIE,
          sens: op.type,
          active: true,
          prevu: null,
          commentaire: null,
        });
    l.realise += c ? contribution(op, c.type) : op.montant_ttc_centimes;
    l.nbOperations++;
    if (op.statut !== "validee") l.nbNonValidees++;
  }

  for (const l of lignes.values()) {
    l.ecart = l.prevu === null ? null : l.realise - l.prevu;
    l.taux = tauxRealisation(l.realise, l.prevu);
  }
  const toutes = [...lignes.values()];
  const recettes = toutes.filter((l) => l.sens === "recette").sort(trierLignes);
  const depenses = toutes.filter((l) => l.sens === "depense").sort(trierLignes);
  const totaux = { recette: totalDe(recettes), depense: totalDe(depenses) };
  // [07/11/2026] Dès qu'une enveloppe existe, le sens sans enveloppe compte
  // pour 0 dans le solde prévu (rien n'y a été prévu) ; sans aucune
  // enveloppe, le solde prévu est inconnu.
  const soldePrevu = enveloppes.size === 0 ? null : (totaux.recette.prevu ?? 0) - (totaux.depense.prevu ?? 0);
  return {
    exercice,
    recettes,
    depenses,
    totaux,
    soldePrevu,
    soldeRealise: totaux.recette.realise - totaux.depense.realise,
    nbEnveloppes: enveloppes.size,
  };
}

export interface LigneComparaison {
  categorieId: string | null;
  nom: string;
  sens: TypeFlux;
  active: boolean;
  /** Un montant par année demandée ; null = l'entité n'a aucune opération cette année-là. */
  montants: (number | null)[];
}

export interface Comparaison {
  annees: number[];
  /** Années demandées sans aucune opération (hors virements). */
  anneesAbsentes: number[];
  recettes: LigneComparaison[];
  depenses: LigneComparaison[];
  totaux: Record<TypeFlux, (number | null)[]>;
  resultat: (number | null)[];
}

/**
 * Comparaison annuelle : une ligne par catégorie (même nomenclature d'une
 * année à l'autre, agrégation par identifiant), une colonne par année.
 * [07/11/2026] Une année sans aucune opération hors virements (un virement
 * ne fait pas un résultat) donne null pour TOUTE la colonne, totaux compris.
 * Les catégories archivées apparaissent dès qu'elles ont un montant sur une
 * des années demandées : leur historique reste visible.
 */
export function comparaisonAnnuelle(
  categories: CategorieBudget[],
  operations: OperationBudget[],
  annees: number[],
): Comparaison {
  const ops = horsVirements(operations);
  const presentes = new Set(ops.map(anneeDe));
  const colonne = new Map(annees.map((a, i) => [a, i] as const));
  const vide = () => annees.map((a) => (presentes.has(a) ? 0 : null));
  const parId = new Map(categories.map((c) => [c.id, c] as const));

  const lignes = new Map<string, LigneComparaison & { utilisee: boolean }>();
  const ligne = (cle: string, base: Omit<LigneComparaison, "montants">) => {
    let l = lignes.get(cle);
    if (!l) {
      l = { ...base, montants: vide(), utilisee: false };
      lignes.set(cle, l);
    }
    return l;
  };
  for (const c of categories) ligne(c.id, { categorieId: c.id, nom: c.nom, sens: c.type, active: c.active });

  for (const op of ops) {
    const i = colonne.get(anneeDe(op));
    if (i === undefined) continue;
    const c = op.categorie_id ? parId.get(op.categorie_id) : undefined;
    const l = c
      ? ligne(c.id, { categorieId: c.id, nom: c.nom, sens: c.type, active: c.active })
      : ligne(`sans:${op.type}`, { categorieId: null, nom: LIBELLE_SANS_CATEGORIE, sens: op.type, active: true });
    l.montants[i] = (l.montants[i] ?? 0) + (c ? contribution(op, c.type) : op.montant_ttc_centimes);
    l.utilisee = true;
  }

  const gardees = [...lignes.values()]
    .filter((l) => l.active || l.utilisee)
    .map(({ utilisee: _u, ...l }) => {
      void _u;
      return l;
    });
  const recettes = gardees.filter((l) => l.sens === "recette").sort(trierLignes);
  const depenses = gardees.filter((l) => l.sens === "depense").sort(trierLignes);
  const somme = (ls: LigneComparaison[]) =>
    annees.map((a, i) => (presentes.has(a) ? ls.reduce((s, l) => s + (l.montants[i] ?? 0), 0) : null));
  const totaux = { recette: somme(recettes), depense: somme(depenses) };
  return {
    annees,
    anneesAbsentes: annees.filter((a) => !presentes.has(a)),
    recettes,
    depenses,
    totaux,
    resultat: annees.map((_, i) => {
      const r = totaux.recette[i];
      const d = totaux.depense[i];
      return r === null || d === null || r === undefined || d === undefined ? null : r - d;
    }),
  };
}

// ---------------------------------------------------------------------------
// Export CSV (format Excel français, mêmes briques que lib/services/export)
// ---------------------------------------------------------------------------

const SEP = ";";
const EOL = "\r\n";
/** Valeur d'une année absente : un tiret, jamais 0. */
export const VALEUR_ABSENTE = "—";

function ligneCsv(champs: readonly string[]): string {
  return champs.map(echapperChampCsv).join(SEP);
}

function montantCsv(c: number | null): string {
  return c === null ? VALEUR_ABSENTE : centimesVersSaisie(c);
}

/**
 * Chaîne CSV de la comparaison : séparateur « ; », décimales à virgule
 * (centimesVersSaisie), échappement RFC 4180 (echapperChampCsv). Le BOM est
 * ajouté par la route, comme pour l'export des opérations.
 */
export function genererCsvComparaison(c: Comparaison): string {
  const lignes: string[] = [ligneCsv(["Sens", "Catégorie", "Archivée", ...c.annees.map(String)])];
  for (const sens of ["recette", "depense"] as const) {
    const libelle = sens === "recette" ? "Recette" : "Dépense";
    for (const l of sens === "recette" ? c.recettes : c.depenses) {
      lignes.push(ligneCsv([libelle, l.nom, l.active ? "" : "oui", ...l.montants.map(montantCsv)]));
    }
    lignes.push(ligneCsv([libelle, `Total ${LIBELLES_SENS[sens].toLowerCase()}`, "", ...c.totaux[sens].map(montantCsv)]));
  }
  lignes.push(ligneCsv(["", "Résultat (recettes moins dépenses)", "", ...c.resultat.map(montantCsv)]));
  return lignes.join(EOL) + EOL;
}

/** "comparaison_VEA_2023-2025.csv" (nom assaini par nomFichierExport). */
export function nomFichierComparaison(nomEntite: string, annees: number[]): string {
  const base = nomFichierExport(nomEntite).replace(/^compta_/, "comparaison_").replace(/_\d{4}-\d{2}-\d{2}\.csv$/, "");
  const plage = annees.length === 0 ? "" : `_${annees[0]}-${annees[annees.length - 1]}`;
  return `${base}${plage}.csv`;
}
