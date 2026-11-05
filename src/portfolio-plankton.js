const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t
const noise = value => { const n = Math.sin(value) * 43758.5453; return n - Math.floor(n) }

// A small, deterministic current, born at the final card and carried to the
// title's actual ink and the gallery's projected photograph edges.
export function createPortfolioPlankton(section, letters) {
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return { measure() {}, update() {}, destroy() {} }
  canvas.className = 'portfolio__plankton'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.hidden = true
  document.body.append(canvas)
  const controller = new AbortController()
  const { signal } = controller
  const card = document.querySelector('.capability-step .capability-card')
  const motes = Array.from({ length: 36 }, (_, index) => ({
    u: index / 35,
    seed: noise(index * 127.1 + 19.7),
    depth: noise(index * 311.7 + 43.2),
    edge: null,
  }))
  let width = 0, height = 0, ratio = 1
  let cardWidth = 0, sourceY = 0
  let glyphs = []
  let photoEdges = []
  let impact = Number(section.dataset.cardImpact) || 0
  let bridge = 0, phase = 0, quiet = 1
  let frame = 0, previous = 0, drift = 0
  let disposed = false

  function measure() {
    width = innerWidth; height = innerHeight
    ratio = Math.min(devicePixelRatio || 1, 1.5)
    canvas.width = Math.round(width * ratio)
    canvas.height = Math.round(height * ratio)
    motes.forEach(mote => { mote.edge = null })
    cardWidth = card?.offsetWidth || width * .3
    sourceY = height * .5 + Math.min((card?.offsetHeight || height * .5) * .44, height * .32)
    const tile = document.createElement('canvas')
    const ink = tile.getContext('2d', { willReadFrequently: true })
    glyphs = letters.map(letter => {
      const style = getComputedStyle(letter)
      const w = Math.max(1, letter.offsetWidth), h = Math.max(1, letter.offsetHeight)
      tile.width = Math.ceil(w); tile.height = Math.ceil(h)
      ink.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      ink.fillStyle = '#fff'
      const metrics = ink.measureText(letter.textContent)
      const ascent = metrics.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .8
      const descent = metrics.fontBoundingBoxDescent ?? parseFloat(style.fontSize) * .2
      ink.fillText(letter.textContent, 0, (h - ascent - descent) / 2 + ascent)
      const pixels = ink.getImageData(0, 0, tile.width, tile.height).data
      const points = []
      for (let y = 1; y < tile.height - 1; y++) for (let x = 1; x < tile.width - 1; x++) {
        if (pixels[(y * tile.width + x) * 4 + 3] > 100) points.push({ x: x / w, y: y / h })
      }
      return points.length ? points : [{ x: .5, y: .5 }]
    })
    sync()
  }

  function sync() {
    const active = !disposed && !document.hidden && impact > .001 && phase < .985
    canvas.hidden = !active
    if (active && !frame) { previous = 0; frame = requestAnimationFrame(draw) }
    if (!active) {
      cancelAnimationFrame(frame); frame = 0; previous = 0
      context.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  function light(x, y, size, alpha, pearl) {
    const tint = pearl ? '207,235,246' : '112,181,220'
    const halo = context.createRadialGradient(x, y, 0, x, y, size * 7)
    halo.addColorStop(0, `rgba(${tint},${alpha * .48})`)
    halo.addColorStop(.22, `rgba(${tint},${alpha * .16})`)
    halo.addColorStop(1, `rgba(${tint},0)`)
    context.fillStyle = halo
    context.beginPath(); context.arc(x, y, size * 7, 0, Math.PI * 2); context.fill()
    context.fillStyle = `rgba(${pearl ? '231,246,251' : '171,220,240'},${alpha})`
    context.beginPath(); context.ellipse(x, y, size * .56, size, -.5, 0, Math.PI * 2); context.fill()
  }

  function draw(now) {
    frame = 0
    if (disposed || canvas.hidden) return
    const delta = previous ? Math.min(.05, (now - previous) / 1000) : 0
    previous = now; drift += delta * .24
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.clearRect(0, 0, width, height)
    context.globalCompositeOperation = 'lighter'
    const count = width < 600 ? 24 : motes.length
    const rects = letters.map(letter => letter.getBoundingClientRect())
    const birth = smooth(impact)
    const release = smooth((phase - .26) / .25)
    const fade = 1 - smooth((phase - .78) / .20)
    const spread = smooth(impact * .5 + bridge * .7)
    const gathering = smooth((bridge - .38) / .62)
    const haze = birth * (1 - smooth(phase / .30)) * quiet
    if (haze > .001) {
      const x = width * .5, y = mix(sourceY, height * .49, spread)
      const radius = Math.min(width * .24, height * .32)
      const glow = context.createRadialGradient(x, y, 0, x, y, radius)
      glow.addColorStop(0, `rgba(65,123,181,${haze * .065})`)
      glow.addColorStop(1, 'rgba(65,123,181,0)')
      context.fillStyle = glow; context.fillRect(x - radius, y - radius, radius * 2, radius * 2)
    }
    for (let index = 0; index < count; index++) {
      const mote = motes[Math.round(index * (motes.length - 1) / (count - 1))]
      const letterIndex = Math.min(letters.length - 1, Math.floor(index * letters.length / count))
      const rect = rects[letterIndex]
      const samples = glyphs[letterIndex]
      const point = samples[Math.floor(mote.seed * samples.length)]
      const inkX = rect.left + point.x * rect.width
      const inkY = rect.top + point.y * rect.height
      const currentX = width * (.29 + mote.u * .42 + (mote.seed - .5) * .065)
      const currentY = height * (.49 + Math.sin(mote.u * Math.PI * 2) * .045 + (mote.depth - .5) * .18)
      const startX = width * .5 + (mote.u - .5) * cardWidth * .9
      const startY = sourceY + Math.sin(mote.u * Math.PI) * 10 + (mote.depth - .5) * 12
      let x = mix(startX, currentX, spread)
      let y = mix(startY, currentY, spread)
      x = mix(x, inkX + (mote.seed - .5) * 36, gathering)
      y = mix(y, Math.min(height * .79, inkY) + (mote.depth - .5) * 42, gathering)
      const distance = Math.min(letterIndex, letters.length - 1 - letterIndex) / ((letters.length - 1) / 2)
      const arrival = .02 + distance * .14
      const settle = smooth((phase - arrival) / .16)
      x = mix(x, inkX, settle); y = mix(y, inkY, settle)
      let edge = { x: width * (.32 + mote.u * .36), y: height * .88 }
      if (photoEdges.length) {
        let target = photoEdges[Math.floor(index / 6) % photoEdges.length]
        if (mote.edge && release > .02) {
          target = photoEdges.reduce((nearest, point) => Math.hypot(point.x - mote.edge.x, point.y - mote.edge.y)
            < Math.hypot(nearest.x - mote.edge.x, nearest.y - mote.edge.y) ? point : nearest, target)
          const follow = 1 - Math.exp(-delta / .14)
          mote.edge = { x: mix(mote.edge.x, target.x, follow), y: mix(mote.edge.y, target.y, follow) }
        } else mote.edge = { ...target }
        edge = mote.edge
      }
      const bend = Math.sin(release * Math.PI)
      x = mix(x, edge.x, release) + bend * (mote.seed - .5) * width * .07
      y = mix(y, edge.y, release) - bend * height * .035
      const movement = (1 - settle) * (1 - release)
      x += Math.sin(drift + mote.u * 5) * 3 * movement
      y += Math.cos(drift * .7 + mote.seed * 6) * 2 * movement
      const surviving = mix(1, index % 6 === 0 ? 1 : 0, release)
      const alpha = birth * fade * surviving * (.44 + mote.depth * .30) * quiet
      if (alpha > .004 && x > -20 && x < width + 20 && y > -20 && y < height + 20) {
        light(x, y, .7 + mote.depth * .65, alpha, index % 4 === 0)
      }
    }
    frame = requestAnimationFrame(draw)
  }

  section.addEventListener('portfolio:card-impact', event => {
    impact = clamp(event.detail.progress)
    sync()
  }, { signal })
  section.addEventListener('portfolio:photo-edges', event => { photoEdges = event.detail.points }, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  measure()
  return {
    measure,
    update(next) { bridge = next.bridge; phase = next.phase; if (next.quiet !== undefined) quiet = next.quiet; sync() },
    destroy() { disposed = true; cancelAnimationFrame(frame); controller.abort(); canvas.remove() },
  }
}
