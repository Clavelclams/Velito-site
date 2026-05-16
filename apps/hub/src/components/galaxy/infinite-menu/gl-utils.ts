/**
 * Helpers WebGL bas niveau utilisés par InfiniteMenu.
 *
 * Pourquoi des helpers maison plutôt qu'une lib (Three.js, ogl, etc.) ?
 *   - InfiniteMenu utilise WebGL 2 directement pour le custom instancing.
 *   - Three.js est trop lourd (~600 KB) pour ce seul composant.
 *   - ogl ne supporte pas tout ce qu'on fait ici (Vertex Array Objects partagés
 *     entre attributs + instance matrices).
 *   - Garder ces helpers en main aide à comprendre ce qui se passe vraiment.
 *
 * Référence : pattern issu de webgl2fundamentals.org (la bible WebGL 2).
 */

/** Compile un shader (vertex ou fragment) et log l'erreur si ça casse. */
export function createShader(
  gl: WebGL2RenderingContext,
  type: GLenum,
  source: string
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (success) return shader;
  console.error(gl.getShaderInfoLog(shader));
  gl.deleteShader(shader);
  return null;
}

/** Crée un program (vertex + fragment shaders liés). */
export function createProgram(
  gl: WebGL2RenderingContext,
  shaderSources: [string, string],
  transformFeedbackVaryings: string[] | null,
  attribLocations: Record<string, number> | null
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;
  [gl.VERTEX_SHADER, gl.FRAGMENT_SHADER].forEach((type, ndx) => {
    // Le tuple [string, string] est typé string|undefined sur accès indexé
    // (noUncheckedIndexedAccess). Sûr ici : on itère sur exactement 2 éléments.
    const shader = createShader(gl, type, shaderSources[ndx]!);
    if (shader) gl.attachShader(program, shader);
  });
  if (transformFeedbackVaryings) {
    gl.transformFeedbackVaryings(program, transformFeedbackVaryings, gl.SEPARATE_ATTRIBS);
  }
  if (attribLocations) {
    for (const attrib in attribLocations) {
      gl.bindAttribLocation(program, attribLocations[attrib]!, attrib);
    }
  }
  gl.linkProgram(program);
  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (success) return program;
  console.error(gl.getProgramInfoLog(program));
  gl.deleteProgram(program);
  return null;
}

/** Crée un VAO (Vertex Array Object) qui groupe plusieurs buffers + indices. */
export function makeVertexArray(
  gl: WebGL2RenderingContext,
  bufLocNumElmPairs: [WebGLBuffer, number, number][],
  indices?: Uint16Array | number[]
): WebGLVertexArrayObject | null {
  const va = gl.createVertexArray();
  if (!va) return null;
  gl.bindVertexArray(va);
  for (const [buffer, loc, numElem] of bufLocNumElmPairs) {
    if (loc === -1) continue;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, numElem, gl.FLOAT, false, 0, 0);
  }
  if (indices) {
    const indexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(
      gl.ELEMENT_ARRAY_BUFFER,
      indices instanceof Uint16Array ? indices : new Uint16Array(indices),
      gl.STATIC_DRAW
    );
  }
  gl.bindVertexArray(null);
  return va;
}

/**
 * Resize le canvas si sa taille DOM a changé.
 * dpr = device pixel ratio (rétina = 2). Cap à 2 pour éviter de tuer les GPUs.
 */
export function resizeCanvasToDisplaySize(canvas: HTMLCanvasElement): boolean {
  const dpr = Math.min(2, window.devicePixelRatio);
  const displayWidth = Math.round(canvas.clientWidth * dpr);
  const displayHeight = Math.round(canvas.clientHeight * dpr);
  const needResize =
    canvas.width !== displayWidth || canvas.height !== displayHeight;
  if (needResize) {
    canvas.width = displayWidth;
    canvas.height = displayHeight;
  }
  return needResize;
}

/** Crée un buffer GPU et upload les données dedans. */
export function makeBuffer(
  gl: WebGL2RenderingContext,
  sizeOrData: number | ArrayBufferView,
  usage: GLenum
): WebGLBuffer {
  const buf = gl.createBuffer()!;
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, sizeOrData as ArrayBufferView, usage);
  gl.bindBuffer(gl.ARRAY_BUFFER, null);
  return buf;
}

/** Crée une texture vide avec les paramètres de filtrage qu'on choisit. */
export function createAndSetupTexture(
  gl: WebGL2RenderingContext,
  minFilter: GLenum,
  magFilter: GLenum,
  wrapS: GLenum,
  wrapT: GLenum
): WebGLTexture {
  const texture = gl.createTexture()!;
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wrapS);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wrapT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, minFilter);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, magFilter);
  return texture;
}
