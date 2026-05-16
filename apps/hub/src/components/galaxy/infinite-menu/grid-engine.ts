/**
 * InfiniteGridMenu — classe principale qui orchestre la sphère 3D interactive.
 *
 * NOTE SUR LA TAILLE : ce fichier dépasse les 150 lignes max prévues par
 * instructions/04_CONVENTIONS_CODE.md. Exception assumée : init/animate/render/
 * camera/control sont entrelacés via l'état partagé this.* et les couper en
 * sous-fichiers crée des dépendances cycliques ou des classes "amies" qui
 * cassent l'encapsulation. Tout ce qui pouvait être extrait l'a été
 * (geometry, shaders, gl-utils, arcball-control).
 *
 * Responsabilités :
 *   1. Init WebGL 2 : context, program (shaders), VAOs, buffers, textures atlas
 *   2. Run loop : requestAnimationFrame qui appelle animate() puis render()
 *   3. animate() : met à jour les matrices d'instance selon la rotation arcball
 *   4. render() : un draw call par frame avec drawElementsInstanced
 *   5. Resize, snap (alignement sur l'item le plus proche), texture loading
 *
 * Modifications par rapport à React Bits :
 *   - Suppression de this.icoGeo.subdivide(1) — on garde les 12 sommets de l'icosaèdre
 *     de base, suffisant pour 5 modules (chaque module apparaît ~2-3 fois).
 *     La subdivision originale produisait 42 sommets → chaque module se répétait
 *     8 fois, ce qui aurait été visuellement confus pour un menu de 5 entrées.
 *   - Ajout d'un flag isPaused pour stopper la boucle quand le hero sort du viewport
 *     (IntersectionObserver dans GalaxyHero) → économie batterie + CPU.
 */

import { mat4, quat, vec2, vec3 } from "gl-matrix";
import { discVertexShader } from "./shaders/disc.vert";
import { discFragmentShader } from "./shaders/disc.frag";
import { IcosahedronGeometry, DiscGeometry } from "./geometry/icosahedron";
import {
  createProgram,
  makeVertexArray,
  resizeCanvasToDisplaySize,
  makeBuffer,
  createAndSetupTexture,
} from "./gl-utils";
import { ArcballControl } from "./arcball-control";

export interface MenuItem {
  image: string;
  link: string;
  title: string;
  description: string;
}

interface DiscLocations {
  aModelPosition: number;
  aModelUvs: number;
  aInstanceMatrix: number;
  uWorldMatrix: WebGLUniformLocation | null;
  uViewMatrix: WebGLUniformLocation | null;
  uProjectionMatrix: WebGLUniformLocation | null;
  uCameraPosition: WebGLUniformLocation | null;
  uScaleFactor: WebGLUniformLocation | null;
  uRotationAxisVelocity: WebGLUniformLocation | null;
  uTex: WebGLUniformLocation | null;
  uFrames: WebGLUniformLocation | null;
  uItemCount: WebGLUniformLocation | null;
  uAtlasSize: WebGLUniformLocation | null;
}

interface InstanceData {
  matricesArray: Float32Array;
  matrices: Float32Array[];
  buffer: WebGLBuffer;
}

export class InfiniteGridMenu {
  TARGET_FRAME_DURATION = 1000 / 60;
  SPHERE_RADIUS = 2;

  private time = 0;
  private deltaTime = 0;
  private deltaFrames = 0;
  private frames = 0;
  private isPaused = false;

  camera = {
    matrix: mat4.create(),
    near: 0.1,
    far: 40,
    fov: Math.PI / 4,
    aspect: 1,
    position: vec3.fromValues(0, 0, 3),
    up: vec3.fromValues(0, 1, 0),
    matrices: {
      view: mat4.create(),
      projection: mat4.create(),
      inversProjection: mat4.create(),
    },
  };

  smoothRotationVelocity = 0;
  scaleFactor = 1.0;
  movementActive = false;

  private canvas: HTMLCanvasElement;
  private items: MenuItem[];
  private onActiveItemChange: (idx: number) => void;
  private onMovementChange: (isMoving: boolean) => void;
  private onFirstInteraction?: () => void;

