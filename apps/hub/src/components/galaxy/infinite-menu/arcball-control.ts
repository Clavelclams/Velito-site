/**
 * ArcballControl — gère la rotation de la sphère via la souris/le doigt.
 *
 * C'est quoi un arcball ?
 *   - Imagine une sphère virtuelle qui couvre l'écran.
 *   - Quand tu cliques+glisses, on projette le point souris SUR cette sphère.
 *   - La différence entre 2 frames donne un axe + un angle de rotation.
 *   - Tu peux faire tourner la sphère dans N'IMPORTE QUELLE direction.
 *   - Concept inventé par Ken Shoemake en 1992.
 *
 * Pourquoi des quaternions et pas des angles d'Euler ?
 *   - Les angles d'Euler souffrent du "gimbal lock" (perte d'un axe).
 *   - Les quaternions composent proprement, interpolent en ligne droite (slerp),
 *     et ne perdent jamais d'axe.
 *   - Un quaternion = (x, y, z, w) où (x,y,z) est l'axe et w lié à l'angle.
 *   - Pour le jury CDA : "quaternion = nombre à 4 dimensions qui représente une
 *     rotation 3D sans souffrir des problèmes des angles d'Euler".
 *
 * Modifications par rapport à React Bits :
 *   - Ajout d'une AUTO-ROTATION lente sur l'axe Y tant que l'utilisateur n'a pas
 *     interagi (visuel d'attraction). S'arrête au premier pointerdown.
 *   - Ajout d'un callback onFirstInteraction() pour faire fade-out le hint texte.
 *   - Ajout de la méthode dispose() pour bien nettoyer les listeners.
 */

import { quat, vec2, vec3 } from "gl-matrix";

/** Vitesse de l'auto-rotation Y (radians par frame à 60fps). Discret mais perceptible. */
const AUTO_ROTATION_Y_SPEED = 0.003;

export class ArcballControl {
  isPointerDown = false;
  /** Indique si l'utilisateur a déjà touché la sphère (stoppe l'auto-rotation). */
  hasInteracted = false;
  orientation = quat.create();
  pointerRotation = quat.create();
  rotationVelocity = 0;
  rotationAxis: vec3 = vec3.fromValues(1, 0, 0);
  snapDirection: vec3 = vec3.fromValues(0, 0, -1);
  snapTargetDirection?: vec3;
  EPSILON = 0.1;
  IDENTITY_QUAT = quat.create();

  private canvas: HTMLCanvasElement;
  private updateCallback: (deltaTime: number) => void;
  private onFirstInteraction?: () => void;
  private pointerPos = vec2.create();
  private previousPointerPos = vec2.create();
  private _rotationVelocity = 0;
  private _combinedQuat = quat.create();

  // Listeners stockés pour pouvoir les retirer dans dispose().
  private boundPointerDown: (e: PointerEvent) => void;
  private boundPointerUp: () => void;
  private boundPointerLeave: () => void;
  private boundPointerMove: (e: PointerEvent) => void;

  constructor(
    canvas: HTMLCanvasElement,
    updateCallback?: (deltaTime: number) => void,
    onFirstInteraction?: () => void
  ) {
    this.canvas = canvas;
    this.updateCallback = updateCallback || (() => null);
    this.onFirstInteraction = onFirstInteraction;

    this.boundPointerDown = (e: PointerEvent) => {
      vec2.set(this.pointerPos, e.clientX, e.clientY);
      vec2.copy(this.previousPointerPos, this.pointerPos);
      this.isPointerDown = true;
      // Premier toucher → on coupe l'auto-rotation et on notifie le composant React.
      if (!this.hasInteracted) {
        this.hasInteracted = true;
        this.onFirstInteraction?.();
      }
    };
    this.boundPointerUp = () => {
      this.isPointerDown = false;
    };
    this.boundPointerLeave = () => {
      this.isPointerDown = false;
    };
    this.boundPointerMove = (e: PointerEvent) => {
      if (this.isPointerDown) {
        vec2.set(this.pointerPos, e.clientX, e.clientY);
      }
    };

    canvas.addEventListener("pointerdown", this.boundPointerDown);
    canvas.addEventListener("pointerup", this.boundPointerUp);
    canvas.addEventListener("pointerleave", this.boundPointerLeave);
    canvas.addEventListener("pointermove", this.boundPointerMove);
    canvas.style.touchAction = "none";
  }

  /** Retire les listeners — à appeler au démontage. */
  dispose(): void {
    this.canvas.removeEventListener("pointerdown", this.boundPointerDown);
    this.canvas.removeEventListener("pointerup", this.boundPointerUp);
    this.canvas.removeEventListener("pointerleave", this.boundPointerLeave);
    this.canvas.removeEventListener("pointermove", this.boundPointerMove);
  }

