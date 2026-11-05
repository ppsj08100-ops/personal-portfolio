import { createWaterLetterField } from './portfolio-water-field.js'

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const noise = seed => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n) }

const vertexSource = `
  attribute vec2 a_position;
  varying vec2 v_uv;
  void main() {
    v_uv = vec2(a_position.x * .5 + .5, .5 - a_position.y * .5);
    gl_Position = vec4(a_position, 0., 1.);
  }
`

// A travelling capillary wave wets the original, slender letterforms. Water
// stays a thin surface; it never inflates the typography into sculpted tubes.
const fragmentSource = `
  precision highp float;
  varying vec2 v_uv;
  uniform sampler2D u_field;
  uniform vec2 u_size;
  uniform vec2 u_texel;
  uniform vec4 u_word0;
  uniform vec4 u_word1;
  uniform float u_time;
  uniform float u_gather;
  uniform float u_resolve;
  uniform float u_swell;
  uniform float u_alpha;

  float ink(vec2 p) {
    vec2 uv = p / u_size;
    if (min(uv.x, uv.y) < 0. || max(uv.x, uv.y) > 1.) return -32.;
    return (texture2D(u_field, uv).r * 255. - 128.) * .25;
  }
  float ripple(vec2 p) {
    return sin(p.x * .083 + p.y * .12 - u_time * .35)
      * sin(p.y * .057 - p.x * .024 + u_time * .22);
  }
  float liquid(vec2 p) {
    float settling = 1. - u_resolve;
    vec2 flow = vec2(ripple(p), ripple(p.yx + 17.)) * .28 * settling;
    float shape = ink(p + flow) + u_swell;
    float distance0 = length((p - u_word0.xy - u_word0.zw * .5) / u_word0.zw);
    float distance1 = length((p - u_word1.xy - u_word1.zw * .5) / u_word1.zw);
    bool first = distance0 < distance1;
    vec4 word = first ? u_word0 : u_word1;
    float across = clamp((p.x - word.x) / word.z, 0., 1.);
    if (first) across = 1. - across;
    float front = u_gather * 1.18 - .09;
    float wet = (front - across + sin(p.y * .095 + p.x * .012) * .022 * (1. - u_gather))
      * min(word.z * .16, 40.);
    shape = min(shape, wet);

    // A short crest carries the advancing edge between adjacent strokes,
    // then settles into the glyph itself instead of remaining as decoration.
    float crestY = word.y + word.w * .53
      + sin((p.x - word.x) * .027 - u_gather * 5.) * word.w * .065;
    float crest = (.50 * (1. - u_gather)) - abs(p.y - crestY);
    crest = min(crest, (across - front + .20) * word.z);
    crest = min(crest, (front + .025 - across) * word.z);
    crest = min(crest, (1. - u_gather) * 12. - .12);
    shape = max(shape, min(crest, ink(p) + 1.1));

    // Small lobes break the advancing wet edge. They join the same surface,
    // rather than placing independent round particles along each letter.
    float splash = sin(clamp(u_gather, 0., 1.) * 3.141593);
    for (int i = 0; i < 5; i++) {
      float f = float(i);
      float direction = first ? -1. : 1.;
      vec2 center = vec2(word.x + (first ? 1. - front : front) * word.z,
                         word.y + word.w * (.19 + f * .15));
      center.x += direction * (sin(f * 4.7) * 8. + 3.) * splash;
      center.y += sin(f * 3.2 + u_gather * 3.) * 7. * splash;
      float radius = (.55 + .30 * sin(f * 2.1)) * splash;
      shape = max(shape, radius - length(p - center));
    }
    return shape;
  }
  void main() {
    vec2 p = v_uv * u_size;
    float d = liquid(p);
    float aa = max(.40, u_texel.x * .65);
    float coverage = smoothstep(-aa, aa, d);
    if (coverage < .005) discard;

    vec2 gradient = vec2(
      liquid(p + vec2(u_texel.x, 0.)) - liquid(p - vec2(u_texel.x, 0.)),
      liquid(p + vec2(0., u_texel.y)) - liquid(p - vec2(0., u_texel.y))
    ) / (u_texel * 2.);
    vec2 direction = gradient / max(length(gradient), .001);
    float surface = .5 + .5 * sin(p.x * .011 + p.y * .025 - u_time * .24);
    float sheen = pow(.5 + .5 * sin(p.x * .006 - p.y * .017 + u_time * .17), 5.);
    vec3 pearl = mix(vec3(.52, .73, .85), vec3(.88, .95, .98), surface * .65 + .28);
    pearl += vec3(.08, .10, .11) * sheen;
    float edge = max(0., dot(direction, normalize(vec2(-.6, -.8)))) * .055;
    float alpha = coverage * u_alpha * (.75 + surface * .14 + edge);
    gl_FragColor = vec4(pearl * alpha, alpha);
  }
`