  private gl!: WebGL2RenderingContext;
  private viewportSize!: vec2;
  private drawBufferSize!: vec2;
  private discProgram!: WebGLProgram;
  private discLocations!: DiscLocations;
  private discGeo!: DiscGeometry;
  // DiscGeometry["data"] = type du getter "data" — objet structuré avec
  // vertices/indices/normals/uvs typés Float32Array et Uint16Array.
  private discBuffers!: DiscGeometry["data"];
  private discVAO!: WebGLVertexArrayObject;
  private icoGeo!: IcosahedronGeometry;
  private instancePositions!: vec3[];
  private DISC_INSTANCE_COUNT = 0;
  private discInstances!: InstanceData;
  private worldMatrix = mat4.create();
  private tex!: WebGLTexture;
  private atlasSize = 1;
  private control!: ArcballControl;

  constructor(
    canvas: HTMLCanvasElement,
    items: MenuItem[],
    onActiveItemChange: (idx: number) => void,
    onMovementChange: (isMoving: boolean) => void,
    onInit: ((engine: InfiniteGridMenu) => void) | null = null,
    scale = 1.0,
    onFirstInteraction?: () => void
  ) {
    this.canvas = canvas;
    this.items = items;
    this.onActiveItemChange = onActiveItemChange;
    this.onMovementChange = onMovementChange;
    this.onFirstInteraction = onFirstInteraction;
    this.scaleFactor = scale;
    this.camera.position[2] = 3 * scale;
    this.init(onInit);
  }

  /** Met en pause / reprend la boucle d'animation (utilisé par IntersectionObserver). */
  setPaused(paused: boolean): void {
    if (this.isPaused && !paused) {
      // Reprise : on relance la boucle avec le timestamp courant.
      this.isPaused = false;
      requestAnimationFrame((t) => this.run(t));
    } else {
      this.isPaused = paused;
    }
  }

