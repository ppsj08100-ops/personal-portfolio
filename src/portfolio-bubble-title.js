const clamp = value => Math.max(0, Math.min(1, value))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t
const random = seed => { const n = Math.sin(seed * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n) }

// The fish's breath gathers into the actual Julius letterforms. All positions
// come from the existing heading, so the water and accessible text coincide.
export function createPortfolioBubbleTitle(section, title) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return { measure() {}, update() {}, destroy() {} }
  canvas.className = 'portfolio__bubble-title'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.hidden = true
  document.body.append(canvas)
  const words = [...title.querySelectorAll('.portfolio__word')]
  const fish = [...document.querySelectorAll('[data-about-fish]')]
  const abort = new AbortController()
  let width = 0, height = 0, ratio = 1, points = [], sources = []
  let entry = 0, approach = 0, phase = 0
  let voyage = Number(section.dataset.cardVoyage) || 0
  let frame = 0, previous = 0, time = 0, gathered = 0, disposed = false

  // Render the refraction once, instead of creating hundreds of gradients in
  // every frame. A broken pearl highlight leaves the interior transparent.
  const sprites = Array.from({ length: 4 }, (_, index) => {
    const tile = document.createElement('canvas')
    tile.width = tile.height = 64
    const ink = tile.getContext('2d')
    ink.translate(32, 32)
    ink.rotate((index - 1.5) * .17)
    const skin = ink.createRadialGradient(-7, -9, 1, 0, 0, 25)
    skin.addColorStop(0, '#daefff0a')
    skin.addColorStop(.65, '#8ac4e302')
    skin.addColorStop(.82, '#82bddb0d')
    skin.addColorStop(1, '#b4d8ef52')
    ink.fillStyle = skin
    ink.beginPath(); ink.arc(0, 0, 25, 0, Math.PI * 2); ink.fill()
    const edge = ink.createLinearGradient(-20, -22, 20, 22)
    edge.addColorStop(0, '#e8f7fff0')
    edge.addColorStop(.38, '#7eb5d16b')
    edge.addColorStop(.72, '#9ed7f5d9')
    edge.addColorStop(1, '#5281a359')
    ink.strokeStyle = edge; ink.lineWidth = 2.4
    ink.beginPath(); ink.arc(0, 0, 25, 0, Math.PI * 2); ink.stroke()
    ink.strokeStyle = '#e7f6fff2'; ink.lineWidth = 3.1; ink.lineCap = 'round'
    ink.beginPath(); ink.arc(0, 0, 22.5, -2.65, -1.8); ink.stroke()
    ink.strokeStyle = '#a7d7f16b'; ink.lineWidth = .8
    ink.beginPath(); ink.arc(0, 0, 21.5, .28, 1.2); ink.stroke()
    return tile
  })

  function sampleLetters() {
    const spacing = width < 600 ? 4.4 : Math.max(6, Math.min(8, width / 200))
    const tile = document.createElement('canvas')
    const ink = tile.getContext('2d', { willReadFrequently: true })
    points = []
    words.forEach((word, wordIndex) => {
      const style = getComputedStyle(word)
      const w = word.offsetWidth, h = word.offsetHeight
      if (!w || !h) return
      tile.width = Math.ceil(w + 2); tile.height = Math.ceil(h + 2)
      ink.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
      ink.letterSpacing = style.letterSpacing
      ink.fontKerning = 'normal'
      ink.fillStyle = '#fff'
      const probe = document.createElement('span')
      probe.style.cssText = 'display:inline-block;width:0;height:0;margin:0;padding:0;border:0;vertical-align:baseline'
      word.append(probe)
      const baseline = probe.getBoundingClientRect().top - word.getBoundingClientRect().top
      probe.remove()
      ink.fillText(word.textContent, 0, baseline)
      const pixels = ink.getImageData(0, 0, tile.width, tile.height).data
      const buckets = new Map()
      for (let y = 0; y < tile.height; y++) for (let x = 0; x < tile.width; x++) {
        if (pixels[(y * tile.width + x) * 4 + 3] < 70) continue
        const key = `${Math.floor(x / spacing)},${Math.floor(y / spacing)}`
        const cell = buckets.get(key) ?? { x: 0, y: 0, n: 0 }
        cell.x += x; cell.y += y; cell.n++
        buckets.set(key, cell)
      }
      const selected = []
      for (const cell of buckets.values()) {
        const x = cell.x / cell.n, y = cell.y / cell.n
        if (selected.some(point => Math.abs(point.x - x) < spacing && Math.abs(point.y - y) < spacing && Math.hypot(point.x - x, point.y - y) < spacing * .72)) continue
        selected.push({ x, y })
        const seed = points.length + wordIndex * 71
        points.push({
          word: wordIndex, x: x / w, y: y / h,
          seed: random(seed), depth: random(seed + 31),
          radius: spacing * (.37 + random(seed + 17) * .17),
        })
      }
    })
    canvas.dataset.bubbleCount = String(points.length)
  }

  function measure() {
    width = innerWidth; height = innerHeight
    ratio = Math.min(devicePixelRatio || 1, 1.75)
    canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
    sampleLetters()
    sources = []
    sync()
  }

  function readSources() {
    if (approach > .06 && sources.length === fish.length) return
    const next = fish.map((node, index) => {
      const rect = node.getBoundingClientRect()
      const matrix = new DOMMatrixReadOnly(getComputedStyle(node).transform)
      const angle = Math.atan2(matrix.b, matrix.a)
      const offset = ((index ? .85 : .865) - .5) * node.offsetHeight
      return {
        x: rect.left + rect.width / 2 - Math.sin(angle) * offset,
        y: rect.top + rect.height / 2 + Math.cos(angle) * offset,
      }
    })
    // A direct deep link can skip the visible fish; use the same lower-water
    // composition until reverse scrolling brings their actual mouths back.
    sources = next.map((point, index) => point.y > 0 && point.y < height * 1.15 && point.x > -40 && point.x < width + 40
      ? point : { x: width * (index ? .82 : .18), y: height * .87 })
  }

  function bubble(x, y, radius, alpha, seed) {
    if (alpha < .008 || x < -30 || x > width + 30 || y < -30 || y > height + 30) return
    const size = radius * 64 / 25
    ctx.globalAlpha = Math.min(1, alpha)
    ctx.drawImage(sprites[Math.floor(seed * sprites.length) % sprites.length], x - size / 2, y - size / 2, size, size)
  }

  function draw(now) {
    frame = 0
    if (disposed || canvas.hidden) return
    const delta = previous ? Math.min(.05, (now - previous) / 1000) : 0
    time += delta
    previous = now
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
    ctx.clearRect(0, 0, width, height)
    readSources()
    const rects = words.map(word => word.getBoundingClientRect())
    gathered += (clamp(approach / .30) - gathered) * (1 - Math.exp(-delta / .24))
    const gathering = gathered
    const resolving = smooth((phase - .015) / .20)
    const visibility = smooth((voyage - .90) / .07) * (1 - resolving)
    const wake = visibility * (1 - smooth(approach / .45))

    // A few recognisable larger bubbles first leave each mouth. Their slow
    // buoyancy continues even when the visitor rests between scroll steps.
    sources.forEach((source, owner) => {
      for (let i = 0; i < 12; i++) {
        const seed = random(i + owner * 23)
        const age = (time * (.10 + seed * .045) + i / 12) % 1
        const envelope = Math.sin(age * Math.PI) * wake
        const direction = owner ? -1 : 1
        bubble(source.x + direction * age * (width < 600 ? 24 : 45) + Math.sin(age * 4 + seed * 6) * 6,
          source.y - age * Math.min(height * .32, 210),
          (2 + seed * 5.5) * (width < 600 ? .75 : 1), envelope * .72, seed)
      }
    })

    for (let i = 0; i < points.length; i++) {
      const point = points[i], rect = rects[point.word]
      const owner = point.word === 0 ? 0 : 1
      const source = sources[owner]
      if (!source || !rect) continue
      const delay = point.seed * .42
      const travel = smooth((gathering - delay) / (1 - delay))
      const settled = smooth((travel - .65) / .35)
      const tx = rect.left + rect.width * point.x
      const ty = rect.top + rect.height * point.y
      const direction = owner ? -1 : 1
      const sx = source.x + (point.depth - .5) * 16
      const sy = source.y + (point.seed - .5) * 12
      const arc = Math.sin(travel * Math.PI)
      const x = mix(sx, tx, travel) + direction * arc * Math.min(width * .07, 85) * (point.depth - .1)
        + Math.sin(time * .38 + point.seed * 8) * 2.5 * (1 - settled)
      const y = mix(sy, ty, travel) - arc * (32 + point.seed * 62)
        - resolving * resolving * (8 + point.depth * 22)
      const birth = smooth(gathering / .10)
      const carrier = i % 6 === 0 ? .60 : 0
      const alpha = visibility * birth * mix(carrier, .90 + point.depth * .1, settled)
      const radius = mix(3 + point.depth * 3.5, point.radius, settled) * (1 - resolving * .4)
      bubble(x, y, radius, alpha, point.seed)
    }
    ctx.globalAlpha = 1
    canvas.dataset.bubbleGather = gathering.toFixed(3)
    frame = requestAnimationFrame(draw)
  }

  function sync() {
    const running = !disposed && !document.hidden && voyage > .90 && phase < .22 && (entry > 0 || voyage < .999)
    canvas.hidden = !running
    if (running && !frame) { previous = 0; frame = requestAnimationFrame(draw) }
    if (!running) {
      cancelAnimationFrame(frame); frame = 0; previous = 0
      ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
  }
  section.addEventListener('portfolio:card-impact', event => { voyage = clamp(event.detail.voyage); sync() }, { signal: abort.signal })
  document.addEventListener('visibilitychange', sync, { signal: abort.signal })
  document.fonts.ready.then(() => { if (!disposed) measure() })
  measure()
  return {
    measure,
    update(next) {
      entry = next.entry; approach = next.approach; phase = next.phase
      if (approach < .01) { sources = []; if (!entry) gathered = 0 }
      sync()
    },
    destroy() { disposed = true; abort.abort(); cancelAnimationFrame(frame); canvas.remove() },
  }
}
