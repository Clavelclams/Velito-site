/**
 * Fragment shader InfiniteMenu — affiche la bonne tuile de l'atlas pour chaque disque.
 *
 * Comment marche l'atlas ?
 *   - Toutes les images des modules sont packées dans UNE seule texture.
 *   - Avec 9 modules, 3x3 = 9 cases (atlasSize = 3).
 *   - L'atlas évite N bindTexture() par frame → meilleure perf GPU.
 *
 * Sélection du module pour cette instance — IMPORTANT :
 *   - L'ancienne version utilisait `vInstanceId % uItemCount` qui produit un
 *     pattern séquentiel répétitif et place souvent deux mêmes modules côte à
 *     côte sur la sphère (sommets adjacents → indices consécutifs → modules
 *     consécutifs → modulo récurrent).
 *   - La nouvelle version utilise un mapping pré-calculé côté JS via un
 *     algorithme de graph coloring glouton (cf. grid-engine.ts → computeItemMapping).
 *     Garantit qu'aucun voisin sur la sphère n'a le même module (sauf cas dégénéré
 *     mathématiquement impossible avec 9 modules).
 *
 * Le mapping est passé en uniform `uItemMap[64]`. 64 est la limite arbitraire
 * supportée : on utilise actuellement 42 slots (icosaèdre subdivisé 1 fois).
 * Si on passe à subdivide(2) → 162 sommets, il faudra augmenter MAX_ITEMS.
 *
 * Cover (image qui remplit le disque sans déformation) :
 *   - On calcule un scale qui prend le max du ratio image/container.
 *   - L'image est centrée et croppée si nécessaire (object-fit:cover).
 */

export const discFragmentShader = /* glsl */ `#version 300 es
precision highp float;

#define MAX_ITEMS 64

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;
uniform int uItemMap[MAX_ITEMS];

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

void main() {
    int itemIndex = uItemMap[vInstanceId];
    int cellsPerRow = uAtlasSize;
    int cellX = itemIndex % cellsPerRow;
    int cellY = itemIndex / cellsPerRow;
    vec2 cellSize = vec2(1.0) / vec2(float(cellsPerRow));
    vec2 cellOffset = vec2(float(cellX), float(cellY)) * cellSize;

    ivec2 texSize = textureSize(uTex, 0);
    float imageAspect = float(texSize.x) / float(texSize.y);
    float containerAspect = 1.0;
    float scale = max(imageAspect / containerAspect, containerAspect / imageAspect);

    vec2 st = vec2(vUvs.x, 1.0 - vUvs.y);
    st = (st - 0.5) * scale + 0.5;
    st = clamp(st, 0.0, 1.0);
    st = st * cellSize + cellOffset;

    outColor = texture(uTex, st);
    outColor.a *= vAlpha;
}
`;
