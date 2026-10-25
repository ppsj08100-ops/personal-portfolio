import { createSilhouettes, createWaterMask } from './hero-motion-masks.js'

const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const FRAGMENT = `
precision highp float;
uniform sampler2D painting, cleanWater, silhouettes, oceanMask;
uniform vec2 resolution, crop, offset;
uniform float elapsed;

float oceanRipple(vec2 p, vec2 center, vec2 reach, float phase) {
  float age = fract(elapsed * 0.125 + phase);
  vec2 radii = reach * (0.42 + age * 0.75);
  vec2 q = (p - center) / radii;
  float edge = abs(length(q) - 1.0) * radii.y;
  float line = 1.0 - smoothstep(0.25, 1.0, edge);
  float life = smoothstep(0.0, 0.18, age) * (1.0 - smoothstep(0.6, 1.0, age));
  float broken = smoothstep(-0.1, 0.65, sin(p.x * 0.049 + phase * 11.0)
    + sin(p.x * 0.113 - age * 1.4) * 0.4);
  return line * life * broken;
}

float contactRipple(vec2 p, float phase) {
  float age = fract(elapsed * 0.27 + phase);
  vec2 radii = vec2(143.0 + age * 104.0, 3.4 + age * 12.0);
  vec2 q = (p - vec2(389.0, 671.5)) / radii;
  float edge = abs(length(q) - 1.0) * radii.y;
  float line = 1.0 - smoothstep(0.25, 0.95, edge);
  float life = smoothstep(0.0, 0.16, age) * (1.0 - smoothstep(0.55, 1.0, age));
  float broken = smoothstep(-0.25, 0.65,
    sin(p.x * 0.071 + phase * 9.0) + sin(p.x * 0.139 - age * 2.0) * 0.35);
  return line * life * broken;
}

float armContactRipple(vec2 p, float phase) {
  float age = fract(elapsed * 0.19 + phase);
  vec2 radii = vec2(135.0 + age * 125.0, 3.0 + age * 18.0);
  vec2 q = (p - vec2(1003.0, 687.0)) / radii;
  float edge = abs(length(q) - 1.0) * radii.y;
  float line = 1.0 - smoothstep(0.25, 1.1, edge);
  float life = smoothstep(0.0, 0.2, age) * (1.0 - smoothstep(0.6, 1.0, age));
  float broken = smoothstep(-0.2, 0.7,
    sin(p.x * 0.054 + phase * 8.0) + sin(p.x * 0.127 - age * 1.6) * 0.4);
  return line * life * broken;
}

void main() {
  // Both the screen and source coordinates start at the image's top left.
  vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1.0 - gl_FragCoord.y / resolution.y);
  vec2 uv = offset + screen * crop;
  vec2 p = uv * vec2(1672.0, 941.0);
  vec4 masks = texture2D(silhouettes, uv);

  // The water matte includes a still margin around every painted object.
  // Source samples stay inside clear water even at the widest wave phase.
  vec2 waterRegions = texture2D(oceanMask, uv).rg;
  float waterMask = waterRegions.r;
  float armWater = waterRegions.g;
  float depth = clamp((p.y - 454.0) / 487.0, 0.0, 1.0);
  float swell = sin(p.y * 0.043 + p.x * 0.007 - elapsed * 0.72);
  float ripple = sin(p.x * 0.028 + p.y * 0.065 - elapsed * 1.05);
  vec2 waterShift = vec2(
    sin(p.y * 0.036 - elapsed * 0.68) * (0.9 + depth * 2.7),
    swell * (0.9 + depth * 2.4) + ripple * (0.4 + depth * 0.9)
  ) * waterMask;
  // Close to the arm only a small refraction is allowed. Farther out it
  // blends into the wider sea swell without moving the hand or its outline.
  float armPhase = elapsed * 0.95 - (p.x - 940.0) * 0.028;
  vec2 armShift = vec2(
    sin(armPhase - 0.6) * 0.8,
    sin(armPhase) * 1.2 + sin(p.x * 0.051 - elapsed * 1.3) * 0.25
  );
  waterShift += armShift * armWater * (1.0 - waterMask);
  float waterLine = 669.8 + sin((p.x - 250.0) * 0.012) * 1.3 + sin(elapsed * 0.96) * 0.55;
  vec2 waterUV = clamp(uv - waterShift / vec2(1672.0, 941.0), 0.0, 1.0);
  vec3 original = texture2D(painting, waterUV).rgb;
  // Remove the original fin before compositing its moving silhouette.
  // The ocean matte keeps the figure, rocks and coral at their original UVs.
  float removed = masks.b;
  vec3 color = mix(original, texture2D(cleanWater, waterUV).rgb, removed);

  if (waterMask > 0.001) {
    float spreading = oceanRipple(p, vec2(650.0, 501.0), vec2(190.0, 7.0), 0.12) * 0.32
      + oceanRipple(p, vec2(1328.0, 561.0), vec2(225.0, 12.0), 0.54) * 0.48
      + oceanRipple(p, vec2(740.0, 725.0), vec2(285.0, 18.0), 0.25) * 0.7
      + oceanRipple(p, vec2(1120.0, 813.0), vec2(345.0, 25.0), 0.72)
      + oceanRipple(p, vec2(258.0, 797.0), vec2(275.0, 22.0), 0.91) * 0.8;
    float crestPhase = p.y * (0.19 - depth * 0.085) - elapsed * 0.82
      + sin(p.x * 0.012 - elapsed * 0.18) * 1.1;
    float crests = pow(0.5 + sin(crestPhase) * 0.5, 22.0)
      * smoothstep(0.2, 0.8, sin(p.x * 0.033 + p.y * 0.11) * 0.5 + 0.5);
    float reflected = (spreading * 0.22 + crests * (0.025 + depth * 0.065)) * waterMask;
    color = mix(color, vec3(0.51, 0.7, 0.93), clamp(reflected, 0.0, 0.28));
  }

  if (armWater > 0.001) {
    float wake = armContactRipple(p, 0.0) + armContactRipple(p, 0.34) * 0.85
      + armContactRipple(p, 0.67) * 0.65;
    float glints = pow(0.5 + sin(p.y * 0.68 - elapsed * 1.15
      + sin(p.x * 0.024) * 0.6) * 0.5, 18.0)
      * smoothstep(0.3, 0.85, sin(p.x * 0.089 + elapsed * 0.23) * 0.5 + 0.5);
    float reflected = (wake * 0.27 + glints * 0.075) * armWater;
    color = mix(color, vec3(0.64, 0.8, 0.96), clamp(reflected, 0.0, 0.34));
  }

  float tailLength = clamp((580.0 - p.x) / 390.0, 0.0, 1.0);
  float bend = pow(tailLength, 1.2);
  float lowerLobe = smoothstep(593.0, 664.0, p.y);
  float tailPhase = elapsed * 1.04 - tailLength * 0.9 - lowerLobe * 0.42;
  vec2 finShift = vec2(
    sin(tailPhase - 0.4) * mix(3.4, 2.2, lowerLobe),
    sin(tailPhase) * mix(22.0, 3.2, lowerLobe)
      + sin(tailPhase * 2.0 - 0.5) * mix(1.8, 0.35, lowerLobe)
  ) * bend;
  vec2 finUV = clamp(uv - finShift / vec2(1672.0, 941.0), 0.0, 1.0);
  float finAlpha = texture2D(silhouettes, finUV).r;
  // The lower fin meets the water instead of lifting through a dry cutout.
  finAlpha *= 1.0 - smoothstep(waterLine - 0.8, waterLine + 2.4, p.y);
  color = mix(color, texture2D(painting, finUV).rgb, finAlpha);

  // Thin, broken silver-blue arcs spread from the wet edge. Draw the near
  // arcs in front of the fin, in the same ink style as the painted water.
  if (p.x > 140.0 && p.x < 645.0 && p.y > 667.0 && p.y < 722.0) {
    float wake = contactRipple(p, 0.0) + contactRipple(p, 0.34) * 0.8
      + contactRipple(p, 0.67) * 0.6;
    wake *= smoothstep(waterLine - 0.4, waterLine + 2.0, p.y);
    float contact = (1.0 - smoothstep(0.25, 0.95, abs(p.y - waterLine)))
      * smoothstep(207.0, 240.0, p.x) * (1.0 - smoothstep(485.0, 555.0, p.x))
      * smoothstep(0.15, 0.85, sin(p.x * 0.15 + elapsed * 0.6) * 0.5 + 0.5);
    color = mix(color, vec3(0.63, 0.79, 0.94), clamp(wake * 0.32 + contact * 0.18, 0.0, 0.46));
  }

  gl_FragColor = vec4(color, 1.0);
}
`

