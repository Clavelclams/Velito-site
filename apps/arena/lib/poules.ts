/**
 * POULES + PHASE FINALE — moteur pur, zéro I/O, testé (poules.test.ts).
 *
 * POURQUOI CE FORMAT : en tournoi amateur, l'élimination directe est brutale —
 * la moitié des joueurs a fini après un seul match. Les poules garantissent
 * plusieurs matchs à tout le monde, puis une phase finale à élimination
 * directe entre les qualifiés. C'est le format le plus demandé pour un
 * événement associatif qui dure une journée.
 *
 * DIFFÉRENCE STRUCTURANTE avec les autres formats : la génération se fait en
 * DEUX TEMPS. Au démarrage on ne crée que les matchs de poules ; les
 * qualifiés ne sont connus qu'une fois toutes les poules terminées, donc la
 * phase finale est générée par une SECONDE action (genererPhaseFinale).
 *
 * DÉCISIONS V1 (documentées, à défendre en jury) :
 *   1. 1 ou 2 qualifiés par poule. Au-delà, le croisement des têtes de série
 *      devient arbitraire et le bracket final perd son sens sportif.
 *   2. Départage : victoires, puis différence de score, puis confrontation
 *      directe (uniquement pour une égalité à DEUX — au-delà, on retombe sur
 *      un ordre stable et le staff tranche ; un mini-championnat à 3 est un
 *      cas rare qui mérite une décision humaine, pas un algorithme opaque).
 *   3. Round-robin par la méthode du cercle : chaque joueur affronte tous les
 *      autres exactement une fois, réparti en journées équilibrées.
 */

import { melangerJoueurs } from "./bracket";

/** Sentinelle interne : joueur au repos quand une poule est en effectif impair. */
const REPOS = "__REPOS__";

export interface MatchPouleGenere {
  poule: number; // 1..G
  journee: number; // 1..(taille-1)
  position: number; // index du match DANS la journée, 0-based
  joueur1Id: string;
  joueur2Id: string;
}

/** Un match de poule déjà joué, tel que lu en base. */
export interface ResultatPoule {
  joueur1Id: string | null;
  joueur2Id: string | null;
  scoreJ1: number | null;
  scoreJ2: number | null;
  valide: boolean;
}

export interface LignePoule {
  joueurId: string;
  joues: number;
  victoires: number;
  defaites: number;
  marques: number;
  encaisses: number;
  difference: number;
}

// ---------------------------------------------------------------------------
// Répartition
// ---------------------------------------------------------------------------

/**
 * Répartit les joueurs en `nbPoules` groupes équilibrés, après tirage au sort.
 * Distribution alternée (joueur i → poule i % nbPoules) : deux poules ne
 * peuvent jamais différer de plus d'un joueur.
 */
export function repartirEnPoules(
  joueurs: readonly string[],
  nbPoules: number,
  rng: () => number = Math.random
): string[][] {
  if (nbPoules < 1) throw new Error("Il faut au moins une poule.");
  if (joueurs.length < nbPoules * 2) {
    throw new Error(
      `Effectif insuffisant : ${nbPoules} poules exigent au moins ${nbPoules * 2} joueurs check-in (actuellement ${joueurs.length}).`
    );
  }
  const melanges = melangerJoueurs(joueurs, rng);
  const poules: string[][] = Array.from({ length: nbPoules }, () => []);
  melanges.forEach((j, i) => poules[i % nbPoules]!.push(j));
  return poules;
}

// ---------------------------------------------------------------------------
// Calendrier round-robin (méthode du cercle)
// ---------------------------------------------------------------------------

/**
 * Calendrier d'une poule : chaque joueur affronte tous les autres une fois.
 *
 * Méthode du cercle : on fixe le premier joueur et on fait tourner les autres.
 * Effectif impair → on ajoute un joueur fictif "repos" ; les paires qui le
 * contiennent ne produisent pas de match (le joueur concerné se repose ce
 * tour-là). Nombre de matchs produits : n(n-1)/2, toujours.
 */
export function genererCalendrierPoule(
  joueurs: readonly string[],
  numeroPoule: number
): MatchPouleGenere[] {
  if (joueurs.length < 2) {
    throw new Error("Une poule exige au moins 2 joueurs.");
  }
  const liste = [...joueurs];
  if (liste.length % 2 === 1) liste.push(REPOS);

  const n = liste.length;
  const matchs: MatchPouleGenere[] = [];

  for (let journee = 1; journee <= n - 1; journee++) {
    let position = 0;
    for (let i = 0; i < n / 2; i++) {
      const a = liste[i]!;
      const b = liste[n - 1 - i]!;
      if (a !== REPOS && b !== REPOS) {
        // Alternance de l'ordre des journées : évite qu'un même joueur soit
        // systématiquement "joueur1" (pur confort d'affichage).
        const inverser = journee % 2 === 0;
        matchs.push({
          poule: numeroPoule,
          journee,
          position: position++,
          joueur1Id: inverser ? b : a,
          joueur2Id: inverser ? a : b,
        });
      }
    }
    // Rotation : le premier reste fixe, les autres tournent d'un cran.
    liste.splice(1, 0, liste.pop()!);
  }
  return matchs;
}

