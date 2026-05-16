/**
 * Vertex shader Galaxy — trivial.
 *
 * Pattern "fullscreen quad" : ogl crée une géométrie Triangle qui couvre tout
 * l'écran (un seul triangle plus grand que le viewport, plus efficace qu'un
 * quad à 2 triangles car ça évite la diagonale partagée).
 *
 * On se contente de passer les UVs au fragment shader. Toute la beauté du rendu
 * (les étoiles, les halos, la rotation) est calculée DANS le fragment shader.
 *
 * Variables clés :
 *   - attribute position : coordonnées du sommet (passées par ogl)
 *   - attribute uv : coordonnées de texture (0,0 = coin haut-gauche, 1,1 = bas-droite)
 *   - varying vUv : interpolé entre les sommets, lu par le fragment shader
 *   - gl_Position : position finale du sommet à l'écran (z=0, w=1 = pas de perspective)
 */

export const galaxyVertexShader = /* glsl */ `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;
