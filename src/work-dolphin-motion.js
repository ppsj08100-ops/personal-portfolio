const VERTEX = `
attribute vec2 a_uv;
uniform vec2 u_viewport, u_center, u_size, u_spineSpan;
uniform float u_time, u_angle, u_spineV, u_swimSpeed, u_waveStrength, u_tailStrength, u_depth, u_depthSlope, u_bodyTurn;
varying vec2 v_uv;
varying float v_depth;
varying vec2 v_pixel;
float spineAngle(float distance) {
  float q = clamp(distance, 0.0, 1.0);
  float body = smoothstep(.12, .9, q) * sin(u_time * u_swimSpeed - q * 2.5) * u_waveStrength;
  float tail = smoothstep(.55, 1.0, q) * sin(u_time * 2.1 - q * 4.2 - .35) * u_tailStrength;
  return (body + tail) * smoothstep(0.0, 1.2, u_time) + u_bodyTurn * smoothstep(.12, .95, q);
}
void main() {
  v_uv = a_uv;
  float head = u_spineSpan.x, tail = u_spineSpan.y;
  float distance = (head - a_uv.x) / (head - tail);
  float bodyLength = (head - tail) * u_size.x;
  vec2 spine = vec2((head - .5) * u_size.x, (u_spineV - .5) * u_size.y);
  // Unit tangents preserve spine length; unit normals preserve each section's
  // width. The rigid head leads one wave through the chest, back and tail.
  for (int i = 0; i < 24; i++) {
    float q = distance * (float(i) + .5) / 24.0;
    float theta = spineAngle(q);
    spine += bodyLength * distance / 24.0 * vec2(-cos(theta), sin(theta));
  }
  float theta = spineAngle(distance);
  vec2 p = spine + vec2(sin(theta), cos(theta)) * (a_uv.y - u_spineV) * u_size.y;
  p.x = -p.x;
  float c = cos(u_angle), s = sin(u_angle);
  p = mat2(c, s, -s, c) * p + u_center;
  v_depth = u_depth + (a_uv.x - .5) * u_depthSlope;
  v_pixel = p;
  gl_Position = vec4(p.x / u_viewport.x * 2.0 - 1.0, 1.0 - p.y / u_viewport.y * 2.0, 0.0, 1.0);
}`
const FRAGMENT = `
precision mediump float;
uniform sampler2D u_image;
uniform float u_opacity, u_pass;
varying vec2 v_uv;
varying float v_depth;
varying vec2 v_pixel;
void main() {
  float front = step(0.0, v_depth);
  if ((u_pass > 0.0 && front < .5) || (u_pass < 0.0 && front > .5)) discard;
  vec4 src = texture2D(u_image, v_uv);
  float coverage = smoothstep(.04, .35, src.a);
  if (coverage < .001) discard;
  vec3 color = src.rgb / max(.0001, src.a);
  float tint = mix(.72, 1.0, smoothstep(-1.0, 0.0, v_depth));
  float alpha = coverage * u_opacity;
  gl_FragColor = vec4(color * tint * alpha, alpha);
}`

