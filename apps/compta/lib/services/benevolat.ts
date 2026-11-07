/**
 * SERVICE CONTRIBUTIONS VOLONTAIRES EN NATURE (07/11/2026) — fonctions PURES.
 *
 * Bénévolat, dons en nature, frais abandonnés. Règles (cahiers des charges
 * Compta Nova, reprises sans leur code) :
 *  - heures : valeur = minutes × taux horaire / 60, arrondie au centime ;
 *  - le taux est CHOISI par l'association (il n'y a pas de barème imposé) :
 *    jamais de valeur par défaut inventée ;
 *  - seules les fiches « Vérifié » comptent dans les totaux ;
 *  - aucune contribution n'est un encaissement : présentée à part ;
 *  - frais abandonnés : date de la renonciation écrite exigée pour vérifier.
 *
 * Reprise depuis vea.velito.fr : un total par événement (heures d'aide
 * pointées), avec le nombre de bénévoles, sans aucun nom.
 *
 * Tests : node scripts/test.mjs lib/services/benevolat.test.ts
 */
import type { NouvelleContribution, StatutContribution, TypeContribution } from "@/types/database";
import { eurosVersCentimes } from "@/lib/services/montants";
import { COMMENTAIRE_MAX } from "@/lib/services/transactions";

type Resultat<T> = { ok: true; valeur: T } | { ok: false; erreurs: string[] };

export const LIBELLES_TYPE_CONTRIBUTION: Record<TypeContribution, string> = {
  heures_benevoles: "Heures de bénévolat",
  don_nature: "Don en nature",
  frais_abandonnes: "Frais abandonnés",
};

export const LIBELLES_STATUT_CONTRIBUTION: Record<StatutContribution, string> = {
  brouillon: "Brouillon",
  a_verifier: "À vérifier",
  verifie: "Vérifié",
  annule: "Annulé",
};

/** minutes × taux (centimes / heure) / 60, arrondi au centime le plus proche. */
export function valeurHeures(minutes: number, tauxHoraireCentimes: number): number {
  return Math.round((minutes * tauxHoraireCentimes) / 60);
}

/** « 2,5 » ou « 2h30 » → 150 minutes ; null si illisible ou ≤ 0. */
export function dureeVersMinutes(saisie: string): number | null {
  const t = saisie.trim().toLowerCase().replace(/\s+/g, "");
  const hm = /^(\d{1,4})h(\d{1,2})?$/.exec(t);
  if (hm) {
    const m = Number(hm[1]) * 60 + Number(hm[2] ?? 0);
    return m > 0 && Number(hm[2] ?? 0) < 60 ? m : null;
  }
  if (!/^\d{1,4}([.,]\d{1,2})?$/.test(t)) return null;
  const m = Math.round(Number(t.replace(",", ".")) * 60);
  return m > 0 ? m : null;
}

export interface SaisieContribution {
  entiteId: string;
  type: string;
  date: string;
  libelle: string;
  duree: string; // heures : « 3 », « 2,5 », « 2h30 »
  tauxHoraire: string; // heures : euros par heure
  nbPersonnes: string;
  valeur: string; // don, frais : euros
  dateRenonciation: string;
  commentaire: string;
}

function estDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v;
}

export function preparerContribution(s: SaisieContribution): Resultat<NouvelleContribution> {
  const erreurs: string[] = [];
  if (!(s.type in LIBELLES_TYPE_CONTRIBUTION)) erreurs.push("Type de contribution inconnu.");
  if (!estDate(s.date)) erreurs.push("La date doit être une date réelle.");
  const libelle = s.libelle.trim();
  if (libelle.length < 1 || libelle.length > 255) erreurs.push("Décris la contribution (255 caractères au plus).");
  const commentaire = s.commentaire.trim();
  if (commentaire.length > COMMENTAIRE_MAX) erreurs.push("Commentaire trop long.");

  let minutes: number | null = null;
  let taux: number | null = null;
  let valeur: number | null = null;
  let nb: number | null = null;
  if (s.nbPersonnes.trim() !== "") {
    nb = Number(s.nbPersonnes);
    if (!Number.isInteger(nb) || nb <= 0) erreurs.push("Nombre de personnes invalide.");
  }
  if (s.type === "heures_benevoles") {
    minutes = dureeVersMinutes(s.duree);
    taux = eurosVersCentimes(s.tauxHoraire);
    if (minutes === null) erreurs.push("Durée invalide (exemples : 3, 2,5 ou 2h30).");
    if (taux === null || taux <= 0) erreurs.push("Indique le taux horaire retenu par l'association (en euros).");
    if (minutes !== null && taux !== null && taux > 0) valeur = valeurHeures(minutes, taux);
  } else {
    valeur = eurosVersCentimes(s.valeur);
    if (valeur === null || valeur <= 0) erreurs.push("Indique la valeur (en euros).");
  }
  const renonciation = s.dateRenonciation.trim();
  if (renonciation !== "" && !estDate(renonciation)) erreurs.push("La date de renonciation n'est pas une date réelle.");

  if (erreurs.length > 0) return { ok: false, erreurs };
  return {
    ok: true,
    valeur: {
      entite_id: s.entiteId,
      type: s.type as TypeContribution,
      date_contribution: s.date,
      libelle,
      statut: "a_verifier",
      minutes,
      taux_horaire_centimes: taux,
      nb_personnes: nb,
      valeur_centimes: valeur as number,
      date_renonciation: s.type === "frais_abandonnes" && renonciation ? renonciation : null,
      commentaire: commentaire || null,
      source: null,
      source_cle: null,
    },
  };
}

