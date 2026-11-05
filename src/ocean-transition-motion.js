import './ocean-transition-motion.css'

const VERTEX = `attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`
const FRAGMENT = `
precision highp float;
uniform sampler2D painting;
uniform vec2 resolution;
uniform vec4 imageUV;
uniform float elapsed, amplitude;
void main() {
  vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1.0 - gl_FragCoord.y / resolution.y);
  vec2 uv = imageUV.zw + screen * imageUV.xy;
  vec2 p = uv * vec2(2011.0, 782.0);
  // Follow the painted S, leaving the surface seam and D attachment still.
  float center = 180.0 + 165.0 * smoothstep(65.0, 160.0, p.y)
    + 220.0 * smoothstep(160.0, 310.0, p.y)
    - 99.0 * smoothstep(335.0, 465.0, p.y)
    + 137.0 * smoothstep(485.0, 604.0, p.y);
  float region = 1.0 - smoothstep(62.0, 155.0, abs(p.x - center));
  float freeStem = smoothstep(105.0, 220.0, p.y)
    * (1.0 - smoothstep(480.0, 590.0, p.y));
  float wave = sin(elapsed * 0.72 - p.y * 0.008) * 0.86
    + sin(elapsed * 0.43 + p.y * 0.013) * 0.14;
  float motion = region * freeStem * smoothstep(0.0, 1.8, elapsed);
  vec2 shift = vec2(wave, sin(elapsed * 0.61 - p.y * 0.01) * 0.11)
    * amplitude * motion;
  gl_FragColor = texture2D(painting, clamp(uv - shift / vec2(2011.0, 782.0), 0.0, 1.0));
}`

