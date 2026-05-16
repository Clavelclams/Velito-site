/**
 * GalaxyRenderer — wrapper qui encapsule toute la logique ogl (WebGL) du Galaxy.
 *
 * Pourquoi une classe séparée du composant React ?
 *   - Pour respecter la règle "max 150 lignes par composant" (instructions/04).
 *   - Pour isoler la logique WebGL de la logique React (hooks, lifecycle).
 *   - Pour pouvoir tester unitairement plus tard (la classe ne dépend pas de React).
 *
 * Cycle de vie attendu :
 *   1. constructor(container, options) — crée le renderer, attache le canvas
 *   2. update(time) — appelé chaque frame depuis le requestAnimationFrame du composant
 *   3. setMouse(x, y, active) — appelé sur événement mousemove
 *   4. resize() — appelé au resize de la fenêtre
 *   5. destroy() — appelé au démontage du composant
 *
 * Référence : pattern "WebGL controller" classique. ogl gère le WebGLContext et
 * la compilation des shaders, on encapsule juste l'orchestration.
 */

import { Renderer, Program, Mesh, Color, Triangle } from "ogl";
import { galaxyVertexShader } from "./shaders/galaxy.vert";
import { galaxyFragmentShader } from "./shaders/galaxy.frag";

/** Options exposées par le composant Galaxy.tsx (subset des props React). */
export interface GalaxyRendererOptions {
  focal: [number, number];
  rotation: [number, number];
  starSpeed: number;
  density: number;
  hueShift: number;
  speed: number;
  glowIntensity: number;
  saturation: number;
  mouseRepulsion: boolean;
  twinkleIntensity: number;
  rotationSpeed: number;
  repulsionStrength: number;
  autoCenterRepulsion: number;
  transparent: boolean;
}

export class GalaxyRenderer {
  private container: HTMLElement;
  private renderer: Renderer;
  private program: Program;
  private mesh: Mesh;
  private options: GalaxyRendererOptions;

  constructor(container: HTMLElement, options: GalaxyRendererOptions) {
    this.container = container;
    this.options = options;

    // 1. Création du renderer ogl. alpha:true permet la transparence (pour superposer
    //    sur le fond CSS #04040e du hub). premultipliedAlpha:false pour éviter les
    //    artefacts sur les pixels sombres.
    this.renderer = new Renderer({
      alpha: options.transparent,
      premultipliedAlpha: false,
    });
    const gl = this.renderer.gl;

    // 2. Configuration du blending. Si transparent : on mélange avec le fond.
    if (options.transparent) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.clearColor(0, 0, 0, 0);
    } else {
      gl.clearColor(0, 0, 0, 1);
    }

    // 3. Géométrie : un triangle fullscreen (pattern ogl standard).
    const geometry = new Triangle(gl);

    // 4. Program = shader compilé + uniforms.
    this.program = new Program(gl, {
      vertex: galaxyVertexShader,
      fragment: galaxyFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(
            gl.canvas.width,
            gl.canvas.height,
            gl.canvas.width / gl.canvas.height
          ),
        },
        uFocal: { value: new Float32Array(options.focal) },
        uRotation: { value: new Float32Array(options.rotation) },
        uStarSpeed: { value: options.starSpeed },
        uDensity: { value: options.density },
        uHueShift: { value: options.hueShift },
        uSpeed: { value: options.speed },
        uMouse: { value: new Float32Array([0.5, 0.5]) },
        uGlowIntensity: { value: options.glowIntensity },
        uSaturation: { value: options.saturation },
        uMouseRepulsion: { value: options.mouseRepulsion },
        uTwinkleIntensity: { value: options.twinkleIntensity },
        uRotationSpeed: { value: options.rotationSpeed },
        uRepulsionStrength: { value: options.repulsionStrength },
        uMouseActiveFactor: { value: 0.0 },
        uAutoCenterRepulsion: { value: options.autoCenterRepulsion },
        uTransparent: { value: options.transparent },
      },
    });

    this.mesh = new Mesh(gl, { geometry, program: this.program });

    // 5. Attache le canvas dans le DOM et dimensionne.
    this.container.appendChild(gl.canvas);
    this.resize();
  }

  /** Met à jour le temps et déclenche le rendu d'une frame. */
  update(timeMs: number, disableAnimation: boolean): void {
    if (!disableAnimation) {
      // Conversion ms → secondes pour le shader.
      // Les non-null assertions (!) sont safe : ces uniforms sont définis dans
      // le constructor juste au-dessus. Le type ogl.d.ts utilise un index
      // signature, donc TS ne peut pas le prouver à la compilation.
      this.program.uniforms.uTime!.value = timeMs * 0.001;
      this.program.uniforms.uStarSpeed!.value =
        (timeMs * 0.001 * this.options.starSpeed) / 10.0;
    }
    this.renderer.render({ scene: this.mesh });
  }

  /** Met à jour les uniforms souris (lerp fait côté React). */
  setMouse(x: number, y: number, activeFactor: number): void {
    this.program.uniforms.uMouse!.value[0] = x;
    this.program.uniforms.uMouse!.value[1] = y;
    this.program.uniforms.uMouseActiveFactor!.value = activeFactor;
  }

  /** Recalcule la taille du canvas + uniform uResolution. */
  resize(): void {
    const w = this.container.offsetWidth;
    const h = this.container.offsetHeight;
    this.renderer.setSize(w, h);
    const gl = this.renderer.gl;
    this.program.uniforms.uResolution!.value = new Color(
      gl.canvas.width,
      gl.canvas.height,
      gl.canvas.width / gl.canvas.height
    );
  }

  /** Nettoyage : détache le canvas et libère le contexte WebGL. */
  destroy(): void {
    const gl = this.renderer.gl;
    if (gl.canvas.parentElement === this.container) {
      this.container.removeChild(gl.canvas);
    }
    // Force la libération du contexte WebGL (limite de 16 contextes par onglet
    // sur Chrome — sans ça on peut faire crasher la page après plusieurs HMR).
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  }
}
