import './underwater-bubbles.css'

const clamp = (value, min, max) => Math.max(min, Math.min(max, value))
const smooth = value => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t) }
const number = (value, fallback = 0) => Number.isFinite(value) ? value : fallback

// Refraction, a broken rim, and two quiet glints are baked once per size.
// Drawing cached sprites keeps a dense wake inexpensive on small screens.
function bubbleSprite(radius, foreground) {
  const canvas = document.createElement('canvas')
  const size = Math.ceil(radius * 2 + 4)
  const ratio = 3
  canvas.width = canvas.height = size * ratio
  const context = canvas.getContext('2d')
  if (!context) return null
  context.scale(ratio, ratio)
  const center = size / 2
  const surface = context.createRadialGradient(center - radius * .28, center - radius * .3, 0, center, center, radius)
  surface.addColorStop(0, 'rgba(8,24,39,0)')
  surface.addColorStop(.7, 'rgba(42,76,97,.025)')
  surface.addColorStop(.91, 'rgba(109,157,178,.12)')
  surface.addColorStop(1, 'rgba(6,19,33,.22)')
  context.fillStyle = surface
  context.beginPath()
  context.arc(center, center, radius, 0, Math.PI * 2)
  context.fill()
  context.lineWidth = foreground ? .65 : .5
  context.lineCap = 'round'
  context.strokeStyle = foreground ? 'rgba(157,195,211,.7)' : 'rgba(108,153,175,.58)'
  context.beginPath()
  context.arc(center, center, radius * .95, -.17, Math.PI * 1.4)
  context.stroke()
  context.lineWidth = foreground ? .85 : .65
  context.strokeStyle = foreground ? 'rgba(225,240,241,.9)' : 'rgba(183,215,224,.7)'
  context.beginPath()
  context.arc(center - radius * .04, center - radius * .04, radius * .72, Math.PI * 1.08, Math.PI * 1.45)
  context.stroke()
  context.lineWidth = .45
  context.strokeStyle = 'rgba(129,177,195,.4)'
  context.beginPath()
  context.arc(center, center, radius * .79, .25, 1.05)
  context.stroke()
  return { canvas, size }
}

/** A local, layered underwater air field. All input coordinates are CSS pixels.
 * setEmitter rate=0 lets the existing wake dissipate; setActive(false) pauses it. */