export function createPortfolioWaterTitle(section, title) {
  const canvas = document.createElement('canvas')
  const trails = document.createElement('canvas')
  const gl = canvas.getContext('webgl', { alpha: true, premultipliedAlpha: true, antialias: true, depth: false, stencil: false })
  const ctx = trails.getContext('2d')
  const empty = { supported: false, measure() {}, update() {}, destroy() {} }
  if (!gl || !ctx) return empty
  const shaders = []
  let program, buffer, texture, uniforms, field
  try {
    const compile = (type, source) => {
      const shader = gl.createShader(type)
      shaders.push(shader); gl.shaderSource(shader, source); gl.compileShader(shader)
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Water shader unavailable')
      return shader
    }
    program = gl.createProgram()
    gl.attachShader(program, compile(gl.VERTEX_SHADER, vertexSource))
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, fragmentSource))
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Water material unavailable')
    gl.useProgram(program)
    buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'a_position')
    gl.enableVertexAttribArray(position); gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    uniforms = Object.fromEntries(['field', 'size', 'texel', 'word0', 'word1', 'time', 'gather', 'resolve', 'swell', 'alpha']
      .map(key => [key, gl.getUniformLocation(program, `u_${key}`)]))
    texture = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.disable(gl.DEPTH_TEST); gl.enable(gl.BLEND)
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA)
    gl.clearColor(0, 0, 0, 0)
  } catch {
    shaders.forEach(shader => gl.deleteShader(shader))
    if (program) gl.deleteProgram(program)
    if (buffer) gl.deleteBuffer(buffer)
    if (texture) gl.deleteTexture(texture)
    return empty
  }

  canvas.className = 'portfolio__water-title'
  trails.className = 'portfolio__water-trails'
  for (const node of [trails, canvas]) {
    node.setAttribute('aria-hidden', 'true'); node.hidden = true; document.body.append(node)
  }
  const words = [...title.querySelectorAll('.portfolio__word')]
  const fish = [...document.querySelectorAll('[data-about-fish]')]
  const abort = new AbortController()
  const bubbleImage = document.createElement('canvas')
  bubbleImage.width = bubbleImage.height = 64
  const bubbleInk = bubbleImage.getContext('2d')
  bubbleInk.translate(32, 32)
  const skin = bubbleInk.createRadialGradient(-8, -9, 1, 0, 0, 25)
  skin.addColorStop(0, '#d9f2ff0b'); skin.addColorStop(.75, '#88bdd902'); skin.addColorStop(1, '#b4d8ef2e')
  bubbleInk.fillStyle = skin; bubbleInk.beginPath(); bubbleInk.arc(0, 0, 25, 0, Math.PI * 2); bubbleInk.fill()
  const rim = bubbleInk.createLinearGradient(-20, -22, 20, 22)
  rim.addColorStop(0, '#e8f7ffe6'); rim.addColorStop(.38, '#7eb5d140'); rim.addColorStop(.72, '#9ed7f5b0'); rim.addColorStop(1, '#5281a340')
  bubbleInk.strokeStyle = rim; bubbleInk.lineWidth = 1.7
  bubbleInk.beginPath(); bubbleInk.arc(0, 0, 25, 0, Math.PI * 2); bubbleInk.stroke()
  bubbleInk.strokeStyle = '#effbffe0'; bubbleInk.lineWidth = 2.4; bubbleInk.lineCap = 'round'
  bubbleInk.beginPath(); bubbleInk.arc(0, 0, 22.5, -2.7, -1.8); bubbleInk.stroke()
  let width = 0, height = 0, ratio = 1, sources = []
  let entry = 0, approach = 0, phase = 0, gathered = 0
  let voyage = Number(section.dataset.cardVoyage) || 0
  let frame = 0, previous = 0, time = 0, disposed = false, failed = false

  function measure() {
    if (disposed || failed) return
    width = innerWidth; height = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.65)
    canvas.width = trails.width = Math.round(width * ratio)
    canvas.height = trails.height = Math.round(height * ratio)
    field = createWaterLetterField(words, { reference: title, padding: 24, maxWidth: 1536, scale: 1.5 })
    if (!field) { failed = true; sync(); section.dispatchEvent(new CustomEvent('portfolio:water-fallback')); return }
    gl.bindTexture(gl.TEXTURE_2D, texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, field.width, field.height, 0, gl.RGBA, gl.UNSIGNED_BYTE, field.data)
    gl.uniform1i(uniforms.field, 0)
    gl.uniform2f(uniforms.size, field.cssWidth, field.cssHeight)
    gl.uniform2f(uniforms.texel, field.cssWidth / field.width, field.cssHeight / field.height)
    for (let i = 0; i < 2; i++) {
      const word = field.words[i]
      gl.uniform4f(uniforms[`word${i}`], word.x, word.y, word.width, word.height)
    }
    sources = []
    canvas.dataset.waterField = `${field.width}×${field.height}`
    sync()
  }

  function readSources() {
    if (approach > .06 && sources.length === fish.length) return
    sources = fish.map((node, index) => {
      const rect = node.getBoundingClientRect()
      const transform = new DOMMatrixReadOnly(getComputedStyle(node).transform)
      const angle = Math.atan2(transform.b, transform.a)
      const offset = ((index ? .85 : .865) - .5) * node.offsetHeight
      const x = rect.left + rect.width / 2 - Math.sin(angle) * offset
      const y = rect.top + rect.height / 2 + Math.cos(angle) * offset
      return x > -40 && x < width + 40 && y > 0 && y < height * 1.15
        ? { x, y } : { x: width * (index ? .82 : .18), y: height * .87 }
    })
  }

  function curve(source, destination, t, owner) {
    const direction = owner ? -1 : 1
    const a = 1 - t
    const c1 = { x: source.x + direction * Math.min(width * .10, 100), y: source.y - height * .28 }
    const c2 = { x: destination.x - direction * Math.min(width * .04, 52), y: destination.y + height * .16 }
    return {
      x: a * a * a * source.x + 3 * a * a * t * c1.x + 3 * a * t * t * c2.x + t * t * t * destination.x,
      y: a * a * a * source.y + 3 * a * a * t * c1.y + 3 * a * t * t * c2.y + t * t * t * destination.y,
    }
  }

  function droplet(x, y, radius, alpha, angle = 0) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle)
    const fill = ctx.createLinearGradient(-radius, -radius, radius, radius)
    fill.addColorStop(0, `rgba(219,244,255,${alpha * .72})`)
    fill.addColorStop(.36, `rgba(78,151,192,${alpha * .18})`)
    fill.addColorStop(.72, `rgba(123,195,227,${alpha * .54})`)
    fill.addColorStop(1, `rgba(34,82,123,${alpha * .36})`)
    ctx.fillStyle = fill; ctx.beginPath(); ctx.ellipse(0, 0, radius * .68, radius, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = `rgba(215,242,254,${alpha * .54})`; ctx.lineWidth = .6
    ctx.beginPath(); ctx.ellipse(0, 0, radius * .68, radius, 0, -2.9, -1.6); ctx.stroke()
    ctx.restore()
  }

  function drawTrails(rects, visibility) {
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0); ctx.clearRect(0, 0, width, height)
    const transport = clamp(approach * .45 + gathered * .55)
    const dissolve = 1 - smooth((gathered - .80) / .20)
    const actualTitle = title.getBoundingClientRect()
    const titleTop = entry > 0 ? actualTitle.top : height * .12
    sources.forEach((source, owner) => {
      const rect = rects[owner]
      if (!rect) return
      const destination = { x: owner ? rect.left + 3 : rect.right - 3, y: titleTop + rect.top - actualTitle.top + rect.height * .5 }
      const head = smooth(clamp(transport * 1.4))
      const leading = curve(source, destination, head, owner)
      const impact = smooth((head - .87) / .13) * dissolve
      droplet(leading.x, leading.y, 2.4 * (1 - impact * .8), visibility * Math.sin(head * Math.PI) * .7)
      if (impact > .01) {
        ctx.strokeStyle = `rgba(171,217,241,${visibility * impact * .15})`; ctx.lineWidth = .65
        ctx.beginPath(); ctx.ellipse(destination.x, destination.y, 7 + gathered * 10, 2 + gathered * 2, 0, Math.PI * .12, Math.PI * .88); ctx.stroke()
      }
      // Different paths, sizes and arrival times let clear bubbles merge into
      // the travelling crest. They dissolve into the ink, never bead the type.
      const inkPoints = field.points.filter(point => point.owner === owner)
      for (let i = 0; i < 14; i++) {
        const seed = noise(i + owner * 19)
        const t = smooth((transport - seed * .30) / (1 - seed * .30))
        const ink = inkPoints[Math.min(inkPoints.length - 1, Math.floor(seed * inkPoints.length))]
        const target = ink ? { x: actualTitle.left - field.padding + ink.x, y: titleTop - field.padding + ink.y } : destination
        const p = curve(source, target, t, owner)
        const drift = Math.sin(t * Math.PI) * (seed - .5) * (width < 600 ? 34 : 90)
        const merging = smooth((t - .82) / .18)
        const radius = (2.6 + seed * 5.4) * (width < 600 ? .72 : 1) * (1 - merging * .8)
        const size = radius * 64 / 25
        ctx.globalAlpha = visibility * smooth(transport / .08) * (1 - merging) * (.55 + seed * .35)
        ctx.drawImage(bubbleImage, p.x + drift - size / 2, p.y + Math.cos(seed * 6) * drift * .6 - size / 2, size, size)
      }
      ctx.globalAlpha = 1
      const breath = smooth((voyage - .94) / .05) * (1 - smooth(gathered / .25))
      for (let i = 0; i < 4; i++) {
        const age = (time * .16 + i * .23) % 1
        droplet(source.x + Math.sin(age * 3 + i) * 8, source.y - age * 54,
          1.6 + noise(i + owner * 13) * 2.3, breath * Math.sin(age * Math.PI) * .6)
      }
    })
  }

  function draw(now) {
    frame = 0
    if (disposed || failed || canvas.hidden || !field) return
    const delta = previous ? Math.min(.05, (now - previous) / 1000) : 0
    previous = now; time += delta
    gathered += (clamp(entry / .38) - gathered) * (1 - Math.exp(-delta / .22))
    const resolving = smooth((phase - .02) / .20)
    const visibility = smooth((voyage - .92) / .06) * (1 - resolving)
    readSources()
    drawTrails(words.map(word => word.getBoundingClientRect()), visibility)
    const rect = title.getBoundingClientRect()
    const left = rect.left - field.padding, top = rect.top - field.padding
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.viewport(Math.round(left * ratio), Math.round((height - top - field.cssHeight) * ratio),
      Math.round(field.cssWidth * ratio), Math.round(field.cssHeight * ratio))
    gl.uniform1f(uniforms.time, time)
    gl.uniform1f(uniforms.gather, gathered)
    gl.uniform1f(uniforms.resolve, resolving)
    const fontSize = parseFloat(getComputedStyle(words[0]).fontSize)
    gl.uniform1f(uniforms.swell, (.12 + fontSize * .003) * (1 - resolving))
    gl.uniform1f(uniforms.alpha, visibility)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    canvas.dataset.waterGather = gathered.toFixed(3)
    canvas.dataset.waterResolve = resolving.toFixed(3)
    frame = requestAnimationFrame(draw)
  }

  function sync() {
    const running = !disposed && !failed && !document.hidden && voyage > .92 && phase < .23 && (entry > 0 || voyage < .999)
    canvas.hidden = trails.hidden = !running
    if (running && !frame) { previous = 0; frame = requestAnimationFrame(draw) }
    if (!running) {
      cancelAnimationFrame(frame); frame = 0; previous = 0
      ctx.clearRect(0, 0, trails.width, trails.height)
      if (!failed) gl.clear(gl.COLOR_BUFFER_BIT)
    }
  }
  canvas.addEventListener('webglcontextlost', event => {
    event.preventDefault(); failed = true; sync()
    section.dispatchEvent(new CustomEvent('portfolio:water-fallback'))
  }, { signal: abort.signal })
  section.addEventListener('portfolio:card-impact', event => { voyage = clamp(event.detail.voyage); sync() }, { signal: abort.signal })
  document.addEventListener('visibilitychange', sync, { signal: abort.signal })
  document.fonts.ready.then(() => { if (!disposed) measure() })
  measure()
  return {
    get supported() { return !failed },
    measure,
    update(next) {
      entry = next.entry; approach = next.approach; phase = next.phase
      if (approach < .01) { sources = []; if (!entry) gathered = 0 }
      sync()
    },
    destroy() {
      disposed = true; abort.abort(); cancelAnimationFrame(frame)
      canvas.remove(); trails.remove()
      shaders.forEach(shader => gl.deleteShader(shader))
      gl.deleteTexture(texture); gl.deleteBuffer(buffer); gl.deleteProgram(program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    },
  }
}