  update(deltaTime: number, targetFrameDuration = 16): void {
    const timeScale = deltaTime / targetFrameDuration + 0.00001;
    let angleFactor = timeScale;
    const snapRotation = quat.create();

    if (this.isPointerDown) {
      const INTENSITY = 0.3 * timeScale;
      const ANGLE_AMPLIFICATION = 5 / timeScale;
      const midPointerPos = vec2.sub(vec2.create(), this.pointerPos, this.previousPointerPos);
      vec2.scale(midPointerPos, midPointerPos, INTENSITY);
      if (vec2.sqrLen(midPointerPos) > this.EPSILON) {
        vec2.add(midPointerPos, this.previousPointerPos, midPointerPos);
        const p = this.project(midPointerPos);
        const q = this.project(this.previousPointerPos);
        const a = vec3.normalize(vec3.create(), p);
        const b = vec3.normalize(vec3.create(), q);
        vec2.copy(this.previousPointerPos, midPointerPos);
        angleFactor *= ANGLE_AMPLIFICATION;
        this.quatFromVectors(a, b, this.pointerRotation, angleFactor);
      } else {
        quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      }
    } else {
      const INTENSITY = 0.1 * timeScale;
      quat.slerp(this.pointerRotation, this.pointerRotation, this.IDENTITY_QUAT, INTENSITY);
      if (this.snapTargetDirection) {
        const SNAPPING_INTENSITY = 0.2;
        const a = this.snapTargetDirection;
        const b = this.snapDirection;
        const sqrDist = vec3.squaredDistance(a, b);
        const distanceFactor = Math.max(0.1, 1 - sqrDist * 10);
        angleFactor *= SNAPPING_INTENSITY * distanceFactor;
        this.quatFromVectors(a, b, snapRotation, angleFactor);
      }
    }

    const combinedQuat = quat.multiply(quat.create(), snapRotation, this.pointerRotation);
    this.orientation = quat.multiply(quat.create(), combinedQuat, this.orientation);

    // AUTO-ROTATION Y — ajout par rapport à l'original React Bits.
    // Tant que l'utilisateur n'a pas touché la sphère, elle tourne doucement
    // sur l'axe Y pour attirer l'œil.
    if (!this.hasInteracted) {
      const autoRotY = quat.setAxisAngle(
        quat.create(),
        [0, 1, 0],
        AUTO_ROTATION_Y_SPEED * timeScale
      );
      this.orientation = quat.multiply(quat.create(), autoRotY, this.orientation);
    }

    quat.normalize(this.orientation, this.orientation);

    const RA_INTENSITY = 0.8 * timeScale;
    quat.slerp(this._combinedQuat, this._combinedQuat, combinedQuat, RA_INTENSITY);
    quat.normalize(this._combinedQuat, this._combinedQuat);

    const rad = Math.acos(this._combinedQuat[3]) * 2.0;
    const s = Math.sin(rad / 2.0);
    let rv = 0;
    if (s > 0.000001) {
      rv = rad / (2 * Math.PI);
      this.rotationAxis[0] = this._combinedQuat[0] / s;
      this.rotationAxis[1] = this._combinedQuat[1] / s;
      this.rotationAxis[2] = this._combinedQuat[2] / s;
    }
    const RV_INTENSITY = 0.5 * timeScale;
    this._rotationVelocity += (rv - this._rotationVelocity) * RV_INTENSITY;
    this.rotationVelocity = this._rotationVelocity / timeScale;

    this.updateCallback(deltaTime);
  }

  private quatFromVectors(a: vec3, b: vec3, out: quat, angleFactor = 1) {
    const axis = vec3.cross(vec3.create(), a, b);
    vec3.normalize(axis, axis);
    const d = Math.max(-1, Math.min(1, vec3.dot(a, b)));
    const angle = Math.acos(d) * angleFactor;
    quat.setAxisAngle(out, axis, angle);
  }

  /** Projection arcball : du plan écran vers la sphère virtuelle. */
  private project(pos: vec2): vec3 {
    const r = 2;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    const s = Math.max(w, h) - 1;
    const x = (2 * pos[0] - w - 1) / s;
    const y = (2 * pos[1] - h - 1) / s;
    let z = 0;
    const xySq = x * x + y * y;
    const rSq = r * r;
    if (xySq <= rSq / 2.0) {
      z = Math.sqrt(rSq - xySq);
    } else {
      z = rSq / Math.sqrt(xySq);
    }
    return vec3.fromValues(-x, y, z);
  }
}