/** Peut-on passer cette fiche à ce statut ? Message d'erreur sinon. */
export function changementStatutRefuse(
  c: { type: TypeContribution; date_renonciation: string | null },
  statut: StatutContribution,
): string | null {
  if (statut === "verifie" && c.type === "frais_abandonnes" && !c.date_renonciation) {
    return "Frais abandonnés : il faut la renonciation écrite et datée au remboursement avant de vérifier.";
  }
  return null;
}

/** Totaux d'un exercice : seulement les fiches « Vérifié ». */
export function syntheseContributions(
  fiches: { type: TypeContribution; statut: StatutContribution; valeur_centimes: number; minutes: number | null; date_contribution: string }[],
  exercice: number,
) {
  const parType: Record<TypeContribution, number> = { heures_benevoles: 0, don_nature: 0, frais_abandonnes: 0 };
  let minutes = 0;
  let aVerifier = 0;
  for (const f of fiches) {
    if (!f.date_contribution.startsWith(String(exercice))) continue;
    if (f.statut === "a_verifier" || f.statut === "brouillon") aVerifier++;
    if (f.statut !== "verifie") continue;
    parType[f.type] += f.valeur_centimes;
    if (f.type === "heures_benevoles") minutes += f.minutes ?? 0;
  }
  return {
    parType,
    total: parType.heures_benevoles + parType.don_nature + parType.frais_abandonnes,
    heures: minutes / 60,
    aVerifier,
  };
}

/** Une présence « aider » lue sur vea.velito.fr (aucun nom transmis). */
export interface PresenceAide {
  event_slug: string;
  participant_id: string;
  heures_aide: number | null;
}

export interface EvenementVea {
  event_slug: string;
  nom: string;
  date: string;
}

/**
 * Regroupe les heures d'aide par événement de l'exercice : une fiche par
 * événement (« À vérifier »), nombre de bénévoles distincts, aucune identité.
 * Clé source « vea-presences:<slug> » : relancer la reprise ne duplique rien.
 */
export function contributionsDepuisVea(
  presences: PresenceAide[],
  evenements: EvenementVea[],
  contexte: { entiteId: string; exercice: number; tauxHoraireCentimes: number },
): NouvelleContribution[] {
  const parEvent = new Map<string, { heures: number; personnes: Set<string> }>();
  for (const p of presences) {
    const h = Number(p.heures_aide ?? 0);
    if (!(h > 0)) continue;
    const e = parEvent.get(p.event_slug) ?? { heures: 0, personnes: new Set<string>() };
    e.heures += h;
    e.personnes.add(p.participant_id);
    parEvent.set(p.event_slug, e);
  }
  const resultat: NouvelleContribution[] = [];
  for (const ev of evenements) {
    if (!ev.date.startsWith(String(contexte.exercice))) continue;
    const agr = parEvent.get(ev.event_slug);
    if (!agr) continue;
    const minutes = Math.round(agr.heures * 60);
    resultat.push({
      entite_id: contexte.entiteId,
      type: "heures_benevoles",
      date_contribution: ev.date.slice(0, 10),
      libelle: `Bénévolat : ${ev.nom}`.slice(0, 255),
      statut: "a_verifier",
      minutes,
      taux_horaire_centimes: contexte.tauxHoraireCentimes,
      nb_personnes: agr.personnes.size,
      valeur_centimes: valeurHeures(minutes, contexte.tauxHoraireCentimes),
      date_renonciation: null,
      commentaire: "Repris des présences « aider » pointées sur vea.velito.fr. Vérifier les heures avant de valider.",
      source: "vea.velito.fr",
      source_cle: `vea-presences:${ev.event_slug}`.slice(0, 255),
    });
  }
  return resultat.sort((a, b) => a.date_contribution.localeCompare(b.date_contribution));
}
