/**
 * Tests unitaires de la logique pure LASER.
 * Lancer : node --experimental-strip-types lib/games/laser.test.ts
 * (aucune dépendance externe — géométrie + résolution de manche).
 */
import {
  zonePourManche,
  estDansZone,
  distance,
  extremiteLaser,
  distancePointSegment,
  laserTouche,
  resoudreManche,
  RAYON_TOUCHE,
  ZONE_MIN_HALF,
  type JoueurManche,
} from "./laser.ts";

let pass = 0;
let fail = 0;
function ok(nom: string, cond: boolean) {
  if (cond) {
    pass++;
    console.log(`  ✓ ${nom}`);
  } else {
    fail++;
    console.error(`  ✗ ${nom}`);
  }
}
const proche = (a: number, b: number, eps = 1e-9) => Math.abs(a - b) < eps;

// ── Zone ──
console.log("Zone");
ok("manche 0 = arène entière", (() => {
  const z = zonePourManche(0);
  return proche(z.min, 0) && proche(z.max, 1);
})());
ok("zone rétrécit à la manche 1", (() => {
  const z = zonePourManche(1);
  return z.min > 0 && z.max < 1;
})());
ok("zone se stabilise au minimum (jamais dégénérée)", (() => {
  const z = zonePourManche(100);
  return proche(z.max - z.min, 2 * ZONE_MIN_HALF) && z.min < z.max;
})());
ok("centre toujours dans la zone", estDansZone({ x: 0.5, y: 0.5 }, zonePourManche(50)));
ok("coin exclu quand la zone a rétréci", !estDansZone({ x: 0, y: 0 }, zonePourManche(3)));

