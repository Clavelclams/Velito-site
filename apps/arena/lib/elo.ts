/**
 * ELO — classement de FORCE, utilisé en interne (module sport physique).
 *
 * Pourquoi de l'ELO ici alors que l'esport reste aux points cumulés 3/2/1 :
 *   - Les points cumulés récompensent la PARTICIPATION dans la durée. C'est le
 *     bon signal pour un classement public d'association d'inclusion.
 *   - L'ELO mesure une FORCE RELATIVE. Il ne sert pas à afficher un palmarès
 *     mais à composer des poules équilibrées et à placer les têtes de série.
 * Les deux coexistent : points en public, ELO côté staff uniquement.
 *
 * Le principe tient en une phrase : chaque joueur a une note ; avant le match
 * on calcule la probabilité de victoire attendue ; après le match on déplace
 * la note de l'écart entre le résultat réel (1 ou 0) et cette attente.
 * Battre un joueur bien mieux classé rapporte beaucoup, battre un joueur
 * bien moins bien classé ne rapporte presque rien.
 *
 * Module PUR : aucune dépendance à Supabase, à React ou à l'horloge.
 * Il se teste au millième près et se défend au tableau devant un jury.
 */

/** Note attribuée à un joueur qui n'a encore jamais joué. */
export const NOTE_INITIALE = 1000;

/**
 * Facteur K = amplitude maximale d'un ajustement.
 * K élevé → la note bouge vite (bien pour un débutant dont on ignore le
 * niveau réel). K faible → la note est stable (bien pour un joueur dont on a
 * déjà beaucoup de données). Le palier à 10 matchs est le réglage classique
 * dit « période de placement ».
 */
export function facteurK(nbMatchs: number): number {
  return nbMatchs < 10 ? 40 : 20;
}

/**
 * Probabilité que le camp A batte le camp B, entre 0 et 1.
 *
 * La formule logistique de référence : un écart de 400 points correspond à
 * 10 fois plus de chances de gagner (≈ 0.909). C'est cette échelle de 400 qui
 * donne son sens aux notes — on ne peut pas la changer sans tout recalibrer.
 */
export function probabiliteVictoire(noteA: number, noteB: number): number {
  return 1 / (1 + Math.pow(10, (noteB - noteA) / 400));
}

/**
 * Nouvelles notes après un duel individuel.
 * `gagnant` vaut "A" ou "B" — un match nul n'existe pas dans ARENA (le
 * bracket exige un vainqueur pour avancer), donc on ne modélise pas le 0.5.
 */
export function notesApresDuel(
  noteA: number,
  noteB: number,
  gagnant: "A" | "B",
  kA: number = facteurK(0),
  kB: number = facteurK(0)
): { noteA: number; noteB: number } {
  const attenduA = probabiliteVictoire(noteA, noteB);
  const reelA = gagnant === "A" ? 1 : 0;
  // Le delta de B est le miroir exact : attenduB = 1 - attenduA et
  // reelB = 1 - reelA, donc (reelB - attenduB) = -(reelA - attenduA).
  const ecart = reelA - attenduA;
  return {
    noteA: Math.round(noteA + kA * ecart),
    noteB: Math.round(noteB - kB * ecart),
  };
}

/** Un camp du match : ses joueurs, avec leur note et leur nombre de matchs. */
export interface JoueurNote {
  joueurId: string;
  note: number;
  nbMatchs: number;
}

/**
 * Nouvelles notes après un match PAR ÉQUIPES (padel en double, five...).
 *
 * Convention retenue, à assumer : la force d'une équipe est la MOYENNE des
 * notes de ses membres, et chaque membre encaisse le même écart. C'est le
 * modèle standard (utilisé par la plupart des ligues amateur) et le seul
 * défendable sans données individuelles : sur un match de padel on ne sait
 * pas qui a porté la paire.
 *
 * Conséquence assumée : un joueur faible associé à un fort progresse vite s'il
 * gagne. C'est voulu — ça pousse au mélange des niveaux, ce qui est exactement
 * l'objectif d'une association d'inclusion.
 *
 * Retourne la nouvelle note de CHAQUE joueur des deux camps.
 */
export function notesApresMatchEquipes(
  campA: readonly JoueurNote[],
  campB: readonly JoueurNote[],
  gagnant: "A" | "B"
): Map<string, number> {
  const resultat = new Map<string, number>();
  if (campA.length === 0 || campB.length === 0) return resultat;

  const moyenne = (camp: readonly JoueurNote[]) =>
    camp.reduce((s, j) => s + j.note, 0) / camp.length;

  const forceA = moyenne(campA);
  const forceB = moyenne(campB);
  const attenduA = probabiliteVictoire(forceA, forceB);
  const ecartA = (gagnant === "A" ? 1 : 0) - attenduA;

  for (const j of campA) {
    resultat.set(j.joueurId, Math.round(j.note + facteurK(j.nbMatchs) * ecartA));
  }
  for (const j of campB) {
    resultat.set(j.joueurId, Math.round(j.note - facteurK(j.nbMatchs) * ecartA));
  }
  return resultat;
}

/**
 * Répartit des joueurs en poules ÉQUILIBRÉES à partir de leurs notes
 * (méthode du serpentin) : on trie par niveau décroissant puis on distribue
 * A, B, B, A, A, B… Résultat : chaque poule reçoit un fort, un faible et des
 * intermédiaires, au lieu d'une poule de la mort et d'une poule de figuration.
 *
 * C'est la seule utilisation « visible » de l'ELO : il ne s'affiche jamais,
 * il sert à faire des poules qui tiennent debout.
 */
export function repartirEnPoulesEquilibrees(
  participants: readonly JoueurNote[],
  nbPoules: number
): string[][] {
  const poules: string[][] = Array.from({ length: Math.max(1, nbPoules) }, () => []);
  // Tri décroissant ; à note égale on garde un ordre stable par identifiant
  // pour que la fonction soit déterministe (indispensable pour la tester).
  const tries = [...participants].sort(
    (a, b) => b.note - a.note || a.joueurId.localeCompare(b.joueurId)
  );

  tries.forEach((joueur, index) => {
    const tour = Math.floor(index / poules.length);
    const positionDansLeTour = index % poules.length;
    // Serpentin : un tour sur deux, on parcourt les poules à l'envers.
    const cible =
      tour % 2 === 0 ? positionDansLeTour : poules.length - 1 - positionDansLeTour;
    poules[cible]!.push(joueur.joueurId);
  });

  return poules;
}
