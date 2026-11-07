/**
 * SERVICE INDEMNITÉS KILOMÉTRIQUES (07/11/2026) — fonctions PURES.
 *
 * Module séparé des notes de frais (cahier des charges « Gestion Compta
 * Nova ») :
 *  - un trajet = date, départ, arrivée, motif, distance réelle en km, taux
 *    en euros par km SAISI par l'association : aucun barème, aucun défaut ;
 *  - montant = km × taux arrondi au centime, PAR TRAJET ; le total d'une
 *    période additionne des montants déjà arrondis (jamais l'inverse) ;
 *  - le retour n'est JAMAIS doublé : on saisit les km réellement faits, la
 *    case « aller-retour » est seulement informative ;
 *  - doublon possible (même date, départ, arrivée, bénéficiaire) : signalé,
 *    jamais bloqué.
 *
 * Calcul 100 % entier, comme services/montants : distance en centièmes de
 * km, taux en dix-millièmes d'euro. Aucun flottant ne transporte un montant.
 *
 * Tests : node scripts/test.mjs lib/services/ik.test.ts
 */
import type { NouveauTrajetIk, TrajetIk } from "@/types/notes-de-frais";
import { COMMENTAIRE_MAX } from "@/lib/services/transactions";

type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreurs: string[] };

/** Bornes miroir des CHECK de sql/12 (trajet_ik). */
export const DISTANCE_MAX_CENTIKM = 10_000_000; // 100 000 km
export const TAUX_MAX_DIXMILLIMES = 100_000; // 10 € par km

/**
 * « 12,35 » ou « 12.35 » ou « 1 250 » → distance en CENTIÈMES de km (1235),
 * par analyse du texte (jamais parseFloat). null si illisible ou ≤ 0.
 */
export function distanceVersCentikm(saisie: string): number | null {
  const t = (saisie ?? "").replace(/[\s  ]/g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(t)) return null;
  const [entier, dec = ""] = t.split(".");
  const v = Number(entier) * 100 + Number(dec.padEnd(2, "0"));
  return v > 0 && v <= DISTANCE_MAX_CENTIKM ? v : null;
}

/**
 * Taux en euros par km (« 0,636 », « 0.3210 ») → dix-millièmes d'euro
 * (6360, 3210). Jusqu'à 4 décimales. null si illisible, ≤ 0 ou > 10 €/km.
 */
export function tauxVersDixmillimes(saisie: string): number | null {
  const t = (saisie ?? "").replace(/[\s  €]/g, "").replace(",", ".");
  if (!/^\d{1,2}(\.\d{1,4})?$/.test(t)) return null;
  const [entier, dec = ""] = t.split(".");
  const v = Number(entier) * 10_000 + Number(dec.padEnd(4, "0"));
  return v > 0 && v <= TAUX_MAX_DIXMILLIMES ? v : null;
}

/** 6360 → « 0,636 » (sans zéros inutiles, au moins 2 décimales). */
export function formaterTaux(dixmillimes: number): string {
  const entier = Math.trunc(dixmillimes / 10_000);
  let dec = String(dixmillimes % 10_000).padStart(4, "0");
  while (dec.length > 2 && dec.endsWith("0")) dec = dec.slice(0, -1);
  return `${entier},${dec}`;
}

/** Distance stockée (numeric : nombre ou texte selon le pilote) → centièmes de km. */
export function centikmDepuisBase(distance: number | string): number {
  const v = distanceVersCentikm(String(distance));
  if (v === null) throw new Error(`Distance illisible : ${String(distance)}`);
  return v;
}

/** 1235 → « 12,35 » ; 23000 → « 230 ». */
export function formaterDistance(centikm: number): string {
  const entier = Math.trunc(centikm / 100);
  const reste = centikm % 100;
  return reste === 0 ? String(entier) : `${entier},${String(reste).padStart(2, "0")}`;
}

/**
 * [07/11/2026] Montant d'UN trajet en centimes : km × taux, arrondi au
 * centime le plus proche (demi vers le haut, comme round() de Postgres sur un
 * positif : la base revérifie avec le CHECK trajet_ik_montant_calcule).
 * centikm × dix-millièmes = millionièmes d'euro ; 1 centime = 10 000 unités.
 */
export function montantTrajet(centikm: number, tauxDixmillimes: number): number {
  const brut = centikm * tauxDixmillimes;
  const reste = brut % 10_000;
  return (brut - reste) / 10_000 + (reste >= 5_000 ? 1 : 0);
}

/** Total de plusieurs trajets : somme des montants DÉJÀ arrondis par trajet. */
export function totalTrajets(trajets: Pick<TrajetIk, "montant_centimes">[]): number {
  return trajets.reduce((s, t) => s + Number(t.montant_centimes), 0);
}

