/**
 * Fragment shader InfiniteMenu — affiche la bonne tuile de l'atlas pour chaque disque.
 *
 * Comment marche l'atlas ?
 *   - Toutes les images des modules sont packées dans UNE seule texture.
 *   - Exemple avec 5 images : on en met 3x3 = 9 cases, on remplit les 5 premières.
 *   - L'atlas évite N bindTexture() par frame → meilleure perf GPU.
 *
 * Calcul de la cellule pour cette instance :
 *   - vInstanceId est passé par le vertex shader (variable flat).
 *   - On fait vInstanceId % uItemCount pour cycler sur les modules si l'icosaèdre
 *     a plus de sommets que de modules (12 sommets / 5 modules = répétitions).
 *   - Puis on calcule (cellX, cellY) dans la grille de l'atlas.
 *
 * Cover (image qui remplit le disque sans déformation) :
 *   - On calcule un scale qui prend le max du ratio image/container.
 *   - Le résultat : l'image est centrée et croppée si nécessaire (comme object-fit:cover).
 */

export const discFragmentShader = /* glsl */ `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform int uItemCount;
uniform int uAtlasSize;

out vec4 outColor;

in vec2 vUvs;
in float vAlpha;
flat in int vInstanceId;

void main() {
    int itemIndex = vInstanceId % uItemCount;
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
