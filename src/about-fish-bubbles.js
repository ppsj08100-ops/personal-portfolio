import './about-fish-bubbles.css'

const empty = () => ({ update() {}, resize() {}, setVisible() {}, destroy() {} })
const clamp = (value, low = 0, high = 1) => Math.max(low, Math.min(high, value))
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }
const fraction = value => value - Math.floor(value)
const varied = (index, salt = 0) => fraction(Math.sin(index * 127.1 + salt * 311.7) * 43758.5453)

// Small bubbles share the fish's existing clock, then rise independently from
// their emission point. The fish renderer and swimming poses stay untouched.
export function createAboutFishBubbles(layer) {
  if (!layer) return empty()
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) return empty()
  canvas.className = 'about-fish-bubbles'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.setAttribute('role', 'presentation')
  canvas.hidden = true
  layer.append(canvas)

  const particles = Array.from({ length: 20 }, () => ({ active: false }))
  const emitters = [0, 1].map(index => ({ index, sequence: 0, until: .16 + index * .19, previous: null }))
  let width = 0
  let height = 0
  let ratio = 1
  let visible = false
  let disposed = false

  function clear() {
    context.setTransform(1, 0, 0, 1, 0, 0)
    context.clearRect(0, 0, canvas.width, canvas.height)
    canvas.dataset.bubbleCount = '0'
  }

  function reset() {
    particles.forEach(particle => { particle.active = false })
    emitters.forEach(emitter => {
      emitter.until = .16 + emitter.index * .19
      emitter.previous = null
    })
    clear()
  }

  function retire(owner) {
    particles.forEach(particle => { if (particle.owner === owner) particle.active = false })
  }

  function transformed(pose, x, y) {
    const angle = pose.angle * Math.PI / 180
    const cosine = Math.cos(angle), sine = Math.sin(angle)
    return { x: pose.x + x * cosine - y * sine, y: pose.y + x * sine + y * cosine }
  }

  function nose(pose, index) {
    return transformed(pose, 0, pose.height * ((index ? .85 : .865) - .5))
  }

  function emit(emitter, pose) {
    const start = emitter.index * 10
    const particle = particles.slice(start, start + 10).find(item => !item.active)
    if (!particle) return
    const serial = emitter.sequence++ + emitter.index * 41
    const side = serial % 2 ? -1 : 1
    const nearHead = serial % 3 === 0
    const x = side * pose.width * (nearHead ? .09 + varied(serial, 1) * .07 : .24 + varied(serial, 1) * .08)
    const y = pose.height * (nearHead ? .30 + varied(serial, 2) * .025 : .08 + varied(serial, 2) * .15)
    const source = transformed(pose, x, y)
    if (source.x < 4 || source.x > width - 4 || source.y < 4 || source.y > height - 4) return
    Object.assign(particle, {
      active: true, owner: emitter.index, x: source.x, y: source.y,
      age: 0, lifetime: 2.5 + varied(serial, 3) * 1.0,
      radius: 1.5 + varied(serial, 4) * 2.1,
      drift: side * (2 + varied(serial, 5) * 3),
      speed: 17 + varied(serial, 6) * 9,
      phase: varied(serial, 7) * Math.PI * 2,
      opacity: pose.opacity * (.30 + varied(serial, 8) * .18),
    })
  }

  function draw() {
    clear()
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    let count = 0
    particles.forEach(particle => {
      if (!particle.active) return
      count++
      const progress = particle.age / particle.lifetime
      const fade = smooth(progress / .16) * (1 - smooth((progress - .58) / .42))
      const alpha = particle.opacity * fade
      const radius = particle.radius * (.86 + progress * .14)
      const x = particle.x + Math.sin(particle.phase + particle.age * 1.35) * 2
      context.strokeStyle = `rgba(183,222,239,${alpha})`
      context.lineWidth = .65
      context.beginPath()
      context.arc(x, particle.y, radius, 0, Math.PI * 2)
      context.stroke()
      context.strokeStyle = `rgba(228,246,252,${alpha * .78})`
      context.lineWidth = .6
      context.beginPath()
      context.arc(x, particle.y, radius * .78, Math.PI * 1.1, Math.PI * 1.52)
      context.stroke()
    })
    canvas.dataset.bubbleCount = String(count)
  }

  return {
    update(poses, deltaSeconds = 0) {
      if (disposed || !visible || !width || !height) return
      if (!poses?.length) { reset(); return }
      // Scroll jumps and resumed tabs must not leave an old stream elsewhere.
      if (deltaSeconds > .2) reset()
      const delta = clamp(deltaSeconds, 0, .06)
      const active = emitters.map(emitter => {
        const pose = poses[emitter.index]
        const valid = pose && pose.opacity > .025 && pose.width > 0 && pose.height > 0
          && pose.x + pose.width > 0 && pose.x - pose.width < width
          && pose.y + pose.height > 0 && pose.y - pose.height < height
        if (!valid) {
          retire(emitter.index)
          emitter.previous = null
          emitter.until = .16 + emitter.index * .19
          return null
        }
        const head = nose(pose, emitter.index)
        const previous = emitter.previous
        const jump = Math.max(90, Math.min(width, height) * .16, pose.height * .35)
        if (previous && Math.hypot(head.x - previous.x, head.y - previous.y) > jump) {
          retire(emitter.index)
          emitter.until = .16 + emitter.index * .19
        }
        emitter.previous = head
        if (delta > 0) {
          emitter.until -= delta
          if (emitter.until <= 0) {
            emit(emitter, pose)
            emitter.until = .45 + varied(emitter.sequence + emitter.index * 41, 9) * .30
          }
        }
        return { pose, head }
      })
      particles.forEach(particle => {
        if (!particle.active) return
        const source = active[particle.owner]
        if (!source) { particle.active = false; return }
        particle.age += delta
        particle.x += particle.drift * delta
        particle.y -= particle.speed * delta
        particle.opacity = Math.min(particle.opacity, source.pose.opacity * .48)
        if (particle.age >= particle.lifetime || particle.y < -8
          || Math.hypot(particle.x - source.head.x, particle.y - source.head.y) > Math.max(110, source.pose.height * .65)) {
          particle.active = false
        }
      })
      draw()
    },
    resize(nextWidth, nextHeight) {
      if (disposed) return
      width = Math.max(0, nextWidth)
      height = Math.max(0, nextHeight)
      ratio = Math.min(window.devicePixelRatio || 1, 1.5)
      canvas.width = Math.max(1, Math.round(width * ratio))
      canvas.height = Math.max(1, Math.round(height * ratio))
      reset()
    },
    setVisible(value) {
      if (disposed || visible === value) return
      visible = !!value
      canvas.hidden = !visible
      if (!visible) reset()
    },
    destroy() {
      if (disposed) return
      disposed = true
      reset()
      canvas.remove()
    },
  }
}