export interface SaisieTrajet {
  entiteId: string;
  beneficiaire: string;
  date: string;
  depart: string;
  arrivee: string;
  motif: string;
  distance: string; // km réellement parcourus
  allerRetour: boolean; // informatif
  taux: string; // euros par km, saisi par l'association
  commentaire: string;
}

function estDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

const propre = (v: string) => (v ?? "").trim().replace(/\s+/g, " ");

export function preparerTrajet(s: SaisieTrajet): Resultat<NouveauTrajetIk> {
  const erreurs: string[] = [];
  const beneficiaire = propre(s.beneficiaire);
  const depart = propre(s.depart);
  const arrivee = propre(s.arrivee);
  const motif = propre(s.motif);
  const commentaire = (s.commentaire ?? "").trim();
  if (beneficiaire.length < 1 || beneficiaire.length > 120) erreurs.push("Indique la personne qui a fait le trajet (120 caractères au plus).");
  if (!estDate(s.date)) erreurs.push("La date du trajet doit être une date réelle.");
  if (depart.length < 1 || depart.length > 120) erreurs.push("Indique le lieu de départ.");
  if (arrivee.length < 1 || arrivee.length > 120) erreurs.push("Indique le lieu d'arrivée.");
  if (motif.length < 1 || motif.length > 200) erreurs.push("Indique le motif du déplacement.");
  if (commentaire.length > COMMENTAIRE_MAX) erreurs.push("Commentaire trop long.");
  const centikm = distanceVersCentikm(s.distance);
  if (centikm === null) erreurs.push("Distance invalide : les km réellement parcourus, 2 décimales au plus (ex. 12,5).");
  const taux = tauxVersDixmillimes(s.taux);
  if (taux === null) erreurs.push("Indique le taux par km retenu par l'association (ex. 0,321), 4 décimales au plus.");
  let montant = 0;
  if (centikm !== null && taux !== null) {
    montant = montantTrajet(centikm, taux);
    if (montant <= 0) erreurs.push("Ce trajet vaut moins d'un centime : vérifie la distance et le taux.");
  }
  if (erreurs.length > 0) return { ok: false, erreurs };

  const c = centikm as number;
  return {
    ok: true,
    valeur: {
      entite_id: s.entiteId,
      beneficiaire,
      date_trajet: s.date,
      depart,
      arrivee,
      motif,
      // Texte « 12.35 » : exact jusqu'à la colonne numeric(8,2).
      distance_km: `${Math.trunc(c / 100)}.${String(c % 100).padStart(2, "0")}`,
      // [07/11/2026] Retour NON doublé : la case est enregistrée telle quelle,
      // elle ne change ni la distance ni le montant.
      aller_retour: Boolean(s.allerRetour),
      taux_km_dixmillimes: taux as number,
      montant_centimes: montant,
      commentaire: commentaire || null,
    },
  };
}

/** Clé de comparaison : casse, accents et espaces ignorés. */
export function normaliser(v: string): string {
  return (v ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLocaleLowerCase("fr")
    .trim()
    .replace(/\s+/g, " ");
}

type TrajetCle = Pick<TrajetIk, "id" | "beneficiaire" | "date_trajet" | "depart" | "arrivee">;

export function cleDoublon(t: Omit<TrajetCle, "id">): string {
  return [t.date_trajet, normaliser(t.beneficiaire), normaliser(t.depart), normaliser(t.arrivee)].join("|");
}

/**
 * Identifiants des trajets en doublon POSSIBLE (même date, même départ, même
 * arrivée, même bénéficiaire). Signalés seulement : deux allers le même jour
 * existent (matin et soir), c'est au trésorier de trancher.
 */
export function doublonsPossibles(trajets: TrajetCle[]): Set<string> {
  const groupes = new Map<string, string[]>();
  for (const t of trajets) {
    const cle = cleDoublon(t);
    groupes.set(cle, [...(groupes.get(cle) ?? []), t.id]);
  }
  const resultat = new Set<string>();
  for (const ids of groupes.values()) if (ids.length > 1) ids.forEach((id) => resultat.add(id));
  return resultat;
}

/** Ce nouveau trajet ressemble-t-il à un trajet déjà saisi ? (avertissement à la saisie) */
export function ressembleA(nouveau: Omit<TrajetCle, "id">, existants: TrajetCle[], saufId?: string): TrajetCle[] {
  const cle = cleDoublon(nouveau);
  return existants.filter((t) => t.id !== saufId && cleDoublon(t) === cle);
}

/** Libellé de la ligne IK créée dans une note de frais (même texte que le trigger SQL). */
export function libelleTrajet(t: Pick<TrajetIk, "depart" | "arrivee" | "motif">): string {
  return `Trajet ${t.depart} → ${t.arrivee} (${t.motif})`.slice(0, 255);
}