  resize(): void {
    this.viewportSize = vec2.set(
      this.viewportSize || vec2.create(),
      this.canvas.clientWidth,
      this.canvas.clientHeight
    );
    const gl = this.gl;
    const needsResize = resizeCanvasToDisplaySize(gl.canvas as HTMLCanvasElement);
    if (needsResize) {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight);
    }
    this.updateProjectionMatrix();
  }

  run(time = 0): void {
    if (this.isPaused) return;
    this.deltaTime = Math.min(32, time - this.time);
    this.time = time;
    this.deltaFrames = this.deltaTime / this.TARGET_FRAME_DURATION;
    this.frames += this.deltaFrames;
    this.animate();
    this.render();
    requestAnimationFrame((t) => this.run(t));
  }

  private init(onInit: ((engine: InfiniteGridMenu) => void) | null): void {
    const gl = this.canvas.getContext("webgl2", { antialias: true, alpha: false });
    if (!gl) throw new Error("WebGL 2 non supporté par ce navigateur.");
    this.gl = gl;

    this.viewportSize = vec2.fromValues(this.canvas.clientWidth, this.canvas.clientHeight);
    this.drawBufferSize = vec2.clone(this.viewportSize);

    this.discProgram = createProgram(
      gl,
      [discVertexShader, discFragmentShader],
      null,
      { aModelPosition: 0, aModelNormal: 1, aModelUvs: 2, aInstanceMatrix: 3 }
    )!;
    this.discLocations = {
      aModelPosition: gl.getAttribLocation(this.discProgram, "aModelPosition"),
      aModelUvs: gl.getAttribLocation(this.discProgram, "aModelUvs"),
      aInstanceMatrix: gl.getAttribLocation(this.discProgram, "aInstanceMatrix"),
      uWorldMatrix: gl.getUniformLocation(this.discProgram, "uWorldMatrix"),
      uViewMatrix: gl.getUniformLocation(this.discProgram, "uViewMatrix"),
      uProjectionMatrix: gl.getUniformLocation(this.discProgram, "uProjectionMatrix"),
      uCameraPosition: gl.getUniformLocation(this.discProgram, "uCameraPosition"),
      uScaleFactor: gl.getUniformLocation(this.discProgram, "uScaleFactor"),
      uRotationAxisVelocity: gl.getUniformLocation(this.discProgram, "uRotationAxisVelocity"),
      uTex: gl.getUniformLocation(this.discProgram, "uTex"),
      uFrames: gl.getUniformLocation(this.discProgram, "uFrames"),
      uItemCount: gl.getUniformLocation(this.discProgram, "uItemCount"),
      uAtlasSize: gl.getUniformLocation(this.discProgram, "uAtlasSize"),
    };

    this.discGeo = new DiscGeometry(56, 1);
    this.discBuffers = this.discGeo.data;
    this.discVAO = makeVertexArray(
      gl,
      [
        [makeBuffer(gl, this.discBuffers.vertices, gl.STATIC_DRAW), this.discLocations.aModelPosition, 3],
        [makeBuffer(gl, this.discBuffers.uvs, gl.STATIC_DRAW), this.discLocations.aModelUvs, 2],
      ],
      this.discBuffers.indices
    )!;

    // Icosaèdre SANS subdivision — 12 sommets, suffisants pour 5 modules.
    this.icoGeo = new IcosahedronGeometry();
    this.icoGeo.spherize(this.SPHERE_RADIUS);
    this.instancePositions = this.icoGeo.vertices.map((v) => v.position);
    this.DISC_INSTANCE_COUNT = this.icoGeo.vertices.length;

    this.initDiscInstances(this.DISC_INSTANCE_COUNT);
    this.initTexture();

    this.control = new ArcballControl(
      this.canvas,
      (dt) => this.onControlUpdate(dt),
      () => this.onFirstInteraction?.()
    );

    this.updateCameraMatrix();
    this.updateProjectionMatrix();
    this.resize();
    if (onInit) onInit(this);
  }

  private initTexture(): void {
    const gl = this.gl;
    this.tex = createAndSetupTexture(gl, gl.LINEAR, gl.LINEAR, gl.CLAMP_TO_EDGE, gl.CLAMP_TO_EDGE);
    const itemCount = Math.max(1, this.items.length);
    this.atlasSize = Math.ceil(Math.sqrt(itemCount));

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    const cellSize = 512;
    canvas.width = this.atlasSize * cellSize;
    canvas.height = this.atlasSize * cellSize;

    Promise.all(
      this.items.map(
        (item) =>
          new Promise<HTMLImageElement>((resolve) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.src = item.image;
          })
      )
    ).then((images) => {
      images.forEach((img, i) => {
        const x = (i % this.atlasSize) * cellSize;
        const y = Math.floor(i / this.atlasSize) * cellSize;
        ctx.drawImage(img, x, y, cellSize, cellSize);
      });
      gl.bindTexture(gl.TEXTURE_2D, this.tex);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
      gl.generateMipmap(gl.TEXTURE_2D);
    });
  }

  private initDiscInstances(count: number): void {
    const gl = this.gl;
    this.discInstances = {
      matricesArray: new Float32Array(count * 16),
      matrices: [],
      buffer: gl.createBuffer()!,
    };
    for (let i = 0; i < count; ++i) {
      const instanceMatrixArray = new Float32Array(this.discInstances.matricesArray.buffer, i * 16 * 4, 16);
      instanceMatrixArray.set(mat4.create());
      this.discInstances.matrices.push(instanceMatrixArray);
    }
    gl.bindVertexArray(this.discVAO);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferData(gl.ARRAY_BUFFER, this.discInstances.matricesArray.byteLength, gl.DYNAMIC_DRAW);
    const mat4AttribSlotCount = 4;
    const bytesPerMatrix = 16 * 4;
    for (let j = 0; j < mat4AttribSlotCount; ++j) {
      const loc = this.discLocations.aInstanceMatrix + j;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, 4, gl.FLOAT, false, bytesPerMatrix, j * 4 * 4);
      gl.vertexAttribDivisor(loc, 1);
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    gl.bindVertexArray(null);
  }

  private animate(): void {
    const gl = this.gl;
    this.control.update(this.deltaTime, this.TARGET_FRAME_DURATION);
    const positions = this.instancePositions.map((p) =>
      vec3.transformQuat(vec3.create(), p, this.control.orientation)
    );
    const scale = 0.25;
    const SCALE_INTENSITY = 0.6;
    positions.forEach((p, ndx) => {
      const s = (Math.abs(p[2]) / this.SPHERE_RADIUS) * SCALE_INTENSITY + (1 - SCALE_INTENSITY);
      const finalScale = s * scale;
      const matrix = mat4.create();
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), vec3.negate(vec3.create(), p)));
      mat4.multiply(matrix, matrix, mat4.targetTo(mat4.create(), [0, 0, 0], p, [0, 1, 0]));
      mat4.multiply(matrix, matrix, mat4.fromScaling(mat4.create(), [finalScale, finalScale, finalScale]));
      mat4.multiply(matrix, matrix, mat4.fromTranslation(mat4.create(), [0, 0, -this.SPHERE_RADIUS]));
      mat4.copy(this.discInstances.matrices[ndx]!, matrix);
    });
    gl.bindBuffer(gl.ARRAY_BUFFER, this.discInstances.buffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, this.discInstances.matricesArray);
    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    this.smoothRotationVelocity = this.control.rotationVelocity;
  }

  private render(): void {
    const gl = this.gl;
    gl.useProgram(this.discProgram);
    gl.enable(gl.CULL_FACE);
    gl.enable(gl.DEPTH_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(this.discLocations.uWorldMatrix, false, this.worldMatrix);
    gl.uniformMatrix4fv(this.discLocations.uViewMatrix, false, this.camera.matrices.view);
    gl.uniformMatrix4fv(this.discLocations.uProjectionMatrix, false, this.camera.matrices.projection);
    gl.uniform3f(this.discLocations.uCameraPosition, this.camera.position[0], this.camera.position[1], this.camera.position[2]);
    gl.uniform4f(
      this.discLocations.uRotationAxisVelocity,
      this.control.rotationAxis[0],
      this.control.rotationAxis[1],
      this.control.rotationAxis[2],
      this.smoothRotationVelocity * 1.1
    );
    gl.uniform1i(this.discLocations.uItemCount, this.items.length);
    gl.uniform1i(this.discLocations.uAtlasSize, this.atlasSize);
    gl.uniform1f(this.discLocations.uFrames, this.frames);
    gl.uniform1f(this.discLocations.uScaleFactor, this.scaleFactor);
    gl.uniform1i(this.discLocations.uTex, 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.bindVertexArray(this.discVAO);
    gl.drawElementsInstanced(
      gl.TRIANGLES,
      this.discBuffers.indices.length,
      gl.UNSIGNED_SHORT,
      0,
      this.DISC_INSTANCE_COUNT
    );
  }

  private updateCameraMatrix(): void {
    mat4.targetTo(this.camera.matrix, this.camera.position, [0, 0, 0], this.camera.up);
    mat4.invert(this.camera.matrices.view, this.camera.matrix);
  }

  private updateProjectionMatrix(): void {
    const gl = this.gl;
    this.camera.aspect = (gl.canvas as HTMLCanvasElement).clientWidth / (gl.canvas as HTMLCanvasElement).clientHeight;
    const height = this.SPHERE_RADIUS * 0.35;
    const distance = this.camera.position[2];
    if (this.camera.aspect > 1) {
      this.camera.fov = 2 * Math.atan(height / distance);
    } else {
      this.camera.fov = 2 * Math.atan(height / this.camera.aspect / distance);
    }
    mat4.perspective(this.camera.matrices.projection, this.camera.fov, this.camera.aspect, this.camera.near, this.camera.far);
    mat4.invert(this.camera.matrices.inversProjection, this.camera.matrices.projection);
  }

  private onControlUpdate(deltaTime: number): void {
    const timeScale = deltaTime / this.TARGET_FRAME_DURATION + 0.0001;
    let damping = 5 / timeScale;
    let cameraTargetZ = 3 * this.scaleFactor;
    const isMoving = this.control.isPointerDown || Math.abs(this.smoothRotationVelocity) > 0.01;
    if (isMoving !== this.movementActive) {
      this.movementActive = isMoving;
      this.onMovementChange(isMoving);
    }
    if (!this.control.isPointerDown) {
      const nearestVertexIndex = this.findNearestVertexIndex();
      const itemIndex = nearestVertexIndex % Math.max(1, this.items.length);
      this.onActiveItemChange(itemIndex);
      const snapDirection = vec3.normalize(vec3.create(), this.getVertexWorldPosition(nearestVertexIndex));
      this.control.snapTargetDirection = snapDirection;
    } else {
      cameraTargetZ += this.control.rotationVelocity * 80 + 2.5;
      damping = 7 / timeScale;
    }
    this.camera.position[2] += (cameraTargetZ - this.camera.position[2]) / damping;
    this.updateCameraMatrix();
  }

  private findNearestVertexIndex(): number {
    const n = this.control.snapDirection;
    const inversOrientation = quat.conjugate(quat.create(), this.control.orientation);
    const nt = vec3.transformQuat(vec3.create(), n, inversOrientation);
    let maxD = -1;
    let nearestVertexIndex = 0;
    for (let i = 0; i < this.instancePositions.length; ++i) {
      const d = vec3.dot(nt, this.instancePositions[i]!);
      if (d > maxD) {
        maxD = d;
        nearestVertexIndex = i;
      }
    }
    return nearestVertexIndex;
  }

  private getVertexWorldPosition(index: number): vec3 {
    const nearestVertexPos = this.instancePositions[index]!;
    return vec3.transformQuat(vec3.create(), nearestVertexPos, this.control.orientation);
  }

  /** Nettoyage : retire les listeners du ArcballControl. */
  dispose(): void {
    this.isPaused = true;
    this.control?.dispose();
  }
}
