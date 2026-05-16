/**
 * Géométrie 3D maison — classes Vertex, Face, Geometry.
 *
 * Pourquoi des classes maison ?
 *   - Three.js est trop lourd (cf. gl-utils.ts).
 *   - On a besoin de subdivider un icosaèdre et de le projeter sur une sphère
 *     ("spherize"). Pattern classique en computer graphics.
 *   - Cf. https://en.wikipedia.org/wiki/Geodesic_polyhedron
 *
 * Concepts :
 *   - Vertex : un point 3D (position, normale, UV de texture)
 *   - Face : un triangle (3 indices de Vertex)
 *   - Geometry : un ensemble de Vertex + Face, avec des méthodes de transformation
 */

import { vec2, vec3 } from "gl-matrix";

export class Vertex {
  position: vec3;
  normal: vec3;
  uv: vec2;

  constructor(x: number, y: number, z: number) {
    this.position = vec3.fromValues(x, y, z);
    this.normal = vec3.create();
    this.uv = vec2.create();
  }
}

export class Face {
  a: number;
  b: number;
  c: number;

  constructor(a: number, b: number, c: number) {
    this.a = a;
    this.b = b;
    this.c = c;
  }
}

export class Geometry {
  vertices: Vertex[] = [];
  faces: Face[] = [];

  addVertex(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.vertices.push(new Vertex(args[i]!, args[i + 1]!, args[i + 2]!));
    }
    return this;
  }

  addFace(...args: number[]): this {
    for (let i = 0; i < args.length; i += 3) {
      this.faces.push(new Face(args[i]!, args[i + 1]!, args[i + 2]!));
    }
    return this;
  }

  get lastVertex(): Vertex {
    return this.vertices[this.vertices.length - 1]!;
  }

  /**
   * Subdivise chaque face en 4 sous-faces (chaque triangle devient 4 triangles).
   * Utile pour augmenter la résolution d'une sphère faite d'icosaèdre.
   *
   * NB : volontairement NON appelée dans grid-engine.ts pour ne garder que les
   * 12 sommets de l'icosaèdre de base — adapté à 5 modules.
   */
  subdivide(divisions = 1): this {
    const midPointCache: Record<string, number> = {};
    let f = this.faces;
    for (let div = 0; div < divisions; ++div) {
      const newFaces = new Array<Face>(f.length * 4);
      f.forEach((face, ndx) => {
        const mAB = this.getMidPoint(face.a, face.b, midPointCache);
        const mBC = this.getMidPoint(face.b, face.c, midPointCache);
        const mCA = this.getMidPoint(face.c, face.a, midPointCache);
        const i = ndx * 4;
        newFaces[i + 0] = new Face(face.a, mAB, mCA);
        newFaces[i + 1] = new Face(face.b, mBC, mAB);
        newFaces[i + 2] = new Face(face.c, mCA, mBC);
        newFaces[i + 3] = new Face(mAB, mBC, mCA);
      });
      f = newFaces;
    }
    this.faces = f;
    return this;
  }

  /**
   * Projette tous les vertices sur une sphère de rayon donné.
   * C'est l'étape qui transforme un icosaèdre angulaire en sphère lisse.
   */
  spherize(radius = 1): this {
    this.vertices.forEach((vertex) => {
      vec3.normalize(vertex.normal, vertex.position);
      vec3.scale(vertex.position, vertex.normal, radius);
    });
    return this;
  }

  get data() {
    return {
      vertices: this.vertexData,
      indices: this.indexData,
      normals: this.normalData,
      uvs: this.uvData,
    };
  }

  get vertexData(): Float32Array {
    return new Float32Array(this.vertices.flatMap((v) => Array.from(v.position)));
  }

  get normalData(): Float32Array {
    return new Float32Array(this.vertices.flatMap((v) => Array.from(v.normal)));
  }

  get uvData(): Float32Array {
    return new Float32Array(this.vertices.flatMap((v) => Array.from(v.uv)));
  }

  get indexData(): Uint16Array {
    return new Uint16Array(this.faces.flatMap((f) => [f.a, f.b, f.c]));
  }

  private getMidPoint(
    ndxA: number,
    ndxB: number,
    cache: Record<string, number>
  ): number {
    const cacheKey = ndxA < ndxB ? `k_${ndxB}_${ndxA}` : `k_${ndxA}_${ndxB}`;
    if (Object.prototype.hasOwnProperty.call(cache, cacheKey)) {
      return cache[cacheKey]!;
    }
    const a = this.vertices[ndxA]!.position;
    const b = this.vertices[ndxB]!.position;
    const ndx = this.vertices.length;
    cache[cacheKey] = ndx;
    this.addVertex(
      (a[0] + b[0]) * 0.5,
      (a[1] + b[1]) * 0.5,
      (a[2] + b[2]) * 0.5
    );
    return ndx;
  }
}
