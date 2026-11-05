const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const mix = (a, b, t) => a + (b - a) * t

// Clear water bubbles accompany the unchanged fish from the first card.
// Their membranes softly open beside the title as the photographs arrive.
export function createPortfolioBubbles(section, title) {
  const fish = [...document.querySelectorAll('[data-about-fish]')]
  const fishLayer = document.querySelector('.about-fish-layer')
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) return { measure() {}, update() {}, destroy() {} }
  canvas.className = 'portfolio__memories'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.hidden = true
  document.body.append(canvas)
  const controller = new AbortController()
  const { signal } = controller
  const bubbles = Array.from({ length: 5 }, (_, index) => ({
    owner: index % 2, seed: index * 1.73 + .4,
    size: [66, 52, 39, 57, 32][index],
    inward: [.17, .20, -.20, -.22, .31][index],
    elevation: [-.10, -.03, .17, .18, -.26][index],
    popAt: .14 + index * .025,
    opened: null,
  }))
  let approach = 0, phase = 0
  let voyage = Number(section.dataset.cardVoyage) || 0
  let width = innerWidth, height = innerHeight, ratio = 1
  let frame = 0, previous = 0, time = 0, disposed = false, done = false
  const duration = 260

  function mount() {
    const carried = voyage < .999 && approach < .001 && fishLayer
    const parent = carried ? fishLayer : document.body
    if (canvas.parentNode !== parent) parent.append(canvas)
    canvas.classList.toggle('is-carried', !!carried)
  }

  function sync() {
    const active = !disposed && !document.hidden && voyage > .002 && phase < .55 && !done
    canvas.hidden = !active
    if (active) {
      mount()
      if (!frame) { previous = 0; frame = requestAnimationFrame(draw) }
    } else {
      cancelAnimationFrame(frame); frame = 0; previous = 0
      context.clearRect(0, 0, canvas.width, canvas.height)
    }
  }

  function membrane(x, y, radius, opening, alpha, seed) {
    const fade = 1 - smooth(opening)
    if (fade < .001) return
    radius *= 1 + smooth(opening) * .065
    context.save()
    context.translate(x, y)
    context.rotate(Math.sin(seed) * .10)
    context.scale(1, .975)
    const skin = context.createRadialGradient(-radius * .3, -radius * .35, 0, 0, 0, radius)
    skin.addColorStop(0, `rgba(197,227,243,${alpha * fade * .045})`)
    skin.addColorStop(.76, `rgba(115,175,210,${alpha * fade * .006})`)
    skin.addColorStop(1, `rgba(157,203,228,${alpha * fade * .045})`)
    context.fillStyle = skin
    context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.fill()
    const rim = context.createLinearGradient(-radius, -radius, radius, radius)
    rim.addColorStop(0, `rgba(202,228,242,${alpha * fade * .34})`)
    rim.addColorStop(.42, `rgba(119,173,208,${alpha * fade * .10})`)
    rim.addColorStop(.8, `rgba(159,203,226,${alpha * fade * .25})`)
    rim.addColorStop(1, `rgba(119,173,208,${alpha * fade * .08})`)
    context.strokeStyle = rim
    context.lineWidth = .85 - opening * .4
    if (opening < .005) {
      context.beginPath(); context.arc(0, 0, radius, 0, Math.PI * 2); context.stroke()
    } else {
      // A thinning membrane separates into two short arcs, with no fragments.
      const gap = opening * Math.PI * .88
      for (const start of [-Math.PI * .5 + gap, Math.PI * .5 + gap]) {
        context.beginPath(); context.arc(0, 0, radius, start, start + Math.max(.015, Math.PI - gap * 1.7)); context.stroke()
      }
    }
    context.strokeStyle = `rgba(161,204,226,${alpha * fade * .07})`
    context.lineWidth = .5
    context.beginPath(); context.arc(0, 0, radius - 2, .15, Math.PI * .72); context.stroke()
    context.restore()
  }

  function draw(now) {
    frame = 0
    if (disposed || canvas.hidden) return
    const dt = previous ? Math.min(.05, (now - previous) / 1000) : 0
    previous = now; time += dt
    const viewport = canvas.getBoundingClientRect()
    context.setTransform(ratio, 0, 0, ratio, -viewport.left * ratio, -viewport.top * ratio)
    context.clearRect(viewport.left, viewport.top, width, height)
    const rect = title.getBoundingClientRect()
    const count = width < 600 ? 3 : bubbles.length
    const carriers = fish.map(node => ({ rect: node.getBoundingClientRect(), opacity: Number(getComputedStyle(node).opacity) }))
    const released = smooth((approach - .08) / .32)
    const entry = smooth(voyage / .045)
    let completed = 0
    bubbles.slice(0, count).forEach((bubble, index) => {
      if (phase >= bubble.popAt && bubble.opened === null) bubble.opened = phase > .50 ? now - duration : now
      const opening = bubble.opened === null ? 0 : clamp((now - bubble.opened) / duration)
      if (opening >= 1) { completed++; return }
      const size = bubble.size * (width < 600 ? .68 : clamp(width / 1440, .85, 1.12))
      const radius = size / 2
      const carrier = carriers[bubble.owner]
      const direction = bubble.owner ? -1 : 1
      const point = carrier?.rect
      const sourceX = point ? point.x + point.width / 2 + direction * point.width * bubble.inward : width * (bubble.owner ? .77 : .23)
      const sourceY = point ? point.y + point.height * (.5 + bubble.elevation) : height * .5
      let targetX, targetY
      if (index < 2 || index === 4) {
        targetX = width * (index === 0 ? .38 : index === 1 ? .64 : .53)
        targetY = Math.min(rect.top - radius - (index === 4 ? 84 : 28), height * (.54 + index * .025))
      } else {
        targetX = index === 2 ? rect.left - radius - 20 : rect.right + radius + 20
        targetY = rect.top + rect.height * (index === 2 ? .42 : .64)
      }
      targetX = clamp(targetX, radius + 12, width - radius - 12)
      targetY = clamp(targetY, radius + 12, height - radius - 28)
      const x = mix(sourceX, targetX, released) + Math.sin(time * .28 + bubble.seed) * 4
      const y = mix(sourceY, targetY, released) + Math.cos(time * .23 + bubble.seed) * 3 - voyage * 8
      const visibility = mix(carrier?.opacity ?? 1, 1, released)
      membrane(x, y, radius, opening, entry * visibility * .86, bubble.seed)
    })
    done = completed === count
    if (done) { sync(); return }
    frame = requestAnimationFrame(draw)
  }

  section.addEventListener('portfolio:card-impact', event => {
    voyage = clamp(event.detail.voyage ?? 0)
    if (voyage < .01) { bubbles.forEach(bubble => { bubble.opened = null }); done = false }
    sync()
  }, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  return {
    measure() {
      width = innerWidth; height = innerHeight; ratio = Math.min(devicePixelRatio || 1, 1.5)
      canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio)
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`
      sync()
    },
    update(next) {
      approach = next.approach; phase = next.phase
      bubbles.forEach(bubble => { if (phase < bubble.popAt - .02) { bubble.opened = null; done = false } })
      sync()
    },
    destroy() { disposed = true; cancelAnimationFrame(frame); controller.abort(); canvas.remove() },
  }
}
