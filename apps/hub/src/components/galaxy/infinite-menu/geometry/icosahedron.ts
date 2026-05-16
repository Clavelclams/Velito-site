/**
 * Géométries spécifiques : icosaèdre et disque plat.
 *
 * Pourquoi un icosaèdre pour placer les modules ?
 *   - 12 sommets répartis uniformément sur une sphère (polyèdre régulier).
 *   - C'est la géométrie qui maximise la distance minimale entre points sur une sphère
 *     pour N=12 → répartition VISUELLEMENT équilibrée.
 *   - Pour 5 modules : chaque module apparaîtra ~2-3 fois sur la sphère (12 % 5).
 *     Sans subdivision, ça reste lisible comme un menu de navigation.
 *
 * Pourquoi un disque plat et pas une sphère pour chaque "tuile" ?
 *   - On veut afficher l'image du module à plat, face caméra.
 *   - Un disque (cercle) avec une texture circulaire = look médaillon.
 *   - Cheap à dessiner (peu de triangles).
 *
 * Référence mathématique : t = (1 + sqrt(5)) / 2 = nombre d'or.
 * Les 12 sommets de l'icosaèdre sont obtenus par permutation des coordonnées (±1, ±t, 0).
 */

import { Geometry } from "./base";

export class IcosahedronGeometry extends Geometry {
  constructor() {
    super();
    const t = Math.sqrt(5) * 0.5 + 0.5;
    // 12 sommets : permutations cycliques de (±1, ±t, 0).
    // prettier-ignore
    this.addVertex(
      -1,  t,  0,    1,  t,  0,   -1, -t,  0,    1, -t,  0,
       0, -1,  t,    0,  1,  t,    0, -1, -t,    0,  1, -t,
       t,  0, -1,    t,  0,  1,   -t,  0, -1,   -t,  0,  1
    );
    // 20 faces triangulaires reliant ces 12 sommets.
    // prettier-ignore
    this.addFace(
      0, 11, 5,    0, 5, 1,    0, 1, 7,    0, 7, 10,    0, 10, 11,
      1, 5, 9,    5, 11, 4,    11, 10, 2,    10, 7, 6,    7, 1, 8,
      3, 9, 4,    3, 4, 2,    3, 2, 6,    3, 6, 8,    3, 8, 9,
      4, 9, 5,    2, 4, 11,    6, 2, 10,    8, 6, 7,    9, 8, 1
    );
  }
}

/**
 * DiscGeometry — un cercle plat (triangle fan depuis le centre).
 * steps = nombre de subdivisions du cercle (plus = plus lisse).
 */
export class DiscGeometry extends Geometry {
  constructor(steps = 4, radius = 1) {
    super();
    steps = Math.max(4, steps);
    const alpha = (2 * Math.PI) / steps;

    // Sommet central avec UV (0.5, 0.5) — milieu de la texture.
    this.addVertex(0, 0, 0);
    this.lastVertex.uv[0] = 0.5;
    this.lastVertex.uv[1] = 0.5;

    // Sommets sur la circonférence.
    for (let i = 0; i < steps; ++i) {
      const x = Math.cos(alpha * i);
      const y = Math.sin(alpha * i);
      this.addVertex(radius * x, radius * y, 0);
      this.lastVertex.uv[0] = x * 0.5 + 0.5;
      this.lastVertex.uv[1] = y * 0.5 + 0.5;
      if (i > 0) {
        this.addFace(0, i, i + 1);
      }
    }
    // Dernière face qui referme le cercle.
    this.addFace(0, steps, 1);
  }
}
