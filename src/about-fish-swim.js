const vertexSource = `
  attribute vec2 a_uv;
  uniform vec2 u_viewport;
  uniform vec2 u_center;
  uniform vec2 u_size;
  uniform float u_angle;
  uniform float u_time;
  uniform float u_phase;
  uniform float u_speed;
  varying vec2 v_uv;
  void main() {
    v_uv = a_uv;
    vec2 p = (a_uv - 0.5) * u_size;
    // Both sprites point down: top UVs are the tail, bottom UVs are the head.
    float tail = 1.0 - a_uv.y;
    float envelope = pow(smoothstep(0.13, 1.0, tail), 1.7);
    float stroke = tail * 6.1 - u_time * u_speed + u_phase;
    p.x += sin(stroke) * envelope * u_size.x * 0.09;
    float fin = pow(abs(a_uv.x - 0.5) * 2.0, 1.8);
    p.y += sin(stroke + 0.7) * fin * u_size.y * 0.005;
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

// One transparent GPU layer deforms both original illustrations continuously.
export function createFishSwimmer(layer, images) {
  const canvas = document.createElement('canvas')
  canvas.className = 'about-fish-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false })
  if (!gl) return null
  const shaders = [], buffers = [], textures = []
  let program
  let disposed = false
  let frame = 0
  let lastTime = 0
  let elapsed = 0
  let visible = false
  let poses = []
  let width = 0
  let height = 0

  function destroy() {
    if (disposed) return
    disposed = true
    cancelAnimationFrame(frame)
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
    const columns = 16, rows = 64, vertices = [], indices = []
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
    const uniforms = Object.fromEntries(['viewport', 'center', 'size', 'angle', 'time', 'phase', 'speed', 'opacity', 'image'].map(key => [key, gl.getUniformLocation(program, `u_${key}`)]))
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

    function clear() { gl.clear(gl.COLOR_BUFFER_BIT) }
    function draw() {
      if (disposed || !width || !height) return
      clear()
      gl.uniform2f(uniforms.viewport, width, height)
      gl.uniform1f(uniforms.time, elapsed)
      gl.uniform1i(uniforms.image, 0)
      poses.forEach((pose, index) => {
        if (pose.opacity < .002) return
        gl.bindTexture(gl.TEXTURE_2D, textures[index])
        gl.uniform2f(uniforms.center, pose.x, pose.y)
        gl.uniform2f(uniforms.size, pose.width, pose.height)
        gl.uniform1f(uniforms.angle, pose.angle * Math.PI / 180)
        gl.uniform1f(uniforms.phase, index * 2.1)
        gl.uniform1f(uniforms.speed, index ? 2.1 : 2.45)
        gl.uniform1f(uniforms.opacity, pose.opacity)
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0)
      })
      layer.classList.add('has-fish-canvas')
    }
    function tick(now) {
      frame = 0
      if (disposed) return
      if (lastTime) elapsed += Math.min(.06, (now - lastTime) / 1000)
      lastTime = now
      draw()
      frame = requestAnimationFrame(tick)
    }
    function sync() {
      if (disposed) return
      const running = visible && poses.some(pose => pose.opacity > .002)
      if (running && !frame) { lastTime = 0; frame = requestAnimationFrame(tick) }
      if (!running) { cancelAnimationFrame(frame); frame = 0; lastTime = 0; clear() }
    }
    return {
      resize(w, h) {
        if (disposed) return
        width = w; height = h
        const ratio = Math.min(devicePixelRatio || 1, 1.75)
        canvas.width = Math.round(w * ratio)
        canvas.height = Math.round(h * ratio)
        gl.viewport(0, 0, canvas.width, canvas.height)
        draw()
      },
      update(next) { if (!disposed) { poses = next; sync() } },
      setVisible(value) { visible = value; sync() },
      destroy,
    }
  } catch {
    destroy()
    return null
  }
}
