/**
 * PROGRESSION — XP, série de jours, fiches lues, scores de quiz.
 *
 * Décision V1 assumée : tout est stocké dans le NAVIGATEUR (localStorage),
 * pas en base. Pourquoi : un seul utilisateur (moi), zéro table/migration/RLS
 * à maintenir, et le jour où la plateforme devient multi-utilisateurs
 * (couche B, version « jeunes »), CE fichier est le seul à réécrire pour
 * brancher Supabase — même logique d'isolation que lib/fiches/fiches.ts.
 *
 * Module CLIENT UNIQUEMENT : localStorage n'existe pas côté serveur, d'où la
 * garde `typeof window === "undefined"` dans chaque fonction. Les composants
 * qui l'utilisent doivent lire la progression dans un useEffect (jamais au
 * premier rendu) pour éviter les différences serveur/client à l'hydratation.
 */

export interface ResultatQuiz {
  /** Meilleur score obtenu (nombre de bonnes réponses). */
  meilleurScore: number;
  /** Nombre de questions du quiz au moment du passage. */
  total: number;
  /** Date du dernier passage (AAAA-MM-JJ). */
  dernierPassage: string;
}

export interface Progression {
  xp: number;
  /** Slugs des fiches marquées comme lues. */
  fichesLues: string[];
  /** Identifiants des leçons de parcours terminées (cours + pratique faits). */
  leconsFaites: string[];
  /** Résultats par slug de quiz. */
  quiz: Record<string, ResultatQuiz>;
  /** Série : jours consécutifs avec au moins une activité. */
  serie: { jours: number; derniereActivite: string };
}

/** Barème XP — centralisé ici pour être ajustable en un seul endroit. */
export const XP_FICHE_LUE = 20;
export const XP_LECON_FAITE = 30;
export const XP_PAR_BONNE_REPONSE = 10;
export const XP_BONUS_QUIZ_PARFAIT = 20;

const CLE = "velito-cours-progression-v1";

const VIDE: Progression = {
  xp: 0,
  fichesLues: [],
  leconsFaites: [],
  quiz: {},
  serie: { jours: 0, derniereActivite: "" },
};

/** Date du jour au format AAAA-MM-JJ (heure locale du navigateur). */
function aujourdhui(): string {
  const d = new Date();
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

/** Hier au format AAAA-MM-JJ. */
function hier(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  const mois = String(d.getMonth() + 1).padStart(2, "0");
  const jour = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mois}-${jour}`;
}

export function chargerProgression(): Progression {
  if (typeof window === "undefined") return VIDE;
  try {
    const brut = window.localStorage.getItem(CLE);
    if (!brut) return VIDE;
    const p = JSON.parse(brut) as Progression;
    // Défauts prudents si une version antérieure du format traîne.
    return {
      xp: typeof p.xp === "number" ? p.xp : 0,
      fichesLues: Array.isArray(p.fichesLues) ? p.fichesLues : [],
      // Champ ajouté avec les parcours : absent des anciennes sauvegardes.
      leconsFaites: Array.isArray(p.leconsFaites) ? p.leconsFaites : [],
      quiz: p.quiz && typeof p.quiz === "object" ? p.quiz : {},
      serie: p.serie?.derniereActivite
        ? p.serie
        : { jours: 0, derniereActivite: "" },
    };
  } catch {
    return VIDE;
  }
}

function sauvegarder(p: Progression): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CLE, JSON.stringify(p));
    // Prévient les autres composants de la page (widget dashboard, header…).
    window.dispatchEvent(new CustomEvent("progression-maj"));
  } catch {
    // Stockage plein ou bloqué : la révision fonctionne quand même, sans suivi.
  }
}

/** Met à jour la série : +1 si l'activité précédente date d'hier, reset sinon. */
function toucherSerie(p: Progression): void {
  const jour = aujourdhui();
  if (p.serie.derniereActivite === jour) return; // déjà actif aujourd'hui
  p.serie.jours = p.serie.derniereActivite === hier() ? p.serie.jours + 1 : 1;
  p.serie.derniereActivite = jour;
}

/**
 * Marque une fiche comme lue. Retourne les XP gagnés (0 si déjà lue —
 * relire une fiche est encouragé mais ne refait pas gagner de points).
 */
export function marquerFicheLue(slug: string): number {
  const p = chargerProgression();
  if (p.fichesLues.includes(slug)) return 0;
  p.fichesLues.push(slug);
  p.xp += XP_FICHE_LUE;
  toucherSerie(p);
  sauvegarder(p);
  return XP_FICHE_LUE;
}

/**
 * Marque une leçon de parcours comme terminée (cours lu + mise en pratique
 * faite — c'est l'utilisateur qui l'affirme en cliquant, comme cocher un
 * exercice dans un cahier). Retourne les XP gagnés (0 si déjà faite).
 */
export function marquerLeconFaite(id: string): number {
  const p = chargerProgression();
  if (p.leconsFaites.includes(id)) return 0;
  p.leconsFaites.push(id);
  p.xp += XP_LECON_FAITE;
  toucherSerie(p);
  sauvegarder(p);
  return XP_LECON_FAITE;
}

/**
 * Enregistre un passage de quiz. Retourne les XP gagnés sur CE passage.
 * Le meilleur score est conservé ; l'XP est gagnée à chaque passage
 * (rejouer pour progresser doit rester récompensé).
 */
export function enregistrerQuiz(
  slug: string,
  score: number,
  total: number,
): number {
  const p = chargerProgression();
  const xpGagnee =
    score * XP_PAR_BONNE_REPONSE +
    (score === total && total > 0 ? XP_BONUS_QUIZ_PARFAIT : 0);
  const precedent = p.quiz[slug];
  p.quiz[slug] = {
    meilleurScore: Math.max(score, precedent?.meilleurScore ?? 0),
    total,
    dernierPassage: aujourdhui(),
  };
  p.xp += xpGagnee;
  toucherSerie(p);
  sauvegarder(p);
  return xpGagnee;
}

/**
 * La série affichée : si la dernière activité date d'avant hier, la série
 * est cassée — on affiche 0 sans attendre la prochaine activité.
 */
export function serieCourante(p: Progression): number {
  if (!p.serie.derniereActivite) return 0;
  const active =
    p.serie.derniereActivite === aujourdhui() ||
    p.serie.derniereActivite === hier();
  return active ? p.serie.jours : 0;
}