export function createUnderwaterBubbles(host, { maxParticles = 220, seed = 1 } = {}) {
  const noop = { resize() {}, setEmitter() {}, setCurrent() {}, burst() {}, setActive() {}, clear() {}, destroy() {} }
  if (!host) return noop
  const layers = ['back', 'front'].map(depth => {
    const canvas = document.createElement('canvas')
    canvas.className = `underwater-bubbles__canvas underwater-bubbles__${depth}`
    canvas.setAttribute('aria-hidden', 'true')
    canvas.hidden = true
    return { canvas, context: canvas.getContext('2d', { alpha: true }) }
  })
  if (layers.some(layer => !layer.context)) return noop
  layers.forEach(({ canvas }) => host.append(canvas))
  const originalCount = host.getAttribute('data-bubble-count')
  const controller = new AbortController()
  const cap = clamp(Math.round(number(maxParticles, 220)), 1, 500)
  const sprites = new Map()
  const particles = []
  let randomState = (number(seed, 1) | 0) || 1
  let emitter = { x: 0, y: 0, width: 0, height: 0, rate: 0, shape: 'plume', velocityY: 0, energy: 1 }
  let current = null
  let width = 1, height = 1, ratio = 1
  let frame = 0, lastTime = 0, emission = 0
  let active = false, disposed = false

  function random() {
    randomState ^= randomState << 13
    randomState ^= randomState >>> 17
    randomState ^= randomState << 5
    return (randomState >>> 0) / 4294967296
  }

  function describe(options) {
    return {
      x: number(options.x), y: number(options.y),
      width: Math.max(0, number(options.width)), height: Math.max(0, number(options.height)),
      rate: clamp(number(options.rate), 0, 600),
      shape: options.shape === 'rim' ? 'rim' : 'plume',
      outline: options.outline === 'rect' ? 'rect' : 'ellipse',
      velocityY: clamp(number(options.velocityY), -180, 100),
      energy: clamp(number(options.energy, 1), .1, 2),
    }
  }

  function spawn(source) {
    if (particles.length >= cap) return
    let x, y, side
    if (source.shape === 'rim') {
      if (source.outline === 'rect') {
        side = random() < .5 ? -1 : 1
        if (random() < .88) {
          x = source.x + side * source.width * (.49 + random() * .015)
          y = source.y + (random() - .5) * source.height * .98
        } else {
          x = source.x + side * source.width * (.18 + random() * .31)
          y = source.y + (random() < .7 ? -1 : 1) * source.height * .49
        }
      } else {
        // Most trapped air peels off the sides. Avoid the lower center, where a
        // rising front bubble would otherwise cross the subject's face.
        const angle = random() < .88
          ? (random() < .5 ? 0 : Math.PI) + (random() - .5) * 2.35
          : Math.PI * 1.5 + (random() - .5) * .9
        side = Math.cos(angle) < 0 ? -1 : 1
        x = source.x + Math.cos(angle) * source.width * (.48 + random() * .05)
        y = source.y + Math.sin(angle) * source.height * (.47 + random() * .06)
      }
    } else {
      const spread = (random() + random() + random() - 1.5) / 1.5
      side = spread < 0 ? -1 : 1
      x = source.x + spread * source.width * .5
      y = source.y + random() * source.height
    }
    if (x < -40 || x > width + 40 || y < -50 || y > height + 100) return
    const sizeChoice = random()
    const radius = sizeChoice < .8 ? 1 + Math.pow(random(), 1.6) * 2.6
      : sizeChoice < .97 ? 3.1 + random() * 2.3 : 5.4 + random() * 1.8
    const front = random() < .2
    const bucket = Math.round(radius * 2) / 2
    const key = `${bucket}:${front ? 1 : 0}`
    if (!sprites.has(key)) sprites.set(key, bubbleSprite(bucket, front))
    const sprite = sprites.get(key)
    if (!sprite) return
    const spread = source.shape === 'rim' ? side * (11 + random() * 14) : side * (3 + random() * 13)
    particles.push({
      x, y, age: 0, life: 2.8 + random() * 2.7,
      vy: source.velocityY + (random() - .5) * 15,
      vx: spread * source.energy,
      current: source.shape === 'rim' ? side * (3 + random() * 5) : (random() - .5) * 8,
      speed: (27 + radius * 10 + random() * 25) * (.8 + source.energy * .2),
      phase: random() * Math.PI * 2, wobble: .8 + random() * 2.5,
      frequency: .8 + random() * .7,
      alpha: (front ? .38 + random() * .28 : .2 + random() * .3),
      front, sprite, side,
    })
  }

  function clearPixels() {
    for (const { context } of layers) {
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      context.clearRect(0, 0, width, height)
    }
  }

  function paint() {
    clearPixels()
    for (const particle of particles) {
      const progress = particle.age / particle.life
      const birth = smooth(particle.age / .12)
      const death = 1 - smooth((progress - .72) / .28)
      const expansion = 1 + progress * .09
      const context = layers[particle.front ? 1 : 0].context
      const size = particle.sprite.size * expansion
      const x = particle.x + Math.sin(particle.phase + particle.age * particle.frequency * 2) * particle.wobble
      let clearance = 1
      if (current?.mode === 'split' && !particle.front) {
        // Far air can pass behind the wooden ring, through its real openings.
        // The front layer remains visible across the rim instead of vanishing.
        const dx = particle.x - current.x, dy = particle.y - current.y
        const distance = Math.hypot(dx, dy)
        const ring = smooth((distance - current.innerRadius + 2) / 4)
          * (1 - smooth((distance - current.radius + 2) / 4))
        const hub = 1 - smooth((distance - current.radius * .32) / 6)
        const angle = (Math.atan2(dy, dx) - current.rotation) * 8
        const spokeAngle = Math.abs(Math.atan2(Math.sin(angle), Math.cos(angle))) / 8
        const spoke = smooth((distance - current.radius * .29) / 8)
          * (1 - smooth((distance - current.innerRadius) / 8))
          * (1 - smooth((spokeAngle - .04) / .035))
        clearance = 1 - Math.max(ring, hub, spoke)
      }
      context.globalAlpha = particle.alpha * birth * death * clearance
      context.drawImage(particle.sprite.canvas, x - size / 2, particle.y - size / 2, size, size)
    }
    layers.forEach(({ context }) => { context.globalAlpha = 1 })
    host.dataset.bubbleCount = String(particles.length)
  }

  function tick(now) {
    frame = 0
    if (disposed || !active || document.hidden) return
    const dt = lastTime ? clamp((now - lastTime) / 1000, 0, .04) : 1 / 60
    lastTime = now
    emission += emitter.rate * dt
    const count = Math.min(cap, Math.floor(emission))
    emission -= count
    for (let index = 0; index < count; index++) spawn(emitter)
    const drag = 1 - Math.exp(-dt * 1.8)
    for (let index = particles.length - 1; index >= 0; index--) {
      const particle = particles[index]
      particle.age += dt
      particle.vy += (-particle.speed - particle.vy) * drag
      particle.vx += (particle.current - particle.vx) * (1 - Math.exp(-dt * .6))
      if (current) {
        const dx = particle.x - current.x
        const dy = particle.y - current.y
        const distance = Math.hypot(dx, dy)
        const band = distance / current.radius
        if (current.mode === 'split' && current.strength > 0 && distance > 0) {
          const nx = dx / distance, ny = dy / distance
          const touchesWood = !particle.front && particle.phase > Math.PI * .44
          const margin = 2 + particle.sprite.size * .18
          const near = 1 - smooth((distance - current.radius - margin) / (current.radius * .14))
          const outerSurface = smooth((distance - current.innerRadius) / (current.radius * .14))
          const influence = touchesWood ? near * outerSurface * Math.min(1, current.strength / 40) : 0
          if (influence > .001) {
            const side = Math.abs(dx) > current.radius * .055 ? Math.sign(dx) : particle.side
            if (!particle.rimContact && influence > .55 && ny > -.25) {
              particle.rimContact = true
              particle.contactKick = 9 + (Math.sin(particle.phase * 3) + 1) * 8
            }
            particle.contactKick = (particle.contactKick || 0) * Math.exp(-dt * 4.5)
            const variation = .88 + Math.sin(particle.phase + particle.age * 2.1) * .12
            const slide = (particle.speed * .82 + current.strength * .38) * variation + particle.contactKick
            const repel = Math.min(100, Math.max(0, current.radius + margin - distance) * 6)
            const flowX = side * ny * slide + nx * repel
            const flowY = -side * nx * slide + ny * repel - 6
            const carry = 1 - Math.exp(-dt * influence * 5.2)
            particle.vx += (flowX + particle.current * .5 - particle.vx) * carry
            particle.vy += (flowY - particle.vy) * carry
          }
        } else if (current.mode !== 'split') {
          // A broad annulus carries the air with the surrounding water. No
          // particle is attached to a ring; buoyancy continues through the flow.
          const influence = smooth((band - .55) / .35) * (1 - smooth((band - 1.05) / .65))
          if (influence > .0001 && distance > 0) {
            const tangentX = -dy / distance * current.direction
            const tangentY = dx / distance * current.direction
            const carry = 1 - Math.exp(-dt * influence * Math.min(1, current.strength / 45) * 1.6)
            particle.vx += (particle.current + tangentX * current.strength - particle.vx) * carry
            particle.vy += (tangentY * current.strength - particle.speed * .45 - particle.vy) * carry
          }
        }
      }
      particle.x += particle.vx * dt
      particle.y += particle.vy * dt
      if (particle.age >= particle.life || particle.y < -30 || particle.x < -60 || particle.x > width + 60) particles.splice(index, 1)
    }
    paint()
    if (emitter.rate > 0 || particles.length) frame = requestAnimationFrame(tick)
    else lastTime = 0
  }

  function wake() {
    if (!disposed && active && !document.hidden && !frame && (emitter.rate > 0 || particles.length)) {
      lastTime = 0
      frame = requestAnimationFrame(tick)
    }
  }

  function resize(nextWidth, nextHeight) {
    if (disposed) return
    const nextRatio = Math.min(window.devicePixelRatio || 1, 1.5)
    const nextW = Math.max(1, Math.round(number(nextWidth, width)))
    const nextH = Math.max(1, Math.round(number(nextHeight, height)))
    if (nextW === width && nextH === height && nextRatio === ratio) return
    if (width > 1 && height > 1) {
      particles.forEach(particle => { particle.x *= nextW / width; particle.y *= nextH / height })
    }
    width = nextW; height = nextH; ratio = nextRatio
    layers.forEach(({ canvas }) => { canvas.width = Math.round(width * ratio); canvas.height = Math.round(height * ratio) })
    paint()
  }

  document.addEventListener('visibilitychange', () => {
    cancelAnimationFrame(frame); frame = 0; lastTime = 0
    wake()
  }, { signal: controller.signal })
  resize(host.clientWidth || innerWidth, host.clientHeight || innerHeight)

  return {
    resize,
    setEmitter(options = {}) {
      if (disposed) return
      emitter = describe(options)
      if (!emitter.rate) emission = 0
      wake()
    },
    setCurrent(options = null) {
      if (disposed) return
      current = options && number(options.radius) > 0 ? {
        x: number(options.x), y: number(options.y),
        radius: Math.max(1, options.radius),
        innerRadius: Math.max(1, number(options.innerRadius, options.radius * .79)),
        rotation: number(options.rotation),
        strength: clamp(number(options.strength), 0, 140),
        mode: options.mode === 'split' ? 'split' : 'vortex',
        direction: options.clockwise === false ? -1 : 1,
      } : null
      wake()
    },
    burst(options = {}) {
      if (disposed) return
      const source = describe({ ...options, shape: options.shape || 'rim' })
      const count = clamp(Math.round(number(options.count)), 0, cap)
      for (let index = 0; index < count; index++) spawn(source)
      wake()
    },
    setActive(value) {
      if (disposed || active === Boolean(value)) return
      active = Boolean(value)
      layers.forEach(({ canvas }) => { canvas.hidden = !active })
      cancelAnimationFrame(frame); frame = 0; lastTime = 0
      if (active) { paint(); wake() }
    },
    clear() {
      if (disposed) return
      particles.length = 0; emission = 0
      cancelAnimationFrame(frame); frame = 0; lastTime = 0
      paint()
      wake()
    },
    destroy() {
      if (disposed) return
      disposed = true
      controller.abort()
      cancelAnimationFrame(frame)
      particles.length = 0
      sprites.clear()
      layers.forEach(({ canvas }) => canvas.remove())
      if (originalCount === null) host.removeAttribute('data-bubble-count')
      else host.setAttribute('data-bubble-count', originalCount)
    },
  }
}
