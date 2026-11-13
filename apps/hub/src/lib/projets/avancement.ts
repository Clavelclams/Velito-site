/**
 * Calculs de la page Projets (07/11/2026) — fonctions PURES, sans base.
 *
 * Le pourcentage d'avancement n'est jamais saisi à la main : il découle de la
 * roadmap. Chaque étape a un poids (1 à 5) ; une étape « abandonnée » sort du
 * calcul (elle n'est ni faite, ni à faire). Ainsi le chiffre dit aussi CE
 * QUI RESTE, ligne par ligne.
 *
 * Tests : node --experimental-strip-types src/lib/projets/avancement.test.ts
 */

export type StatutEtape = "a_faire" | "en_cours" | "fait" | "abandonne";

export interface EtapeCalcul {
  statut: StatutEtape;
  poids: number;
  lot: string | null;
  ordre: number;
  titre: string;
}

export interface Avancement {
  /** 0 à 100, arrondi à l'entier. 0 si aucune étape comptée. */
  pourcentage: number;
  fait: number;
  enCours: number;
  aFaire: number;
  /** Nombre d'étapes prises en compte (hors abandonnées). */
  total: number;
}

export function avancement(etapes: Pick<EtapeCalcul, "statut" | "poids">[]): Avancement {
  let poidsTotal = 0;
  let poidsFait = 0;
  let fait = 0;
  let enCours = 0;
  let aFaire = 0;
  for (const e of etapes) {
    if (e.statut === "abandonne") continue;
    const p = Math.min(5, Math.max(1, Math.trunc(e.poids || 1)));
    poidsTotal += p;
    if (e.statut === "fait") {
      poidsFait += p;
      fait++;
    } else if (e.statut === "en_cours") enCours++;
    else aFaire++;
  }
  return {
    pourcentage: poidsTotal === 0 ? 0 : Math.round((poidsFait * 100) / poidsTotal),
    fait,
    enCours,
    aFaire,
    total: fait + enCours + aFaire,
  };
}

/**
 * Regroupe les étapes par lot, dans l'ordre d'apparition du premier élément
 * de chaque lot (après tri par `ordre`). Les étapes sans lot vont dans « Général ».
 */
export function parLot<T extends Pick<EtapeCalcul, "lot" | "ordre">>(
  etapes: T[],
): { lot: string; etapes: T[] }[] {
  const tri = [...etapes].sort((a, b) => a.ordre - b.ordre);
  const groupes = new Map<string, T[]>();
  for (const e of tri) {
    const cle = e.lot?.trim() || "Général";
    if (!groupes.has(cle)) groupes.set(cle, []);
    groupes.get(cle)!.push(e);
  }
  return [...groupes.entries()].map(([lot, liste]) => ({ lot, etapes: liste }));
}

/** Prochaine chose à faire : d'abord ce qui est en cours, sinon la première étape à faire. */
export function prochaineEtape<T extends Pick<EtapeCalcul, "statut" | "ordre">>(etapes: T[]): T | null {
  const tri = [...etapes].sort((a, b) => a.ordre - b.ordre);
  return tri.find((e) => e.statut === "en_cours") ?? tri.find((e) => e.statut === "a_faire") ?? null;
}

/** Slug d'URL à partir d'un nom : minuscules, sans accents, tirets. */
export function slugifier(nom: string): string {
  return nom
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60)
    .replace(/-+$/g, "");
}

/**
 * [13/11/2026] Vue d'ensemble de TOUS les projets, pour le bandeau de /projets.
 *
 * - L'avancement global ne compte que les projets réellement ouverts
 *   (« en cours ») : une idée sans étape faite ferait baisser le chiffre
 *   sans rien dire de l'avancement réel, un projet livré le gonflerait.
 * - `poidsRestant` = la somme des poids des étapes pas encore faites : c'est
 *   la vraie quantité de travail devant soi, plus parlante qu'un nombre
 *   d'étapes (une étape de poids 5 vaut cinq petites).
 * - `enCours` sert d'alerte : plus il y a de projets ouverts en même temps,
 *   moins chacun avance. Le seuil d'alerte est un choix de pilotage, pas une
 *   règle technique : 3 projets actifs pour une personne seule.
 */
export const SEUIL_PROJETS_ACTIFS = 3;

export interface Synthese {
  enCours: number;
  idees: number;
  livres: number;
  pourcentageGlobal: number;
  poidsRestant: number;
  etapesRestantes: number;
}

export function synthese(
  projets: { id: string; statut: string }[],
  etapes: (Pick<EtapeCalcul, "statut" | "poids"> & { projet_id: string })[],
): Synthese {
  const ouverts = new Set(projets.filter((p) => p.statut === "en_cours").map((p) => p.id));
  const etapesOuvertes = etapes.filter((e) => ouverts.has(e.projet_id));
  const av = avancement(etapesOuvertes);
  const restantes = etapesOuvertes.filter((e) => e.statut === "a_faire" || e.statut === "en_cours");
  return {
    enCours: ouverts.size,
    idees: projets.filter((p) => p.statut === "idee").length,
    livres: projets.filter((p) => p.statut === "livre").length,
    pourcentageGlobal: av.pourcentage,
    poidsRestant: restantes.reduce((s, e) => s + Math.min(5, Math.max(1, Math.trunc(e.poids || 1))), 0),
    etapesRestantes: restantes.length,
  };
}

export const LIBELLES_STATUT_PROJET: Record<string, string> = {
  idee: "Idée",
  en_cours: "En cours",
  en_pause: "En pause",
  livre: "Livré",
  abandonne: "Abandonné",
};

export const LIBELLES_STATUT_ETAPE: Record<StatutEtape, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Fait",
  abandonne: "Abandonné",
};

export const LIBELLES_TYPE_JOURNAL: Record<string, string> = {
  fait: "Fait",
  decision: "Décision",
  bug: "Bug corrigé",
  note: "Note",
};