// ── Géométrie de base ──
console.log("Géométrie");
ok("distance 3-4-5", proche(distance({ x: 0, y: 0 }, { x: 3, y: 4 }), 5));
ok("extremite vers la droite atteint x=1", (() => {
  const e = extremiteLaser({ x: 0.5, y: 0.5 }, 0); // angle 0 = +x
  return proche(e.x, 1) && proche(e.y, 0.5);
})());
ok("extremite vers le haut atteint y=1", (() => {
  const e = extremiteLaser({ x: 0.5, y: 0.5 }, Math.PI / 2); // +y
  return proche(e.x, 0.5) && proche(e.y, 1);
})());
ok("distance point-segment : projection interne", proche(
  distancePointSegment({ x: 0.5, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
  1,
));
ok("distance point-segment : au-delà de l'extrémité = distance au bout", proche(
  distancePointSegment({ x: 2, y: 0 }, { x: 0, y: 0 }, { x: 1, y: 0 }),
  1,
));
ok("segment dégénéré = distance au point", proche(
  distancePointSegment({ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 0, y: 0 }),
  1,
));

// ── laserTouche ──
console.log("laserTouche");
ok("touche une cible alignée devant", laserTouche({ x: 0.1, y: 0.5 }, 0, { x: 0.6, y: 0.5 }));
ok("rate une cible décalée", !laserTouche({ x: 0.1, y: 0.5 }, 0, { x: 0.6, y: 0.8 }));
ok("ne touche pas une cible DERRIÈRE le tireur", !laserTouche({ x: 0.5, y: 0.5 }, 0, { x: 0.1, y: 0.5 }));

// ── resoudreManche ──
console.log("resoudreManche");
const zoneFull = zonePourManche(0);

// A tire vers B (aligné) ; B tire dans le vide.
{
  const joueurs: JoueurManche[] = [
    { id: "A", pos: { x: 0.1, y: 0.5 }, angle: 0, aJoue: true },
    { id: "B", pos: { x: 0.6, y: 0.5 }, angle: Math.PI / 2, aJoue: true },
  ];
  const r = resoudreManche(joueurs, zoneFull);
  ok("B touché par A → éliminé", r.elimines.includes("B"));
  ok("A survit (raté sans conséquence)", r.survivants.includes("A") && !r.elimines.includes("A"));
  ok("touchesPar recense A comme tireur sur B", r.touchesPar.get("B")?.includes("A") === true);
  ok("le laser de A est marqué touche=true", r.lasers.find((l) => l.id === "A")?.touche === true);
  ok("le laser de B est marqué touche=false", r.lasers.find((l) => l.id === "B")?.touche === false);
}

// Raté total : personne ne touche personne → tout le monde survit.
{
  const joueurs: JoueurManche[] = [
    { id: "A", pos: { x: 0.1, y: 0.1 }, angle: Math.PI / 2, aJoue: true }, // vers le haut
    { id: "B", pos: { x: 0.9, y: 0.9 }, angle: Math.PI / 2, aJoue: true },
  ];
  const r = resoudreManche(joueurs, zoneFull);
  ok("raté mutuel → 0 éliminé", r.elimines.length === 0);
  ok("raté mutuel → 2 survivants", r.survivants.length === 2);
}

// On ne se touche jamais soi-même (laser part de sa propre position).
{
  const joueurs: JoueurManche[] = [
    { id: "A", pos: { x: 0.5, y: 0.5 }, angle: 0, aJoue: true },
  ];
  const r = resoudreManche(joueurs, zoneFull);
  ok("seul en lice, ne s'auto-élimine pas", r.survivants.includes("A") && r.elimines.length === 0);
}

// Hors zone → éliminé même sans être touché.
{
  const zone = zonePourManche(3); // rétrécie
  const joueurs: JoueurManche[] = [
    { id: "A", pos: { x: 0.5, y: 0.5 }, angle: 0, aJoue: true }, // centre = dans la zone
    { id: "B", pos: { x: 0.02, y: 0.02 }, angle: Math.PI, aJoue: true }, // coin = hors zone
  ];
  const r = resoudreManche(joueurs, zone);
  ok("hors zone → éliminé", r.elimines.includes("B"));
  ok("dans la zone → survit", r.survivants.includes("A"));
}

// Absent (pas de coup joué) → éliminé, et ne peut pas être touché ni toucher.
{
  const joueurs: JoueurManche[] = [
    { id: "A", pos: { x: 0.1, y: 0.5 }, angle: 0, aJoue: true },
    { id: "B", aJoue: false }, // n'a rien joué
  ];
  const r = resoudreManche(joueurs, zoneFull);
  ok("absent → éliminé", r.elimines.includes("B"));
  ok("absent ne génère pas de laser", !r.lasers.find((l) => l.id === "B"));
  ok("le tireur A ne touche pas un absent (sans position) → survit seul", r.survivants.includes("A"));
}

// Double touche : deux tireurs touchent la même cible → une seule élimination, deux tireurs listés.
{
  const joueurs: JoueurManche[] = [
    { id: "A", pos: { x: 0.1, y: 0.5 }, angle: 0, aJoue: true }, // → +x vers C
    { id: "B", pos: { x: 0.5, y: 0.1 }, angle: Math.PI / 2, aJoue: true }, // → +y vers C
    { id: "C", pos: { x: 0.5, y: 0.5 }, angle: 0, aJoue: true },
  ];
  const r = resoudreManche(joueurs, zoneFull);
  ok("C touché par A et B", (r.touchesPar.get("C")?.length ?? 0) === 2);
  ok("C n'apparaît qu'une fois dans elimines", r.elimines.filter((x) => x === "C").length === 1);
}

// Élimination mutuelle : A et B s'alignent l'un sur l'autre → les deux éliminés, 0 survivant.
{
  const joueurs: JoueurManche[] = [
    { id: "A", pos: { x: 0.2, y: 0.5 }, angle: 0, aJoue: true }, // → +x vers B
    { id: "B", pos: { x: 0.8, y: 0.5 }, angle: Math.PI, aJoue: true }, // → -x vers A
  ];
  const r = resoudreManche(joueurs, zoneFull);
  ok("duel aligné → 2 éliminés", r.elimines.length === 2);
  ok("duel aligné → 0 survivant (égalité à gérer côté serveur)", r.survivants.length === 0);
}

// Rayon exact : cible juste à la limite du rayon → NON touchée (strictement <).
{
  const joueurs: JoueurManche[] = [
    { id: "A", pos: { x: 0.1, y: 0.5 }, angle: 0, aJoue: true },
    { id: "B", pos: { x: 0.5, y: 0.5 + RAYON_TOUCHE }, angle: Math.PI / 2, aJoue: true },
  ];
  const r = resoudreManche(joueurs, zoneFull);
  ok("cible pile à distance = rayon → PAS touchée (strict <)", !r.elimines.includes("B") || r.touchesPar.has("B") === false);
}

console.log(`\n${pass} PASS / ${fail} FAIL`);
if (fail > 0) process.exit(1);
