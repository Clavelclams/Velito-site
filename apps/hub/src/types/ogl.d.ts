/**
 * Déclarations TypeScript minimales pour la lib ogl.
 *
 * Pourquoi ce fichier existe :
 *   - ogl n'expose pas (à ce jour) de fichiers .d.ts dans son package npm.
 *   - Sans ça, TypeScript strict refuse les imports et bloque le build.
 *   - On déclare uniquement les exports qu'on utilise dans Galaxy — pas tout l'API.
 *
 * Si on étend l'usage d'ogl plus tard (ajout d'un autre canvas WebGL), il faudra
 * compléter ces déclarations. Au pire, on peut basculer sur @types/ogl si Anthony
 * d'ogl en publie un jour.
 *
 * Référence : https://github.com/oframe/ogl
 */

declare module "ogl" {
  // ============================================================
  // Renderer — wrapper autour de WebGLRenderingContext
  // ============================================================
  export class Renderer {
    constructor(options?: {
      canvas?: HTMLCanvasElement;
      width?: number;
      height?: number;
      dpr?: number;
      alpha?: boolean;
      depth?: boolean;
      stencil?: boolean;
      antialias?: boolean;
      premultipliedAlpha?: boolean;
      preserveDrawingBuffer?: boolean;
      powerPreference?: string;
      autoClear?: boolean;
      webgl?: number;
    });
    gl: WebGLRenderingContext & {
      canvas: HTMLCanvasElement;
      renderer: Renderer;
    };
    setSize(width: number, height: number): void;
    render(options: { scene: Mesh; camera?: unknown; target?: unknown }): void;
  }

  // ============================================================
  // Program — couple vertex+fragment shader compilé
  // ============================================================
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export class Program {
    constructor(
      gl: WebGLRenderingContext,
      options: {
        vertex: string;
        fragment: string;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        uniforms?: Record<string, { value: any }>;
        transparent?: boolean;
        cullFace?: GLenum | false | null;
        frontFace?: GLenum;
        depthTest?: boolean;
        depthWrite?: boolean;
        depthFunc?: GLenum;
      }
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    uniforms: Record<string, { value: any }>;
  }

  // ============================================================
  // Geometry minimale — un seul triangle plein écran (pour Galaxy)
  // ============================================================
  export class Triangle {
    constructor(gl: WebGLRenderingContext);
  }

  // Geometry générique
  export class Geometry {
    constructor(
      gl: WebGLRenderingContext,
      attributes?: Record<string, unknown>
    );
  }

  // ============================================================
  // Mesh — assemblage geometry + program
  // ============================================================
  export class Mesh {
    constructor(
      gl: WebGLRenderingContext,
      options: { geometry: Triangle | Geometry; program: Program }
    );
  }

  // ============================================================
  // Camera (pour usage futur)
  // ============================================================
  export class Camera {
    constructor(gl: WebGLRenderingContext, options?: Record<string, unknown>);
  }

  // ============================================================
  // Color — vec3 (r, g, b) ou (x, y, z) selon l'usage
  // ============================================================
  export class Color {
    constructor(r?: number, g?: number, b?: number);
    r: number;
    g: number;
    b: number;
  }
}
