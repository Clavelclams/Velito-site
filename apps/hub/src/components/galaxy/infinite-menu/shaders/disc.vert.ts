/**
 * Vertex shader InfiniteMenu — déforme les disques selon la rotation de la sphère.
 *
 * Concepts à comprendre pour défendre devant le jury :
 *   - On utilise WebGL 2 (#version 300 es) pour pouvoir faire de l'INSTANCING :
 *     un seul appel de draw qui rend N copies du même disque, chacune avec sa
 *     propre matrice (aInstanceMatrix) qui dit où la placer sur la sphère.
 *   - Sans instancing, il faudrait N draw calls → catastrophique en perf.
 *
 * Pourquoi déformer les vertices selon rotationAxisVelocity ?
 *   - Quand l'utilisateur fait tourner la sphère vite, les disques s'allongent
 *     légèrement dans la direction de la rotation (effet "motion blur géométrique").
 *   - Donne une impression de vitesse, comme dans un slot machine.
 *   - C'est purement décoratif mais ça rend le mouvement vivant.
 *
 * vAlpha :
 *   - Calculé via smoothstep sur la composante Z du sommet normalisé.
 *   - Les disques au DOS de la sphère (z < 0) sont semi-transparents.
 *   - Donne la profondeur sans avoir besoin d'un depth buffer complexe.
 *
 * vInstanceId :
 *   - Variable "flat" (pas interpolée) → vaut le numéro de l'instance entier.
 *   - Le fragment shader l'utilise pour piocher la bonne tuile dans l'atlas.
 */

export const discVertexShader = /* glsl */ `#version 300 es
uniform mat4 uWorldMatrix;
uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;
uniform vec3 uCameraPosition;
uniform vec4 uRotationAxisVelocity;

in vec3 aModelPosition;
in vec3 aModelNormal;
in vec2 aModelUvs;
in mat4 aInstanceMatrix;

out vec2 vUvs;
out float vAlpha;
flat out int vInstanceId;

#define PI 3.141593

void main() {
    vec4 worldPosition = uWorldMatrix * aInstanceMatrix * vec4(aModelPosition, 1.);

    vec3 centerPos = (uWorldMatrix * aInstanceMatrix * vec4(0., 0., 0., 1.)).xyz;
    float radius = length(centerPos.xyz);

    if (gl_VertexID > 0) {
        vec3 rotationAxis = uRotationAxisVelocity.xyz;
        float rotationVelocity = min(.15, uRotationAxisVelocity.w * 15.);
        vec3 stretchDir = normalize(cross(centerPos, rotationAxis));
        vec3 relativeVertexPos = normalize(worldPosition.xyz - centerPos);
        float strength = dot(stretchDir, relativeVertexPos);
        float invAbsStrength = min(0., abs(strength) - 1.);
        strength = rotationVelocity * sign(strength) * abs(invAbsStrength * invAbsStrength * invAbsStrength + 1.);
        worldPosition.xyz += stretchDir * strength;
    }

    worldPosition.xyz = radius * normalize(worldPosition.xyz);

    gl_Position = uProjectionMatrix * uViewMatrix * worldPosition;

    vAlpha = smoothstep(0.5, 1., normalize(worldPosition.xyz).z) * .9 + .1;
    vUvs = aModelUvs;
    vInstanceId = gl_InstanceID;
}
`;