function objectOffset(value, remaining) {
  if (value?.endsWith('%')) return remaining * (Number.parseFloat(value) / 100)
  if (value === 'left' || value === 'top') return 0
  if (value === 'right' || value === 'bottom') return remaining
  if (value === 'center') return remaining * 0.5
  return Number.parseFloat(value) || 0
}

/** Animate small regions of the existing illustration without replacing it. */
export function initHeroLocalMotion(hero) {
  const source = hero?.querySelector('.hero__artwork')
  const frameElement = hero?.querySelector('.hero__frame')
  if (!source || !frameElement) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const menu = document.querySelector('#portfolio-menu')
  const clean = new Image()
  clean.decoding = 'async'
  const canvas = document.createElement('canvas')
  canvas.className = 'hero__living-art'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.visibility = 'hidden'
  canvas.dataset.motionState = 'paused'
  frameElement.querySelector('.hero__picture')?.after(canvas)
  if (!canvas.isConnected) frameElement.append(canvas)

  let gl
  let program
  let texture
  let cleanTexture
  let maskTexture
  let waterTexture
  let buffer
  let shaders = []
  let uniforms = {}
  let loaded = false
  let failed = false
  let disposed = false
  let contextLost = false
  let visible = false
  let raf = 0
  let lastTime = 0
  let lastDrawTime = 0
  let elapsed = 0
  let width = 0
  let height = 0
  let crop = [1, 1]
  let offset = [0, 0]

  function setMotionState(state) {
    if (canvas.dataset.motionState !== state) canvas.dataset.motionState = state
  }

  function release() {
    if (gl && !contextLost) {
      if (texture) gl.deleteTexture(texture)
      if (cleanTexture) gl.deleteTexture(cleanTexture)
      if (maskTexture) gl.deleteTexture(maskTexture)
      if (waterTexture) gl.deleteTexture(waterTexture)
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      shaders.forEach(shader => gl.deleteShader(shader))
    }
    texture = cleanTexture = maskTexture = waterTexture = buffer = program = undefined
    shaders = []
    uniforms = {}
    loaded = false
  }

  function stop() {
    cancelAnimationFrame(raf)
    raf = 0
    lastTime = 0
    lastDrawTime = 0
    setMotionState(failed || contextLost ? 'fallback' : 'paused')
  }

  function fallback() {
    failed = true
    stop()
    canvas.style.visibility = 'hidden'
    delete canvas.dataset.motionReady
    release()
  }

  function compile(type, code) {
    const shader = gl.createShader(type)
    if (!shader) throw new Error('Hero shader unavailable')
    shaders.push(shader)
    gl.shaderSource(shader, code)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error('Hero shader compilation failed')
    }
    return shader
  }

  function canAnimate() {
    return !disposed && !failed && !contextLost && loaded && visible
      && width > 0 && height > 0 && !document.hidden && !reducedMotion.matches
      && !menu?.open && !document.body.classList.contains('has-menu-open')
      && !hero.closest('[inert]')
  }

  function draw() {
    gl.useProgram(program)
    gl.uniform2f(uniforms.resolution, canvas.width, canvas.height)
    gl.uniform2f(uniforms.crop, crop[0], crop[1])
    gl.uniform2f(uniforms.offset, offset[0], offset[1])
    gl.uniform1f(uniforms.elapsed, elapsed)
    gl.drawArrays(gl.TRIANGLES, 0, 6)
    if (!gl.isContextLost() && canvas.style.visibility !== 'visible') {
      canvas.style.visibility = 'visible'
      canvas.dataset.motionReady = 'true'
    }
  }

  function tick(time) {
    raf = 0
    if (!canAnimate()) return stop()
    if (lastTime) elapsed += Math.min((time - lastTime) / 1000, 0.05)
    lastTime = time
    try {
      // Keep phase continuous on RAF, while limiting full-frame GPU draws.
      if (!lastDrawTime || time - lastDrawTime >= 1000 / 30 - 0.5) {
        draw()
        lastDrawTime = time
      }
      raf = requestAnimationFrame(tick)
    } catch {
      fallback()
    }
  }

  function sync() {
    if (disposed) return
    if (reducedMotion.matches) canvas.style.visibility = 'hidden'
    if (canAnimate()) {
      setMotionState('running')
      if (!raf) {
        lastTime = 0
        lastDrawTime = 0
        raf = requestAnimationFrame(tick)
      }
    } else stop()
  }

  function resize() {
    if (disposed) return
    width = frameElement.clientWidth
    height = frameElement.clientHeight
    const sourceWidth = source.naturalWidth
    const sourceHeight = source.naturalHeight
    if (width && height && sourceWidth && sourceHeight) {
      const style = getComputedStyle(source)
      const position = style.objectPosition.trim().split(/\s+/)
      const scale = Math.max(width / sourceWidth, height / sourceHeight)
      crop = [width / (sourceWidth * scale), height / (sourceHeight * scale)]
      offset = [
        -objectOffset(position[0], width - sourceWidth * scale) / (scale * sourceWidth),
        -objectOffset(position[1] || '50%', height - sourceHeight * scale) / (scale * sourceHeight),
      ]
      const ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      const nextWidth = Math.max(1, Math.round(width * ratio))
      const nextHeight = Math.max(1, Math.round(height * ratio))
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        // Resizing clears the GPU surface; show the matching source until the
        // next draw instead of exposing the cleared opaque canvas.
        canvas.style.visibility = 'hidden'
        delete canvas.dataset.motionReady
        lastDrawTime = 0
        canvas.width = nextWidth
        canvas.height = nextHeight
      }
      if (gl && !failed && !contextLost) gl.viewport(0, 0, canvas.width, canvas.height)
    }
    sync()
  }

  function initialize() {
    if (disposed || contextLost || !source.complete || !source.naturalWidth
      || !clean.complete || !clean.naturalWidth || reducedMotion.matches) return
    if (loaded) return
    try {
      if (clean.naturalWidth !== source.naturalWidth || clean.naturalHeight !== source.naturalHeight) {
        throw new Error('Hero plate dimensions do not match')
      }
      if (!gl) {
        gl = canvas.getContext('webgl', {
          alpha: false, antialias: false, depth: false, stencil: false,
          premultipliedAlpha: false, powerPreference: 'low-power',
        })
      }
      if (!gl) return fallback()
      failed = false
      const vertex = compile(gl.VERTEX_SHADER, VERTEX)
      const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT)
      program = gl.createProgram()
      if (!program) throw new Error('Hero program unavailable')
      gl.attachShader(program, vertex)
      gl.attachShader(program, fragment)
      gl.linkProgram(program)
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error('Hero program linking failed')
      }
      gl.useProgram(program)
      buffer = gl.createBuffer()
      if (!buffer) throw new Error('Hero buffer unavailable')
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
        -1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1,
      ]), gl.STATIC_DRAW)
      const position = gl.getAttribLocation(program, 'position')
      gl.enableVertexAttribArray(position)
      gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
      function createTexture(unit) {
        const created = gl.createTexture()
        if (!created) throw new Error('Hero texture unavailable')
        gl.activeTexture(gl.TEXTURE0 + unit)
        gl.bindTexture(gl.TEXTURE_2D, created)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
        return created
      }
      texture = createTexture(0)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
      cleanTexture = createTexture(1)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, clean)
      maskTexture = createTexture(2)
      const silhouettes = createSilhouettes(source, clean)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, silhouettes.width, silhouettes.height,
        0, gl.RGBA, gl.UNSIGNED_BYTE, silhouettes.pixels)
      waterTexture = createTexture(3)
      const water = createWaterMask(source)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, water.width, water.height,
        0, gl.RGBA, gl.UNSIGNED_BYTE, water.pixels)
      ;['resolution', 'crop', 'offset', 'elapsed'].forEach(name => {
        uniforms[name] = gl.getUniformLocation(program, name)
      })
      gl.uniform1i(gl.getUniformLocation(program, 'painting'), 0)
      gl.uniform1i(gl.getUniformLocation(program, 'cleanWater'), 1)
      gl.uniform1i(gl.getUniformLocation(program, 'silhouettes'), 2)
      gl.uniform1i(gl.getUniformLocation(program, 'oceanMask'), 3)
      loaded = true
      resize()
    } catch {
      fallback()
    }
  }

  function preferenceChanged() {
    if (!reducedMotion.matches && !loaded && !failed) initialize()
    sync()
  }

  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault()
    contextLost = true
    stop()
    canvas.style.visibility = 'hidden'
    delete canvas.dataset.motionReady
    release()
  }, { signal })
  canvas.addEventListener('webglcontextrestored', () => {
    contextLost = false
    failed = false
    initialize()
  }, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  reducedMotion.addEventListener('change', preferenceChanged)
  source.addEventListener('load', initialize, { signal })
  source.addEventListener('error', fallback, { signal })
  clean.addEventListener('load', initialize, { signal })
  clean.addEventListener('error', fallback, { signal })
  clean.src = '/images/hero-motion-clean-water.png'

  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(frameElement)
  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    sync()
  }, { threshold: [0, 0.001] })
  intersection.observe(hero)
  const mutation = new MutationObserver(sync)
  mutation.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  mutation.observe(hero, { attributes: true, attributeFilter: ['inert'] })
  if (menu) mutation.observe(menu, { attributes: true, attributeFilter: ['open'] })

  const bounds = hero.getBoundingClientRect()
  visible = bounds.bottom > 0 && bounds.top < window.innerHeight
  if (source.complete && source.naturalWidth) initialize()
  resize()

  return () => {
    disposed = true
    stop()
    controller.abort()
    reducedMotion.removeEventListener('change', preferenceChanged)
    resizeObserver.disconnect()
    intersection.disconnect()
    mutation.disconnect()
    release()
    canvas.remove()
  }
}