/** Locally bend the supplied current; its unmodified image remains the fallback. */
export function initOceanTransitionMotion(root = document.querySelector('.ocean-transition')) {
  const source = root?.querySelector('.ocean-transition__texture')
  if (!source) return () => {}
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const menu = document.querySelector('#portfolio-menu')
  const canvas = document.createElement('canvas')
  canvas.className = 'ocean-transition__living-current'
  canvas.setAttribute('aria-hidden', 'true')
  source.after(canvas)
  let gl, program, buffer, texture
  let shaders = [], uniforms = {}, imageUV = [1, 1, 0, 0]
  let loaded = false, failed = false, lost = false, disposed = false, visible = false
  let raf = 0, lastTime = 0, lastDraw = 0, elapsed = 0, amplitude = 0

  function stop() {
    cancelAnimationFrame(raf)
    raf = lastTime = lastDraw = 0
    canvas.dataset.motionState = failed || lost ? 'fallback' : 'paused'
  }
  function release() {
    if (gl && !lost) {
      if (texture) gl.deleteTexture(texture)
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      shaders.forEach(shader => gl.deleteShader(shader))
    }
    texture = buffer = program = undefined
    shaders = []; uniforms = {}; loaded = false
  }
  function hide() {
    canvas.style.visibility = 'hidden'
    root.classList.remove('has-living-current')
    delete canvas.dataset.motionReady
  }
  function fallback() { failed = true; stop(); hide(); release() }
  function canAnimate() {
    return loaded && visible && !disposed && !failed && !lost && !reduced.matches
      && !document.hidden && !menu?.open && !document.body.classList.contains('has-menu-open')
      && !root.closest('[inert]') && source.clientWidth > 0 && source.clientHeight > 0
  }
  function tick(time) {
    raf = 0
    if (!canAnimate()) return stop()
    if (lastTime) elapsed += Math.min((time - lastTime) / 1000, 0.05)
    lastTime = time
    try {
      if (!lastDraw || time - lastDraw >= 1000 / 30 - 0.5) {
        gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
        gl.uniform4fv(uniforms.imageUV, imageUV)
        gl.uniform1f(uniforms.elapsed, elapsed)
        gl.uniform1f(uniforms.amplitude, amplitude)
        gl.drawArrays(gl.TRIANGLES, 0, 6)
        if (!gl.isContextLost()) {
          canvas.style.visibility = 'visible'
          root.classList.add('has-living-current')
          canvas.dataset.motionReady = 'true'
        }
        lastDraw = time
      }
      raf = requestAnimationFrame(tick)
    } catch { fallback() }
  }
  function sync() {
    if (disposed) return
    if (reduced.matches) hide()
    if (!canAnimate()) return stop()
    canvas.dataset.motionState = 'running'
    if (!raf) raf = requestAnimationFrame(tick)
  }
  function resize() {
    if (disposed) return
    const width = source.clientWidth, height = source.clientHeight
    if (width && height && source.naturalWidth) {
      const style = getComputedStyle(source)
      const fit = style.objectFit
      const scale = fit === 'cover' ? Math.max(width / source.naturalWidth, height / source.naturalHeight)
        : Math.min(width / source.naturalWidth, height / source.naturalHeight)
      const drawn = fit === 'fill' ? [width, height] : [source.naturalWidth * scale, source.naturalHeight * scale]
      const position = style.objectPosition.split(/\s+/)
      const offset = (value, space) => value?.endsWith('%') ? space * parseFloat(value) / 100
        : value === 'right' || value === 'bottom' ? space : value === 'center' ? space / 2 : parseFloat(value) || 0
      imageUV = [width / drawn[0], height / drawn[1],
        -offset(position[0], width - drawn[0]) / drawn[0],
        -offset(position[1], height - drawn[1]) / drawn[1]]
      amplitude = Math.min(10, Math.max(3, width * 0.007)) * 2011 / drawn[0]
      const ratio = Math.min(devicePixelRatio || 1, 1.5)
      const nextWidth = Math.max(1, Math.round(width * ratio)), nextHeight = Math.max(1, Math.round(height * ratio))
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        hide(); canvas.width = nextWidth; canvas.height = nextHeight; lastDraw = 0
      }
      if (gl && !lost && !failed) gl.viewport(0, 0, canvas.width, canvas.height)
    }
    sync()
  }
  function initialize() {
    if (disposed || loaded || lost || failed || reduced.matches || !source.complete || !source.naturalWidth) return
    try {
      gl ||= canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false,
        premultipliedAlpha: false, powerPreference: 'low-power' })
      if (!gl) return fallback()
      program = gl.createProgram()
      ;[[gl.VERTEX_SHADER, VERTEX], [gl.FRAGMENT_SHADER, FRAGMENT]].forEach(([type, code]) => {
        const shader = gl.createShader(type)
        shaders.push(shader); gl.shaderSource(shader, code); gl.compileShader(shader)
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Current shader unavailable')
        gl.attachShader(program, shader)
      })
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Current program unavailable')
      gl.useProgram(program)
      buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW)
      const position = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture)
      ;[gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER].forEach(key => gl.texParameteri(gl.TEXTURE_2D, key, gl.LINEAR))
      ;[gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T].forEach(key => gl.texParameteri(gl.TEXTURE_2D, key, gl.CLAMP_TO_EDGE))
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      ;['resolution', 'imageUV', 'elapsed', 'amplitude'].forEach(name => { uniforms[name] = gl.getUniformLocation(program, name) })
      gl.uniform1i(gl.getUniformLocation(program, 'painting'), 0)
      loaded = true; resize()
    } catch { fallback() }
  }
  function preferenceChanged() { initialize(); sync() }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); lost = true; stop(); hide(); release()
  }, { signal })
  canvas.addEventListener('webglcontextrestored', () => { lost = failed = false; initialize() }, { signal })
  source.addEventListener('load', initialize, { signal })
  source.addEventListener('error', fallback, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  reduced.addEventListener('change', preferenceChanged)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(source)
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting); sync()
  }, { threshold: [0, 0.001] })
  intersection.observe(root)
  const mutation = new MutationObserver(sync)
  mutation.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  mutation.observe(root.closest('.hero') || root, { attributes: true, attributeFilter: ['inert'] })
  if (menu) mutation.observe(menu, { attributes: true, attributeFilter: ['open'] })
  const bounds = root.getBoundingClientRect()
  visible = bounds.bottom > 0 && bounds.top < innerHeight
  initialize(); resize()
  return () => {
    disposed = true; stop(); controller.abort(); reduced.removeEventListener('change', preferenceChanged)
    resizeObserver.disconnect(); intersection.disconnect(); mutation.disconnect(); hide(); release(); canvas.remove()
  }
}
