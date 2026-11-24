import './mirror-water-impact.css'

const NS = 'http://www.w3.org/2000/svg'
const clamp = value => Math.max(0, Math.min(1, Number(value) || 0))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const range = (value, from, to) => clamp((value - from) / (to - from))
const seed = index => { const value = Math.sin(index * 127.1 + 73.7) * 43758.5453; return value - Math.floor(value) }
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback
const fmt = value => finite(value).toFixed(3)
const POCKETS = [
  { angle: 342 }, { angle: 200 }, { angle: 300 }, { angle: 72 },
]

// The fine air sits behind the opaque portrait. It can gather into a real
// wake without moving every particle to a decorative outline around the face.
function createAirWake(svg) {
  const canvas = document.createElement('canvas')
  canvas.className = 'mirror-water-impact__wake'
  canvas.setAttribute('aria-hidden', 'true')
  svg.before(canvas)
  const ctx = canvas.getContext('2d', { alpha: true })
  const sprite = document.createElement('canvas')
  sprite.width = sprite.height = 48
  const paint = sprite.getContext('2d')
  if (!ctx || !paint) return { render() {}, destroy() { canvas.remove() } }
  const shell = paint.createRadialGradient(21, 19, 1, 24, 24, 22)
  shell.addColorStop(0, '#e6f6ff38')
  shell.addColorStop(.5, '#9acadd0a')
  shell.addColorStop(.74, '#8bbbd54d')
  shell.addColorStop(.88, '#e2f5ffcf')
  shell.addColorStop(1, '#b2d5e600')
  paint.fillStyle = shell
  paint.beginPath()
  paint.arc(24, 24, 22, 0, Math.PI * 2)
  paint.fill()
  paint.strokeStyle = '#f0fbffd9'
  paint.lineWidth = 2.4
  paint.lineCap = 'round'
  paint.beginPath()
  paint.arc(24, 24, 16, Math.PI * 1.08, Math.PI * 1.52)
  paint.stroke()

  const particles = Array.from({ length: 1320 }, (_, index) => ({
    pocket: seed(index + 13) < .58 ? 0 : seed(index + 13) < .84 ? 1 : 2,
    phase: seed(index + 31),
    lifetime: 2.1 + seed(index + 53) * 1.5,
    x: (seed(index + 71) + seed(index + 79) + seed(index + 83) - 1.5) / 1.5,
    y: (seed(index + 97) + seed(index + 101) + seed(index + 107) - 1.5) / 1.5,
    radius: index % 43 === 0 ? 2.4 + seed(index + 127) * 2.3 : .65 + seed(index + 127) ** 1.4 * 1.65,
    opacity: .36 + seed(index + 149) * .54,
    drift: seed(index + 163),
  }))
  let size = ''
  let wasActive = false

  return {
    render({ progress: p, width, height, x: cx, y: cy, mirrorWidth: span, mirrorHeight: tall, rotation, elapsed }) {
      const envelope = smooth(range(p, .16, .265)) * (1 - smooth(range(p, .5, .79)))
      const active = envelope > .002 && width > 0 && height > 0
      canvas.style.visibility = active ? 'visible' : 'hidden'
      if (!active) {
        if (wasActive) ctx.clearRect(0, 0, canvas.width, canvas.height)
        wasActive = false
        canvas.dataset.visibleParticles = '0'
        return
      }
      wasActive = true
      const ratio = Math.min(devicePixelRatio || 1, 1.5)
      const nextSize = `${width}:${height}:${ratio}`
      if (size !== nextSize) {
        size = nextSize
        canvas.width = Math.round(width * ratio)
        canvas.height = Math.round(height * ratio)
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0)
      }
      ctx.clearRect(0, 0, width, height)
      const phone = width < 600
      const count = phone ? 760 : particles.length
      const angle = rotation * Math.PI / 180
      const cos = Math.cos(angle), sin = Math.sin(angle)
      const rise = Math.min(height * .24, tall * .34)
      const pockets = [
        { x: span * .355, y: -tall * .10, sx: span * .14, sy: tall * .095, side: 1 },
        { x: -span * .365, y: -tall * .045, sx: span * .12, sy: tall * .085, side: -1 },
        { x: span * .205, y: -tall * .32, sx: span * .18, sy: tall * .075, side: 1 },
      ]
      let visible = 0
      for (let i = 0; i < count; i++) {
        const particle = particles[i]
        const pocket = pockets[particle.pocket]
        const age = (particle.phase + elapsed / particle.lifetime) % 1
        const life = smooth(age / .12) * (1 - smooth(range(age, .76, 1)))
        if (life < .02) continue
        const sourceX = pocket.x + particle.x * pocket.sx
        const sourceY = pocket.y + particle.y * pocket.sy
        const swirl = Math.sin(age * 5.2 + particle.phase * 6.28) * span * .012
        const px = cx + sourceX * cos - sourceY * sin
          + pocket.side * span * (.025 + particle.drift * .075) * age + swirl
        const py = cy + sourceX * sin + sourceY * cos
          - rise * age ** 1.15 * (.72 + particle.drift * .45)
        const radius = particle.radius * (phone ? .88 : 1) * (.8 + age * .32)
        if (px + radius < 0 || px - radius > width || py + radius < 0 || py - radius > height) continue
        ctx.globalAlpha = envelope * life * particle.opacity
        ctx.drawImage(sprite, px - radius, py - radius, radius * 2, radius * 2)
        visible++
      }
      ctx.globalAlpha = 1
      canvas.dataset.visibleParticles = String(visible)
    },
    destroy() { canvas.remove() },
  }
}

