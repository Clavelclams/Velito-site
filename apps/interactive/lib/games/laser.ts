/**
 * LASER — logique pure (aucune dépendance Supabase / React : 100 % testable).
 *
 * Jeu PvP à élimination inspiré de « Blind Shot ». Adapté au format Interactive
 * (TV + manette mobile, au tour par tour) :
 *
 *  1. Phase « aim » : chaque joueur VIVANT, en secret, place son avatar dans la
 *     zone active du carré et oriente son laser (un angle). Rien n'est visible
 *     des autres pendant cette phase.
 *  2. Phase « reveal » : au décompte, TOUS les avatars ET leurs lasers
 *     apparaissent en même temps sur la TV. Chaque laser part de la position du
 *     tireur dans sa direction jusqu'au bord de l'arène.
 *
 * Règles (volontairement SIMPLES — décision Clavel 08/07/2026) :
 *  - Si TON laser touche un adversaire → cet adversaire est ÉLIMINÉ.
 *  - Rater (ne toucher personne) → AUCUNE conséquence (pas de malus).
 *  - Pas de points de vie : une seule touche = mort.
 *  - Hors de la zone active (qui rétrécit à chaque manche) → éliminé.
 *  - Absent (pas de coup joué à temps) → éliminé.
 *  - Dernier survivant = vainqueur.
 *
 * Repère : carré normalisé [0,1] × [0,1] (même logique côté TV et téléphones).
 */

// ─────────────────────────── Constantes ───────────────────────────

/** Rayon de « touche » : distance max entre un laser et un avatar pour toucher. */
export const RAYON_TOUCHE = 0.05;
/** Durée de la phase de placement/visée (secondes). */
export const AIM_DURATION_SEC = 15;
/** Durée du reveal sur la TV (secondes). */
export const REVEAL_DURATION_SEC = 6;
/** Rétrécissement de la demi-largeur de zone par manche. */
export const ZONE_SHRINK_PER_ROUND = 0.06;
/** Demi-largeur minimale de la zone (jamais dégénérée). */
export const ZONE_MIN_HALF = 0.12;
/** Nombre minimum de joueurs pour lancer une partie. */
export const LASER_MIN_PLAYERS = 3;

// ─────────────────────────── Types ───────────────────────────

export interface Point {
  x: number;
  y: number;
}

/** Zone active : carré centré [min, max]² dans l'arène [0,1]². */
export interface Zone {
  min: number;
  max: number;
}

/** Un joueur tel qu'il entre dans la résolution d'une manche. */
export interface JoueurManche {
  id: string;
  /** Position choisie (absente si le joueur n'a pas joué). */
  pos?: Point;
  /** Angle du laser en radians (absent si pas joué). */
  angle?: number;
  /** true si le joueur a verrouillé un coup à temps. */
  aJoue: boolean;
}

/** Un laser calculé, pour l'animation TV. */
export interface LaserTrace {
  id: string; // id du tireur
  from: Point;
  to: Point;
  /** true si ce laser a touché au moins un adversaire. */
  touche: boolean;
}

export interface ResolutionManche {
  /** IDs éliminés cette manche (touchés, hors zone, ou absents). */
  elimines: string[];
  /** IDs encore en vie après la manche. */
  survivants: string[];
  /** Pour chaque cible touchée : la liste des tireurs qui l'ont touchée. */
  touchesPar: Map<string, string[]>;
  /** Tracés des lasers (joueurs ayant joué), pour la TV. */
  lasers: LaserTrace[];
}

// ─────────────────────────── Zone ───────────────────────────

/**
 * Zone active pour une manche donnée (manche 0 = arène entière).
 * La demi-largeur rétrécit puis se stabilise à ZONE_MIN_HALF.
 */
export function zonePourManche(round: number): Zone {
  const half = Math.max(ZONE_MIN_HALF, 0.5 - round * ZONE_SHRINK_PER_ROUND);
  return { min: 0.5 - half, max: 0.5 + half };
}

/** Vrai si le point est DANS la zone active (bords inclus). */
export function estDansZone(p: Point, zone: Zone): boolean {
  return p.x >= zone.min && p.x <= zone.max && p.y >= zone.min && p.y <= zone.max;
}

// ─────────────────────────── Géométrie ───────────────────────────

/** Distance euclidienne entre deux points. */
export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Point où le rayon partant de `pos` dans la direction `angle` sort de
 * l'arène [0,1]². Sert à borner le laser en un segment fini.
 * Si le point est déjà au bord et vise vers l'extérieur, renvoie `pos`
 * (laser de longueur ~0 — cas dégénéré inoffensif).
 */