/** Calendrier complet de toutes les poules. */
export function genererMatchsPoules(
  poules: readonly (readonly string[])[]
): MatchPouleGenere[] {
  return poules.flatMap((p, i) => genererCalendrierPoule(p, i + 1));
}

// ---------------------------------------------------------------------------
// Classement
// ---------------------------------------------------------------------------

/**
 * Classe les joueurs d'une poule. Seuls les matchs VALIDÉS comptent — un
 * score saisi mais non validé ne modifie pas le classement (cohérent avec le
 * règlement : la validation est l'acte qui fige un résultat).
 */
export function classementPoule(
  joueursPoule: readonly string[],
  matchs: readonly ResultatPoule[]
): LignePoule[] {
  const lignes = new Map<string, LignePoule>(
    joueursPoule.map((j) => [
      j,
      {
        joueurId: j,
        joues: 0,
        victoires: 0,
        defaites: 0,
        marques: 0,
        encaisses: 0,
        difference: 0,
      },
    ])
  );

  const valides = matchs.filter(
    (m) =>
      m.valide &&
      m.joueur1Id !== null &&
      m.joueur2Id !== null &&
      m.scoreJ1 !== null &&
      m.scoreJ2 !== null
  );

  for (const m of valides) {
    const l1 = lignes.get(m.joueur1Id!);
    const l2 = lignes.get(m.joueur2Id!);
    if (!l1 || !l2) continue; // match hors de cette poule
    const s1 = m.scoreJ1!;
    const s2 = m.scoreJ2!;
    l1.joues++;
    l2.joues++;
    l1.marques += s1;
    l1.encaisses += s2;
    l2.marques += s2;
    l2.encaisses += s1;
    if (s1 > s2) {
      l1.victoires++;
      l2.defaites++;
    } else if (s2 > s1) {
      l2.victoires++;
      l1.defaites++;
    }
  }

  for (const l of lignes.values()) l.difference = l.marques - l.encaisses;

  /** Gagnant du match direct entre a et b, ou null si non joué/non validé. */
  const confrontationDirecte = (a: string, b: string): string | null => {
    const duel = valides.find(
      (m) =>
        (m.joueur1Id === a && m.joueur2Id === b) ||
        (m.joueur1Id === b && m.joueur2Id === a)
    );
    if (!duel) return null;
    const gagnant =
      duel.scoreJ1! > duel.scoreJ2! ? duel.joueur1Id! : duel.joueur2Id!;
    return gagnant;
  };

  // Ordre d'entrée = départage ultime stable (jamais aléatoire).
  const rangEntree = new Map(joueursPoule.map((j, i) => [j, i]));

  return [...lignes.values()].sort((a, b) => {
    if (b.victoires !== a.victoires) return b.victoires - a.victoires;
    if (b.difference !== a.difference) return b.difference - a.difference;
    const vainqueur = confrontationDirecte(a.joueurId, b.joueurId);
    if (vainqueur === a.joueurId) return -1;
    if (vainqueur === b.joueurId) return 1;
    return rangEntree.get(a.joueurId)! - rangEntree.get(b.joueurId)!;
  });
}

/** Toutes les rencontres de la poule ont-elles été validées ? */
export function pouleTerminee(
  nbJoueurs: number,
  matchs: readonly ResultatPoule[]
): boolean {
  const attendus = (nbJoueurs * (nbJoueurs - 1)) / 2;
  return matchs.filter((m) => m.valide).length >= attendus;
}

// ---------------------------------------------------------------------------
// Qualification vers la phase finale
// ---------------------------------------------------------------------------

/**
 * Ordonne les qualifiés pour le bracket final.
 *
 * Objectif : deux joueurs sortis de la MÊME poule ne doivent pas se
 * retrouver dès le premier tour. Comme le bracket apparie (0,1), (2,3)…,
 * on croise les poules deux à deux : [A1, B2, B1, A2], [C1, D2, D1, C2]…
 *
 * ⚠️ Nombre IMPAIR de poules : la dernière n'a pas de partenaire de
 * croisement ; ses deux qualifiés peuvent se croiser au premier tour. Le
 * staff est prévenu à la création — privilégier un nombre pair de poules.
 */
export function ordonnerQualifies(
  classements: readonly (readonly string[])[],
  nbQualifiesParPoule: number
): string[] {
  if (nbQualifiesParPoule !== 1 && nbQualifiesParPoule !== 2) {
    throw new Error("V1 : 1 ou 2 qualifiés par poule (pas plus).");
  }

  // 1 qualifié : aucun risque de retrouvailles, ordre naturel des poules.
  if (nbQualifiesParPoule === 1) {
    return classements
      .map((c) => c[0])
      .filter((j): j is string => typeof j === "string");
  }

  const ordre: string[] = [];
  for (let i = 0; i < classements.length; i += 2) {
    const a = classements[i]!;
    const b = classements[i + 1];
    if (!b) {
      // Poule orpheline (nombre impair de poules).
      if (a[0]) ordre.push(a[0]);
      if (a[1]) ordre.push(a[1]);
      continue;
    }
    // Croisement : 1er A affronte 2e B, 1er B affronte 2e A.
    if (a[0]) ordre.push(a[0]);
    if (b[1]) ordre.push(b[1]);
    if (b[0]) ordre.push(b[0]);
    if (a[1]) ordre.push(a[1]);
  }
  return ordre;
}