/** Entrained air gathers around the descending frame, then separates and rises. */
export function createMirrorWaterImpact(svg, id) {
  if (!svg?.ownerDocument || !svg.append) return { render() {}, destroy() {} }

  const prefix = `${String(id || 'mirror').replace(/[^a-zA-Z0-9_-]/g, '-')}-air`
  const create = (name, attributes = {}, parent) => {
    const element = svg.ownerDocument.createElementNS(NS, name)
    for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value)
    parent?.append(element)
    return element
  }
  const defs = create('defs', { 'data-mirror-water-impact': prefix })
  defs.innerHTML = `
    <radialGradient id="${prefix}-fill" cx="33%" cy="26%" r="78%">
      <stop offset="0" stop-color="#d5e8f3" stop-opacity=".28"/>
      <stop offset=".31" stop-color="#a9cdde" stop-opacity=".055"/>
      <stop offset=".68" stop-color="#5283a4" stop-opacity=".045"/>
      <stop offset=".9" stop-color="#9cbfd5" stop-opacity=".18"/>
      <stop offset="1" stop-color="#b7d6e5" stop-opacity=".3"/>
    </radialGradient>
    <linearGradient id="${prefix}-rim" x1="9%" y1="0%" x2="83%" y2="100%">
      <stop offset="0" stop-color="#d9edf6" stop-opacity=".96"/>
      <stop offset=".31" stop-color="#9fc4d9" stop-opacity=".75"/>
      <stop offset=".58" stop-color="#567c98" stop-opacity=".24"/>
      <stop offset=".81" stop-color="#98bfd5" stop-opacity=".55"/>
      <stop offset="1" stop-color="#d0e5f0" stop-opacity=".78"/>
    </linearGradient>`
  const bubbles = create('g', {
    class: 'mirror-water-impact__bubbles', display: 'none', 'aria-hidden': 'true',
    'data-visible-bubbles': '0', 'data-pool-size': '176',
  })
  svg.append(defs, bubbles)
  const wake = createAirWake(svg)

  const particles = Array.from({ length: 176 }, (_, index) => {
    const clump = Math.floor(index / 4)
    const slot = clump % 11
    // Most air stays in two narrow shoulder-height wakes, with smaller pockets
    // above the tilted frame and a little trapped air leaving its lower edge.
    const pocketIndex = slot < 5 ? 0 : slot < 8 ? 1 : slot < 10 ? 2 : 3
    const pocket = POCKETS[pocketIndex]
    const large = index % 19 === 0
    const group = create('g', {
      class: `mirror-water-impact__bubble${large ? ' is-large' : ''}`,
      display: 'none', 'data-pocket': pocketIndex,
    }, bubbles)
    create('circle', { r: '1', fill: `url(#${prefix}-fill)`, stroke: `url(#${prefix}-rim)` }, group)
    create('path', {
      d: 'M-.62 -.18 A.65 .65 0 0 1 -.07 -.66', fill: 'none',
      class: 'mirror-water-impact__bubble-light',
    }, group)
    return {
      group, large,
      residual: large || index % 7 === 0,
      angle: (pocket.angle + (seed(index + 11) - .5) * 19) * Math.PI / 180,
      start: ((clump * .61803398875) % 1) + (index % 4) * .008 + seed(index + 31) * .009,
      lifetime: 2.85 + seed(index + 51) * 1.22,
      radius: large ? 3 + seed(index + 91) * 3 : .6 + 1.8 * seed(index + 91) ** 1.35,
      speed: .7 + seed(index + 131) * .36 + (large ? .12 : 0),
      drift: seed(pocketIndex + 171) * 2 - 1,
      jitterX: seed(index + 211) + seed(index + 221) - 1,
      jitterY: seed(index + 231) + seed(index + 241) - 1,
      brightness: large ? .51 + seed(index + 251) * .27 : .15 + seed(index + 251) * .4,
      phase: seed(index + 291) * Math.PI * 2,
    }
  })
  let disposed = false
  let wasActive = false
  let previousProgress = 0
  let clockOrigin = 0

  function render({
    progress = 0, width = 0, height = 0, x = width / 2, y = height / 2,
    mirrorWidth = 0, mirrorHeight = mirrorWidth * 1.5, rotation = 0,
    time = 0, elapsed,
  } = {}) {
    if (disposed) return
    const p = clamp(progress)
    const viewportWidth = Math.max(0, finite(width))
    const viewportHeight = Math.max(0, finite(height))
    const span = Math.max(0, finite(mirrorWidth))
    const tall = Math.max(0, finite(mirrorHeight, span * 1.5))
    const active = p > .18 && p < .9 && viewportWidth > 0 && viewportHeight > 0 && span > 0 && tall > 0
    const clock = finite(elapsed, finite(time))
    if (!wasActive || p < previousProgress - .0001) clockOrigin = clock
    wasActive = active
    previousProgress = p
    wake.render({
      progress: p, width: viewportWidth, height: viewportHeight,
      x: finite(x, viewportWidth / 2), y: finite(y, viewportHeight / 2),
      mirrorWidth: span, mirrorHeight: tall, rotation: finite(rotation),
      elapsed: Math.max(0, clock - clockOrigin),
    })
    bubbles.setAttribute('display', active ? 'inline' : 'none')
    if (!active) {
      bubbles.setAttribute('data-visible-bubbles', '0')
      return
    }

    const cx = finite(x, viewportWidth / 2)
    const cy = finite(y, viewportHeight / 2)
    const phone = viewportWidth < 600
    const count = phone ? 104 : particles.length
    const period = phone ? 4.4 : 4.7
    const runningTime = Math.max(0, clock - clockOrigin) + .9 + range(p, .18, .7) * 2.1
    const arrival = smooth(range(p, .18, .27))
    const cloudEnvelope = arrival * (1 - smooth(range(p, .48, .645)))
    const residualEnvelope = arrival * (1 - smooth(range(p, .64, .9)))
    const angle = finite(rotation) * Math.PI / 180
    const cos = Math.cos(angle), sin = Math.sin(angle)
    const rise = Math.min(viewportHeight * .53, tall * .73)
    const rimX = span * .398, rimY = tall * .414
    const initialSpread = Math.min(19, span * .042)
    let visible = 0

    for (let index = 0; index < particles.length; index++) {
      const particle = particles[index]
      const localTime = runningTime - particle.start * period
      const age = localTime >= 0 ? (localTime % period) / particle.lifetime : -1
      const envelope = particle.residual ? residualEnvelope : cloudEnvelope
      const life = index < count && age >= 0 && age < 1
        ? smooth(age / .045) * (1 - smooth(range(age, .67, 1))) * envelope : 0
      particle.group.setAttribute('display', life > .015 ? 'inline' : 'none')
      if (life <= .015) continue

      const localX = Math.cos(particle.angle) * rimX
      const localY = Math.sin(particle.angle) * rimY
      const anchorX = cx + localX * cos - localY * sin
      const anchorY = cy + localX * sin + localY * cos
      const side = localX < 0 ? -1 : 1
      const escape = smooth(age / .3)
      const outward = Math.max(span * .018, span * .435 - Math.abs(localX)) * escape
      const sway = Math.sin(age * 5.1 + particle.phase) * Math.min(12, span * .028) * escape
      // The loose wake trails above and slightly to the right of the descent.
      let px = anchorX + side * outward + sway
        + span * (.035 + particle.drift * .07) * age
        + particle.jitterX * initialSpread * (1 + age * 1.4)
      let py = anchorY - rise * age ** 1.28 * particle.speed
        + particle.jitterY * initialSpread * (1 - age * .25)
      const radius = particle.radius * (phone ? .9 : 1) * (.9 + age * .17)

      // Keep the dense cloud around the silhouette and leave the portrait readable.
      const relativeX = (px - cx) * cos + (py - cy) * sin
      const relativeY = -(px - cx) * sin + (py - cy) * cos
      if (Math.abs(relativeY) < rimY && age > .02) {
        const edge = rimX * Math.sqrt(Math.max(0, 1 - (relativeY / rimY) ** 2)) + radius + 2
        if (Math.abs(relativeX) < edge) {
          const escapedX = side * edge
          px = cx + escapedX * cos - relativeY * sin
          py = cy + escapedX * sin + relativeY * cos
        }
      }
      const inset = radius + 7 + Math.abs(particle.jitterX) * 7
      px = Math.max(inset, Math.min(viewportWidth - inset, px))
      const edgeFade = smooth(range(py, -radius * 2, radius * 4))
      const opacity = life * particle.brightness * edgeFade
      particle.group.setAttribute('opacity', fmt(opacity))
      particle.group.setAttribute('transform', `translate(${fmt(px)} ${fmt(py)}) scale(${fmt(radius)})`)
      if (opacity > .018) visible++
    }
    bubbles.setAttribute('data-visible-bubbles', String(visible))
    bubbles.setAttribute('data-active-pool', String(count))
  }

  return {
    render,
    destroy() {
      if (disposed) return
      disposed = true
      wake.destroy()
      bubbles.remove()
      defs.remove()
    },
  }
}
