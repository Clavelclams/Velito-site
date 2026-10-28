/**
 * calendrier-scolaire.ts — Vacances scolaires (zone B, académie d'Amiens) et
 * jours fériés, pour les séances récurrentes (ex. Mercredis Elbeuf).
 *
 * À METTRE À JOUR UNE FOIS PAR AN quand le ministère publie le calendrier
 * de l'année suivante (ajouter les lignes, ne rien supprimer).
 * Source 2026-2027 : Onisep, https://www.onisep.fr/vacances-scolaires-2026-2027
 * (« les cours reprennent le matin des jours indiqués » : la fin saisie ici est
 * donc la veille de la reprise).
 *
 * Les jours fériés sont calculés (fixes + ceux qui dépendent de Pâques) :
 * rien à mettre à jour pour eux.
 *
 * [28/10/2026] Créé pour la récurrence du formulaire d'événement.
 * Toutes les dates sont des chaînes "AAAA-MM-JJ" (ordre alphabétique =
 * ordre chronologique, pas de piège de fuseau horaire).
 */

export interface PeriodeVacances {
  nom: string;
  debut: string; // premier jour sans cours
  fin: string; // dernier jour sans cours (veille de la reprise)
}

export const VACANCES_ZONE_B: PeriodeVacances[] = [
  // 2026-2027
  { nom: "Toussaint", debut: "2026-10-17", fin: "2026-11-01" },
  { nom: "Noël", debut: "2026-12-19", fin: "2027-01-03" },
  { nom: "Hiver", debut: "2027-02-20", fin: "2027-03-07" },
  { nom: "Printemps", debut: "2027-04-17", fin: "2027-05-02" },
  { nom: "Pont de l'Ascension", debut: "2027-05-07", fin: "2027-05-07" },
  { nom: "Été", debut: "2027-07-03", fin: "2027-08-31" },
];

/** Dernière date couverte par le calendrier ci-dessus : au-delà, on prévient. */
export const CALENDRIER_CONNU_JUSQU_AU = "2027-08-31";

const iso = (d: Date) => d.toISOString().slice(0, 10);
const utc = (a: number, m: number, j: number) => new Date(Date.UTC(a, m - 1, j));

/** Dimanche de Pâques (algorithme de Meeus / Jones / Butcher). */
function paques(annee: number): Date {
  const a = annee % 19;
  const b = Math.floor(annee / 100);
  const c = annee % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mois = Math.floor((h + l - 7 * m + 114) / 31);
  const jour = ((h + l - 7 * m + 114) % 31) + 1;
  return utc(annee, mois, jour);
}

/** Jours fériés de l'année, avec leur nom. */
export function joursFeries(annee: number): Map<string, string> {
  const p = paques(annee);
  const plus = (n: number) => iso(new Date(p.getTime() + n * 86400000));
  return new Map([
    [iso(utc(annee, 1, 1)), "Jour de l'an"],
    [plus(1), "Lundi de Pâques"],
    [iso(utc(annee, 5, 1)), "Fête du Travail"],
    [iso(utc(annee, 5, 8)), "Victoire 1945"],
    [plus(39), "Ascension"],
    [plus(50), "Lundi de Pentecôte"],
    [iso(utc(annee, 7, 14)), "Fête nationale"],
    [iso(utc(annee, 8, 15)), "Assomption"],
    [iso(utc(annee, 11, 1)), "Toussaint (férié)"],
    [iso(utc(annee, 11, 11)), "Armistice"],
    [iso(utc(annee, 12, 25)), "Noël (férié)"],
  ]);
}

/** Raison pour laquelle une date est sans séance, ou null si c'est un jour normal. */
export function raisonSansSeance(date: string): string | null {
  const vac = VACANCES_ZONE_B.find((v) => date >= v.debut && date <= v.fin);
  if (vac) return `vacances ${vac.nom}`;
  const ferie = joursFeries(Number(date.slice(0, 4))).get(date);
  return ferie ? `férié (${ferie})` : null;
}

export interface Recurrence {
  dates: string[];
  sautees: { date: string; raison: string }[];
  /** Vrai si la fin dépasse le calendrier connu (vacances non vérifiées). */
  horsCalendrier: boolean;
}

/**
 * Une date par semaine, de `debut` à `fin` incluses, même jour de la semaine
 * que `debut`, en sautant vacances et jours fériés. Plafond : 60 semaines.
 */
export function datesHebdomadaires(debut: string, fin: string, sauterVacances = true): Recurrence {
  const dates: string[] = [];
  const sautees: { date: string; raison: string }[] = [];
  let d = new Date(`${debut}T00:00:00Z`);
  for (let n = 0; n < 60 && iso(d) <= fin; n++) {
    const s = iso(d);
    const raison = sauterVacances ? raisonSansSeance(s) : null;
    if (raison) sautees.push({ date: s, raison });
    else dates.push(s);
    d = new Date(d.getTime() + 7 * 86400000);
  }
  return { dates, sautees, horsCalendrier: fin > CALENDRIER_CONNU_JUSQU_AU };
}
