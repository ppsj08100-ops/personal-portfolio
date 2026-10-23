const VERTEX = `
attribute vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }
`

const FRAGMENT = `
precision highp float;
uniform sampler2D painting, cleanWater, silhouettes;
uniform vec2 resolution, sourceSize, crop, offset;
uniform float elapsed;

void main() {
  // Both the screen and source coordinates start at the image's top left.
  vec2 screen = vec2(gl_FragCoord.x / resolution.x, 1.0 - gl_FragCoord.y / resolution.y);
  vec2 uv = offset + screen * crop;
  vec2 p = uv * sourceSize;
  vec3 original = texture2D(painting, uv).rgb;
  vec3 masks = texture2D(silhouettes, uv).rgb;
  // Only pixels belonging to the original fin or pale branches are removed.
  // Every mountain, rock and surrounding water pixel retains the original UV.
  float removed = max(masks.b, masks.g);
  vec3 color = mix(original, texture2D(cleanWater, uv).rgb, removed);

  float tailLength = clamp((580.0 - p.x) / 390.0, 0.0, 1.0);
  float bend = pow(tailLength, 1.35);
  float lowerLobe = smoothstep(593.0, 664.0, p.y);
  float tailPhase = elapsed * 0.625 - tailLength * 0.58 - lowerLobe * 0.23;
  vec2 finShift = vec2(sin(tailPhase - 0.35) * 0.9, sin(tailPhase) * 7.2) * bend;
  vec2 finUV = clamp(uv - finShift / sourceSize, 0.0, 1.0);
  float finAlpha = texture2D(silhouettes, finUV).r;
  color = mix(color, texture2D(painting, finUV).rgb, finAlpha);

  float root = p.x < 200.0 ? 520.0 : (p.y < 637.0 ? 613.0 : 830.0);
  float stem = clamp((root - p.y) / 230.0, 0.0, 1.0);
  float phase = p.x < 200.0 ? 0.0 : (p.y < 637.0 ? 1.7 : 3.4);
  float speed = p.x < 200.0 ? 0.87 : (p.y < 637.0 ? 0.76 : 0.96);
  float plantShift = sin(elapsed * speed - stem * 0.55 + phase) * 2.6 * stem * stem;
  vec2 plantUV = clamp(uv - vec2(plantShift, 0.0) / sourceSize, 0.0, 1.0);
  float plantAlpha = texture2D(silhouettes, plantUV).g;
  color = mix(color, texture2D(painting, plantUV).rgb, plantAlpha);
  gl_FragColor = vec4(color, 1.0);
}
`

function createSilhouettes(source, clean) {
  const width = source.naturalWidth
  const height = source.naturalHeight
  const mask = document.createElement('canvas')
  mask.width = width
  mask.height = height
  const context = mask.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('Hero silhouette unavailable')
  const fin = new Path2D(`
    M190 497 C213 501 225 483 252 478
    C288 462 342 469 374 484 C424 504 453 544 479 589
    C493 612 518 622 555 628 C570 630 579 629 585 629
    L585 638 C551 638 527 642 507 650 C483 658 462 670 432 672
    C379 675 333 669 289 670 C253 671 232 667 215 666
    C237 663 250 648 268 632 C282 612 300 599 327 592
    C312 584 300 571 293 556 C283 528 264 510 241 503
    C222 496 204 503 190 497 Z
  `)
  context.scale(width / 1672, height / 941)
  context.fillStyle = '#fff'
  context.strokeStyle = '#fff'
  context.lineWidth = 1
  context.fill(fin)
  context.stroke(fin)
  const finPixels = context.getImageData(0, 0, width, height).data
  context.clearRect(0, 0, 1672, 941)
  const plants = new Path2D(`
    M0 295 L34 295 C44 329 61 330 69 343 C110 356 132 388 141 439
    L135 500 L84 523 L61 489 L11 472 L0 433 Z
    M1590 382 L1672 382 L1672 617 L1568 609 L1534 568 L1544 518 L1582 488 Z
    M1650 633 L1672 633 L1672 832 L1526 832 L1500 787 L1535 745 L1573 719 L1580 659 Z
  `)
  context.fill(plants)
  const plantRegions = context.getImageData(0, 0, width, height).data
  context.setTransform(1, 0, 0, 1, 0, 0)
  context.clearRect(0, 0, width, height)
  context.drawImage(source, 0, 0, width, height)
  const original = context.getImageData(0, 0, width, height).data
  context.clearRect(0, 0, width, height)
  context.drawImage(clean, 0, 0, width, height)
  const background = context.getImageData(0, 0, width, height).data
  const pixels = new Uint8Array(width * height * 4)
  const clamp = value => Math.min(1, Math.max(0, value))
  const finLeft = Math.floor(184 * width / 1672)
  const finRight = Math.ceil(590 * width / 1672)
  const finTop = Math.floor(461 * height / 941)
  const finBottom = Math.ceil(680 * height / 941)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      pixels[index] = finPixels[index + 3]
      // A one-pixel removal margin prevents a stationary pale fringe when the
      // antialiased edge moves. The moving image itself uses the tight mask.
      let removal = pixels[index]
      if (removal < 255 && x >= finLeft && x <= finRight && y >= finTop && y <= finBottom) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const neighbour = ((Math.min(height - 1, Math.max(0, y + dy)) * width)
              + Math.min(width - 1, Math.max(0, x + dx))) * 4 + 3
            removal = Math.max(removal, finPixels[neighbour])
          }
        }
      }
      pixels[index + 2] = removal
      if (plantRegions[index + 3]) {
        const r = original[index]
        const g = original[index + 1]
        const b = original[index + 2]
        const light = r * 0.2126 + g * 0.7152 + b * 0.0722
        const behind = background[index] * 0.2126 + background[index + 1] * 0.7152 + background[index + 2] * 0.0722
        // The silver branch ink is paler and less saturated than the blue rock
        // outlines. A clean-plate comparison rejects unchanged highlights.
        const ink = clamp((light - 58) / 22)
          * clamp((r / Math.max(1, b) - 0.38) / 0.13)
          * clamp((light - behind - 10) / 18)
        pixels[index + 1] = Math.round(255 * ink * plantRegions[index + 3] / 255)
      }
      pixels[index + 3] = 255
    }
  }
  return { width, height, pixels }
}

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
      if (buffer) gl.deleteBuffer(buffer)
      if (program) gl.deleteProgram(program)
      shaders.forEach(shader => gl.deleteShader(shader))
    }
    texture = cleanTexture = maskTexture = buffer = program = undefined
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
    gl.uniform2f(uniforms.sourceSize, source.naturalWidth, source.naturalHeight)
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
      ;['resolution', 'sourceSize', 'crop', 'offset', 'elapsed'].forEach(name => {
        uniforms[name] = gl.getUniformLocation(program, name)
      })
      gl.uniform1i(gl.getUniformLocation(program, 'painting'), 0)
      gl.uniform1i(gl.getUniformLocation(program, 'cleanWater'), 1)
      gl.uniform1i(gl.getUniformLocation(program, 'silhouettes'), 2)
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