export function extremiteLaser(pos: Point, angle: number): Point {
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  let tMax = Infinity;
  // Pour chaque axe, distance jusqu'au bord atteint dans le sens de la direction.
  if (dx > 1e-9) tMax = Math.min(tMax, (1 - pos.x) / dx);
  else if (dx < -1e-9) tMax = Math.min(tMax, (0 - pos.x) / dx);
  if (dy > 1e-9) tMax = Math.min(tMax, (1 - pos.y) / dy);
  else if (dy < -1e-9) tMax = Math.min(tMax, (0 - pos.y) / dy);

  if (!isFinite(tMax) || tMax < 0) tMax = 0;
  return { x: pos.x + dx * tMax, y: pos.y + dy * tMax };
}

/**
 * Distance d'un point `p` au segment [a, b].
 * Projection bornée sur le segment (paramètre t clampé dans [0,1]).
 */
export function distancePointSegment(p: Point, a: Point, b: Point): number {
  const abx = b.x - a.x;
  const aby = b.y - a.y;
  const lenSq = abx * abx + aby * aby;
  if (lenSq === 0) return distance(p, a); // segment dégénéré = point
  let t = ((p.x - a.x) * abx + (p.y - a.y) * aby) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const proj = { x: a.x + abx * t, y: a.y + aby * t };
  return distance(p, proj);
}

/**
 * Vrai si le laser tiré depuis `tireurPos` selon `angle` touche la cible
 * située en `ciblePos` (distance au segment-laser < `rayon`).
 */
export function laserTouche(
  tireurPos: Point,
  angle: number,
  ciblePos: Point,
  rayon: number = RAYON_TOUCHE,
): boolean {
  const bout = extremiteLaser(tireurPos, angle);
  return distancePointSegment(ciblePos, tireurPos, bout) < rayon;
}

// ─────────────────────────── Résolution d'une manche ───────────────────────────

/**
 * Résout une manche : qui touche qui, qui est éliminé, qui survit.
 *
 * Élimination (union) :
 *  - touché par ≥ 1 laser adverse ;
 *  - OU position hors de la zone active ;
 *  - OU absent (pas de coup valide joué).
 * Aucun malus de raté, aucun auto-dégât (on ne se touche jamais soi-même).
 *
 * @param joueurs  les joueurs ENCORE EN VIE au début de la manche
 * @param zone     zone active de la manche
 * @param rayon    rayon de touche (défaut RAYON_TOUCHE)
 */
export function resoudreManche(
  joueurs: JoueurManche[],
  zone: Zone,
  rayon: number = RAYON_TOUCHE,
): ResolutionManche {
  // Tireurs valides = ceux qui ont joué (pos + angle définis).
  const tireurs = joueurs.filter(
    (j) => j.aJoue && j.pos !== undefined && j.angle !== undefined,
  );

  const touchesPar = new Map<string, string[]>();
  const lasers: LaserTrace[] = [];

  for (const t of tireurs) {
    const from = t.pos!;
    const bout = extremiteLaser(from, t.angle!);
    let aTouche = false;

    for (const cible of joueurs) {
      if (cible.id === t.id) continue; // jamais soi-même
      if (!cible.pos) continue; // une cible sans position ne peut être touchée
      if (distancePointSegment(cible.pos, from, bout) < rayon) {
        aTouche = true;
        const liste = touchesPar.get(cible.id) ?? [];
        liste.push(t.id);
        touchesPar.set(cible.id, liste);
      }
    }

    lasers.push({ id: t.id, from, to: bout, touche: aTouche });
  }

  const elimines: string[] = [];
  const survivants: string[] = [];

  for (const j of joueurs) {
    const absent = !j.aJoue || !j.pos || j.angle === undefined;
    const horsZone = !!j.pos && !estDansZone(j.pos, zone);
    const touche = touchesPar.has(j.id);

    if (absent || horsZone || touche) elimines.push(j.id);
    else survivants.push(j.id);
  }

  return { elimines, survivants, touchesPar, lasers };
}

// ─────────────────────────── État de session ───────────────────────────

/** État LASER stocké dans sessions.current_state. */
export interface LaserState {
  phase: "aim" | "reveal" | "final";
  round: number;
  zone: Zone;
  aimStartedAt?: string;
  aimDurationSec?: number;
  revealStartedAt?: string;
  revealDurationSec?: number;
  /** Dernière résolution, pour rejouer l'animation côté TV. */
  lastResolution?: {
    lasers: LaserTrace[];
    positions: { playerId: string; x: number; y: number }[];
    eliminated: string[];
  };
  /** Gagnant(s) : 1 survivant, ou plusieurs en cas d'élimination mutuelle. */
  winners?: string[];
}
