const vertexSource = `
  attribute vec2 a_uv;
  uniform vec2 u_viewport;
  uniform vec2 u_center;
  uniform vec2 u_size;
  uniform float u_angle;
  uniform float u_stroke;
  uniform vec2 u_spineSpan;
  uniform float u_waveStrength;
  uniform float u_bends[17];
  uniform float u_mirror;
  varying vec2 v_uv;
  float spineAngle(float distance) {
    float q = clamp(distance, 0.0, 1.0);
    float station = q * 16.0;
    int bone = int(min(floor(station), 15.0));
    float history = mix(u_bends[bone], u_bends[bone + 1], station - float(bone));
    return history
         + u_waveStrength * smoothstep(0.12, 1.0, q) * sin(u_stroke - 4.6 * q);
  }
  void main() {
    v_uv = a_uv;
    // A neutral drawing follows a travelling spine wave. Integrating unit
    // tangents keeps its length; placing each cross-section on the unit normal
    // keeps its width instead of stretching a permanently bent illustration.
    float head = u_spineSpan.x, tail = u_spineSpan.y;
    float distance = (head - a_uv.y) / (head - tail);
    float length = (head - tail) * u_size.y;
    vec2 spine = vec2(0.0, (head - 0.5) * u_size.y);
    for (int i = 0; i < 16; i++) {
      float q = distance * (float(i) + 0.5) / 16.0;
      float bend = spineAngle(q);
      spine += length * distance / 16.0 * vec2(sin(bend), -cos(bend));
    }
    float bend = spineAngle(distance);
    vec2 normal = vec2(cos(bend), sin(bend));
    vec2 tangent = vec2(sin(bend), -cos(bend));
    float radius = (a_uv.x - 0.5) * u_size.x;
    float fin = smoothstep(0.16, 0.34, abs(a_uv.x - 0.5))
              * smoothstep(0.52, 0.62, a_uv.y)
              * (1.0 - smoothstep(0.78, 0.83, a_uv.y));
    radius += sign(radius) * sin(u_stroke * 2.0 - 0.65) * fin * u_size.x * 0.012;
    vec2 p = spine + normal * radius
           + tangent * cos(u_stroke * 2.0 - 0.65) * fin * u_size.y * 0.003;
    p.x *= u_mirror;
    float c = cos(u_angle), s = sin(u_angle);
    p = mat2(c, s, -s, c) * p + u_center;
    gl_Position = vec4(p.x / u_viewport.x * 2.0 - 1.0,
                       1.0 - p.y / u_viewport.y * 2.0, 0.0, 1.0);
  }
`
const fragmentSource = `
  precision mediump float;
  uniform sampler2D u_image;
  uniform float u_opacity;
  varying vec2 v_uv;
  void main() { gl_FragColor = texture2D(u_image, v_uv) * u_opacity; }
`

// One transparent GPU layer carries a full-body wave through both fish.
export function createFishSwimmer(layer, images) {
  const canvas = document.createElement('canvas')
  canvas.className = 'about-fish-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false })
  if (!gl) return null
  const shaders = [], buffers = [], textures = []
  const straightBends = new Float32Array(17)
  let program
  let disposed = false
  let visible = false
  let poses = []
  let width = 0
  let height = 0
  let painted = false

  function destroy() {
    if (disposed) return
    disposed = true
    canvas.removeEventListener('webglcontextlost', onContextLost)
    layer.classList.remove('has-fish-canvas')
    canvas.remove()
    textures.forEach(texture => gl.deleteTexture(texture))
    buffers.forEach(buffer => gl.deleteBuffer(buffer))
    shaders.forEach(shader => gl.deleteShader(shader))
    if (program) gl.deleteProgram(program)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
  function onContextLost(event) { event.preventDefault(); destroy() }
  canvas.addEventListener('webglcontextlost', onContextLost)

  try {
    function compile(type, source) {
      const shader = gl.createShader(type)
      shaders.push(shader)
      gl.shaderSource(shader, source)
      gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Fish shader could not compile')
      return shader
    }
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Fish shader could not link')
    gl.useProgram(program)
    const columns = 24, rows = 64, vertices = [], indices = []
    for (let y = 0; y <= rows; y++) for (let x = 0; x <= columns; x++) vertices.push(x / columns, y / rows)
    for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
      const i = y * (columns + 1) + x
      indices.push(i, i + 1, i + columns + 1, i + 1, i + columns + 2, i + columns + 1)
    }
    const vertexBuffer = gl.createBuffer(), indexBuffer = gl.createBuffer()
    buffers.push(vertexBuffer, indexBuffer)
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer)
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW)
    const uv = gl.getAttribLocation(program, 'a_uv')
    gl.enableVertexAttribArray(uv)
    gl.vertexAttribPointer(uv, 2, gl.FLOAT, false, 0, 0)
    const uniforms = Object.fromEntries(['viewport', 'center', 'size', 'angle', 'stroke', 'spineSpan', 'waveStrength', 'mirror', 'opacity', 'image'].map(key => [key, gl.getUniformLocation(program, `u_${key}`)]))
    uniforms.bends = gl.getUniformLocation(program, 'u_bends[0]')
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true)
    images.forEach(image => {
      const texture = gl.createTexture()
      textures.push(texture)
      gl.bindTexture(gl.TEXTURE_2D, texture)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image)
    })
    gl.disable(gl.DEPTH_TEST)
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
    layer.prepend(canvas)

    function clear() {
      if (!painted) return
      gl.clear(gl.COLOR_BUFFER_BIT)
      painted = false
    }
    function draw() {
      if (disposed || !width || !height) return
      clear()
      gl.uniform2f(uniforms.viewport, width, height)
      gl.uniform1i(uniforms.image, 0)
      poses.forEach((pose, index) => {
        if (pose.opacity < .002) return
        gl.bindTexture(gl.TEXTURE_2D, textures[index])
        gl.uniform2f(uniforms.center, pose.x, pose.y)
        gl.uniform2f(uniforms.size, pose.width, pose.height)
        gl.uniform1f(uniforms.angle, pose.angle * Math.PI / 180)
        gl.uniform1f(uniforms.stroke, pose.stroke)
        gl.uniform2f(uniforms.spineSpan, index ? .85 : .865, index ? .117 : .087)
        gl.uniform1f(uniforms.waveStrength, pose.waveStrength ?? .42)
        gl.uniform1fv(uniforms.bends, pose.bends || straightBends)
        gl.uniform1f(uniforms.mirror, index ? -1 : 1)
        gl.uniform1f(uniforms.opacity, pose.opacity)
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)
        painted = true
      })
      layer.classList.add('has-fish-canvas')
    }
    return {
      resize(w, h) {
        if (disposed) return
        width = w; height = h
        const ratio = Math.min(devicePixelRatio || 1, 1.75)
        canvas.width = Math.round(w * ratio)
        canvas.height = Math.round(h * ratio)
        gl.viewport(0, 0, canvas.width, canvas.height)
        if (visible) draw()
      },
      update(next) { if (!disposed) { poses = next; if (visible) draw() } },
      setVisible(value) {
        if (disposed || visible === value) return
        visible = value
        if (visible) draw()
        else clear()
      },
      destroy,
    }
  } catch {
    destroy()
    return null
  }
}
