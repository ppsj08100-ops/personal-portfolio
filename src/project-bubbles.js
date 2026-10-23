const BUBBLE_HOST = '.project-overview__scene, .sail-project__screen, .sail-project__figure'

/** Quiet bubbles behind a single exhibition scene. Each scene owns its lifecycle. */
export function initProjectBubbles(section, { host = section?.querySelector(BUBBLE_HOST) } = {}) {
  if (!section || !host) return () => {}

  const canvas = document.createElement('canvas')
  canvas.className = 'project-bubbles'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.hidden = true
  const context = canvas.getContext('2d', { alpha: true })
  if (!context) return () => {}

  // A negative layer keeps the water effect behind opaque devices and images.
  host.prepend(canvas)
  const hadHostClass = host.classList.contains('has-project-bubbles')
  host.classList.add('has-project-bubbles')

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const events = new AbortController()
  const ancestors = []
  for (let ancestor = section; ancestor; ancestor = ancestor.parentElement) ancestors.push(ancestor)

  let width = 0
  let height = 0
  let visible = false
  let frame = 0
  let previousTime = 0
  let destroyed = false
  let particles = []

  // Fixed seeds avoid a distracting rearrangement when the viewport changes.
  const fraction = (value) => value - Math.floor(value)
  const random = (seed) => fraction(Math.sin(seed * 127.1 + 311.7) * 43758.5453)
  const lanes = [0.055, 0.17, 0.86, 0.97]

  const canAnimate = () => visible && !document.hidden && !motion.matches &&
    !section.closest('[inert]') && !section.classList.contains('is-overview-open') && host.isConnected

  function makeParticles() {
    const count = width < 500 ? 9 : 15
    particles = Array.from({ length: count }, (_, index) => {
      const seed = index + 1
      return {
        lane: lanes[index % lanes.length] + (random(seed + 10) - 0.5) * 0.035,
        progress: random(seed + 20),
        radius: 1.35 + random(seed + 30) * (width < 500 ? 1.9 : 2.8),
        speed: 10 + random(seed + 40) * 11,
        sway: 3 + random(seed + 50) * 7,
        phase: random(seed + 60) * Math.PI * 2,
        opacity: 0.32 + random(seed + 70) * 0.27,
      }
    })
  }

  function draw(delta = 0) {
    context.clearRect(0, 0, width, height)
    for (const bubble of particles) {
      bubble.progress = (bubble.progress + delta * bubble.speed / Math.max(height, 1)) % 1
      const progress = bubble.progress
      const x = width * bubble.lane + Math.sin(progress * 7 + bubble.phase) * bubble.sway
      const y = height * (1.045 - progress * 1.12)
      const fade = Math.min(1, progress * 9, (1 - progress) * 8)
      const alpha = bubble.opacity * Math.max(0, fade)
      const radius = bubble.radius * (0.88 + progress * 0.18)
      if (alpha < 0.01) continue

      context.save()
      context.translate(x, y)
      context.scale(0.92, 1.04)

      const rim = context.createLinearGradient(-radius, -radius, radius, radius)
      rim.addColorStop(0, `rgba(205, 231, 246, ${alpha})`)
      rim.addColorStop(0.45, `rgba(130, 181, 213, ${alpha * 0.55})`)
      rim.addColorStop(0.78, `rgba(72, 124, 164, ${alpha * 0.24})`)
      rim.addColorStop(1, `rgba(174, 207, 231, ${alpha * 0.72})`)
      context.strokeStyle = rim
      context.lineWidth = 0.7
      context.beginPath()
      context.arc(0, 0, radius, 0, Math.PI * 2)
      context.stroke()

      // A short upper glint gives a transparent bubble, rather than a solid dot.
      context.strokeStyle = `rgba(228, 241, 250, ${alpha * 0.78})`
      context.lineWidth = 0.8
      context.lineCap = 'round'
      context.beginPath()
      context.arc(-0.15, -0.1, radius * 0.71, Math.PI * 1.05, Math.PI * 1.4)
      context.stroke()
      context.restore()
    }
  }

  function tick(time) {
    frame = 0
    if (destroyed || !canAnimate()) return sync()
    const delta = previousTime ? Math.min((time - previousTime) / 1000, 0.05) : 0
    previousTime = time
    draw(delta)
    frame = requestAnimationFrame(tick)
  }

  function sync() {
    if (destroyed) return
    const active = width > 0 && height > 0 && canAnimate()
    canvas.hidden = !active
    if (active && !frame) {
      previousTime = 0
      draw()
      frame = requestAnimationFrame(tick)
    } else if (!active) {
      cancelAnimationFrame(frame)
      frame = 0
      previousTime = 0
    }
  }

  function resize() {
    if (destroyed) return
    const nextWidth = Math.round(host.clientWidth * (innerWidth <= 520 ? 1.08 : 1.18))
    const nextHeight = Math.round(host.clientHeight * 1.12)
    if (width === nextWidth && height === nextHeight) return sync()
    width = nextWidth
    height = nextHeight
    const scale = Math.min(window.devicePixelRatio || 1, 1.75)
    canvas.width = Math.max(1, Math.round(width * scale))
    canvas.height = Math.max(1, Math.round(height * scale))
    context.setTransform(scale, 0, 0, scale, 0, 0)
    makeParticles()
    sync()
  }

  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio > 0.08
    sync()
  }, { threshold: [0, 0.08, 0.1] })
  intersection.observe(section)

  const attributes = new MutationObserver(sync)
  for (const ancestor of ancestors) {
    attributes.observe(ancestor, {
      attributes: true,
      attributeFilter: ancestor === section ? ['inert', 'class'] : ['inert'],
    })
  }

  const dimensions = new ResizeObserver(resize)
  dimensions.observe(host)
  document.addEventListener('visibilitychange', sync, { signal: events.signal })
  window.addEventListener('resize', resize, { passive: true, signal: events.signal })
  motion.addEventListener('change', sync, { signal: events.signal })
  resize()

  return () => {
    if (destroyed) return
    destroyed = true
    cancelAnimationFrame(frame)
    events.abort()
    intersection.disconnect()
    attributes.disconnect()
    dimensions.disconnect()
    canvas.remove()
    if (!hadHostClass) host.classList.remove('has-project-bubbles')
    particles = []
  }
}