/** One original transparent illustration follows a length-preserving spine. */
export function createWorkDolphinMotion(layer, image, getPose, frontLayer) {
  const canvas = document.createElement('canvas')
  canvas.className = 'work-dolphin__canvas'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.dataset.bodyMotion = 'spine'
  canvas.dataset.mesh = '48x16'
  canvas.dataset.geometry = 'profile-2d'
  const frontCanvas = document.createElement('canvas')
  frontCanvas.className = 'work-dolphin__front-canvas'
  frontCanvas.setAttribute('aria-hidden', 'true')
  const frontContext = frontCanvas.getContext('2d')
  if (!frontContext || !frontLayer) return null
  let gl
  try {
    gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true,
      depth: false, stencil: false, powerPreference: 'low-power' })
  } catch { return null }
  if (!gl) return null
  let program, texture, sizeObserver
  let uniforms = {}, indexCount = 0, width = 0, height = 0
  let disposed = false, lost = false, active = false, frame = 0, lastTime = 0, lastDraw = 0, elapsed = 0
  const shaders = [], buffers = []

  function destroy() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
    sizeObserver?.disconnect()
    canvas.removeEventListener('webglcontextlost', contextLost)
    layer.classList.remove('has-dolphin-canvas')
    canvas.remove()
    frontCanvas.remove()
    if (!lost) {
      if (texture) gl.deleteTexture(texture)
      buffers.forEach(buffer => gl.deleteBuffer(buffer))
      shaders.forEach(shader => gl.deleteShader(shader))
      if (program) gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
  }
  function contextLost(event) { event.preventDefault(); lost = true; destroy() }
  canvas.addEventListener('webglcontextlost', contextLost)

  function draw() {
    if (disposed || !width || !height) return
    const pose = getPose()
    gl.clear(gl.COLOR_BUFFER_BIT)
    if (!pose) { frontContext.clearRect(0, 0, frontCanvas.width, frontCanvas.height); return }
    gl.useProgram(program)
    gl.uniform2f(uniforms.viewport, width, height)
    gl.uniform2f(uniforms.center, pose.x, pose.y)
    gl.uniform2f(uniforms.size, pose.width, pose.height)
    gl.uniform2f(uniforms.spineSpan, .92, .045)
    for (const [name, value] of Object.entries({ time: elapsed, angle: pose.angle ?? 0, spineV: .55,
      swimSpeed: 1.8, waveStrength: .20, tailStrength: .04, opacity: pose.opacity ?? 1,
      depth: pose.z ?? -1, depthSlope: pose.depthSlope ?? 0, bodyTurn: pose.bodyTurn ?? 0 })) {
      gl.uniform1f(uniforms[name], value)
    }
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.uniform1i(uniforms.image, 0)
    // One intact profile is split by a hard depth boundary, never crossfaded.
    gl.uniform1f(uniforms.pass, 1)
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0)
    frontContext.clearRect(0, 0, frontCanvas.width, frontCanvas.height)
    frontContext.drawImage(canvas, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform1f(uniforms.pass, -1)
    gl.drawElements(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0)
    if (!gl.isContextLost()) layer.classList.add('has-dolphin-canvas')
  }
  function resize(w = layer.clientWidth, h = layer.clientHeight) {
    if (disposed) return
    width = w; height = h
    const ratio = Math.min(devicePixelRatio || 1, 1.5)
    const nextWidth = Math.max(1, Math.round(width * ratio)), nextHeight = Math.max(1, Math.round(height * ratio))
    if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
      canvas.width = nextWidth; canvas.height = nextHeight
      frontCanvas.width = nextWidth; frontCanvas.height = nextHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    draw()
  }
  function tick(now) {
    frame = 0
    if (disposed || !active) return
    if (lastTime) elapsed += Math.min(.06, (now - lastTime) / 1000)
    lastTime = now
    if (!lastDraw || now - lastDraw >= 1000 / 30 - .5) { draw(); lastDraw = now }
    frame = requestAnimationFrame(tick)
  }

  try {
    function compile(type, source) {
      const shader = gl.createShader(type)
      shaders.push(shader)
      gl.shaderSource(shader, source); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Dolphin shader unavailable')
      return shader
    }
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, VERTEX))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, FRAGMENT))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Dolphin program unavailable')
    gl.useProgram(program)
    const columns = 48, rows = 16, vertices = [], indices = []
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) vertices.push(x / columns, y / rows)
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const i = y * (columns + 1) + x
      indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1)
    }
    indexCount = indices.length
    const verticesBuffer = gl.createBuffer(), indicesBuffer = gl.createBuffer()
    buffers.push(verticesBuffer, indicesBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indicesBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
    const uv = gl.getAttribLocation(program, 'a_uv')
    gl.enableVertexAttribArray(uv); gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0)
    uniforms = Object.fromEntries(['viewport', 'center', 'size', 'spineSpan', 'time', 'angle', 'spineV',
      'swimSpeed', 'waveStrength', 'tailStrength', 'opacity', 'image', 'depth', 'depthSlope', 'pass', 'bodyTurn']
      .map(name => [name, gl.getUniformLocation(program, `u_${name}`)]))
    const source = document.createElement('canvas')
    source.width = 2048; source.height = 1024
    const context = source.getContext('2d')
    if (!context) throw new Error('Dolphin texture unavailable')
    context.imageSmoothingQuality = 'high'; context.drawImage(image, 0, 0, source.width, source.height)
    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.generateMipmap(gl.TEXTURE_2D)
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
    layer.append(canvas)
    frontLayer.append(frontCanvas)
    sizeObserver = new ResizeObserver(() => resize())
    sizeObserver.observe(layer)
    resize()
    return {
      setArtwork(w, h) { resize(w, h) },
      setActive(value) {
        if (disposed || active === value) return
        active = value; lastTime = lastDraw = 0
        if (active) { draw(); frame = requestAnimationFrame(tick) }
        else { cancelAnimationFrame(frame); frame = 0 }
      },
      destroy,
    }
  } catch { destroy(); return null }
}
