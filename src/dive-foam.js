import { getDiveFoamSprites } from './dive-foam-sprites.js'

const DURATION = 2900
const SCROLL_DELAY = .7
const SCROLL_DURATION = 1.55
const TAU = Math.PI * 2
const random = (min, max) => min + Math.random() * (max - min)
const smooth = (start, end, value) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}
const easeDive = value => smooth(0, 1, value)

function makeBubbles(width, origin, labelWidth, labelHeight) {
  const particles = []
  const scale = Math.min(1, Math.max(.72, width / 700))
  const compact = width < 600
  const pixelRatio = devicePixelRatio || 1
  const align = value => Math.round(value * pixelRatio) / pixelRatio
  const groups = [
    { name: 'near', count: compact ? 88 : 112, parallax: 1 },
    { name: 'middle', count: compact ? 144 : 196, parallax: .48 },
    { name: 'outer', count: compact ? 60 : 92, parallax: .2 },
    { name: 'falling', count: compact ? 112 : 160, parallax: 0 },
  ]

  for (const group of groups) {
    const near = group.name === 'near'
    const outer = group.name === 'outer'
    const falling = group.name === 'falling'
    for (let i = 0; i < group.count; i++) {
      const angle = (i + random(.1, .9)) / group.count * TAU
      const band = outer ? random(.85, 1.12) : random(.55, 1.05)
      const radiusX = near ? labelWidth / 2 + random(10, 30) : Math.min(width * (falling ? .35 : .33), falling ? 230 : 205)
      const radiusY = near ? labelHeight / 2 + random(10, 25) : compact ? 42 : 54
      const x = Math.cos(angle) * radiusX * (near ? 1 : band)
      let y = falling ? random(-78, 24) * scale : Math.sin(angle) * radiusY * (near ? 1 : band)
      const size = align(Math.max(6, random(near ? 6 : 6.5, near ? 9 : 12) * scale))
      const spreadX = Math.cos(angle) * (near ? random(6, 18) : falling ? random(14, 58) : outer ? random(65, 110) : random(34, 76)) * scale
      const spreadY = falling ? random(70, 145) * scale : Math.sin(angle) * (near ? random(7, 17) : outer ? random(30, 65) : random(20, 46)) * scale
      const rise = (near ? random(3, 7) : random(12, 24)) * scale
      const life = near ? random(2.25, 2.5) : falling ? random(2.15, 2.4) : random(2, 2.4)
      const opacity = near ? random(.26, .5) : falling ? random(.22, .42) : outer ? random(.15, .3) : random(.23, .46)
      const keyframes = Array.from({ length: 25 }, (_, step) => {
        const progress = step / 24
        const age = progress * life
        const travel = smooth(0, falling ? life : 1.8, age)
        const buoyancy = smooth(.75, 2.6, age)
        const dx = spreadX * travel
        const dy = spreadY * travel - (falling ? 0 : rise * buoyancy)
        return {
          offset: progress,
          opacity: smooth(0, .48, age) * (1 - smooth(falling ? .7 : .62, 1, progress)) * opacity,
          transform: `translate3d(${dx}px, ${dy}px, 0)`,
          dy,
        }
      })

      // The close group follows the lettering through the dive. Keep its
      // whole journey outside the glyphs, including the soft lower flow.
      const clearance = labelHeight / 2 + size / 2 + (near ? 4 : 8)
      if (Math.abs(x) < labelWidth / 2 + size / 2 + (near ? 4 : 8)) {
        const offsets = keyframes.map(keyframe => keyframe.dy)
        if (y < 0) y = Math.min(y, -clearance - Math.max(...offsets))
        else y = Math.max(y, clearance - Math.min(...offsets))
      }
      if (near) y += (y < 0 ? -1 : 1) * random(0, 12)
      particles.push({
        group: group.name,
        x: align(origin.x + x - size / 2),
        y: align(origin.y + y - size / 2),
        size,
        delay: near ? random(0, .3) : random(.04, .46),
        life,
        keyframes: keyframes.map(({ dy, ...keyframe }) => keyframe),
      })
    }
  }

  return { particles, groups }
}

export function startDiveFoam(link, target, onComplete) {
  const sprites = getDiveFoamSprites()
  if (!sprites) return null
  const width = innerWidth
  const startScroll = scrollY
  const bounds = (link.querySelector('.hero__scroll-label') ?? link).getBoundingClientRect()
  const origin = { x: bounds.left + bounds.width / 2, y: bounds.top + bounds.height / 2 }
  const { particles, groups } = makeBubbles(width, origin, bounds.width, bounds.height)
  const controller = new AbortController()
  const layer = document.createElement('div')
  layer.className = 'hero-dive-foam'
  layer.setAttribute('aria-hidden', 'true')
  const fields = new Map(groups.map(group => {
    const element = document.createElement('div')
    element.className = 'hero-dive-foam__field'
    element.dataset.depth = group.name
    layer.append(element)
    return [group.name, { element, parallax: group.parallax }]
  }))
  const spriteURL = sprites.restingBubble.toDataURL()
  const animations = particles.map(particle => {
    const element = document.createElement('img')
    element.className = 'hero-dive-foam__particle'
    element.src = spriteURL
    element.alt = ''
    element.draggable = false
    Object.assign(element.style, {
      left: `${particle.x}px`,
      top: `${particle.y}px`,
      width: `${particle.size}px`,
      height: `${particle.size}px`,
    })
    fields.get(particle.group).element.append(element)
    const animation = element.animate(particle.keyframes, {
      duration: particle.life * 1000,
      delay: particle.delay * 1000,
      fill: 'both',
      easing: 'linear',
    })
    animation.pause()
    return animation
  })
  document.body.append(layer)
  link.classList.add('is-diving')

  const started = performance.now()
  animations.forEach(animation => animation.play())
  let frame = 0
  let finishFrame = 0
  let stopped = false
  let focused = false

  function stop(jumpToTarget = false) {
    if (stopped) {
      if (!jumpToTarget && finishFrame) {
        cancelAnimationFrame(finishFrame)
        finishFrame = 0
        controller.abort()
        onComplete()
      }
      return
    }
    stopped = true
    cancelAnimationFrame(frame)
    animations.forEach(animation => animation.cancel())
    layer.remove()
    link.classList.remove('is-diving')
    if (jumpToTarget && target.isConnected) {
      // Let the page's motion-preference handlers finish restoring layout
      // before aligning the destination, so their cleanup cannot undo it.
      finishFrame = requestAnimationFrame(() => {
        finishFrame = requestAnimationFrame(() => {
          finishFrame = 0
          controller.abort()
          if (target.isConnected) {
            target.focus({ preventScroll: true })
            target.scrollIntoView({ behavior: 'instant', block: 'start' })
          }
          onComplete()
        })
      })
    } else {
      controller.abort()
      onComplete()
    }
  }

  function render(now) {
    if (stopped) return
    if (!target.isConnected) { stop(); return }
    const elapsed = (now - started) / 1000

    if (elapsed >= SCROLL_DELAY) {
      if (!focused) { target.focus({ preventScroll: true }); focused = true }
      const progress = Math.min(1, (elapsed - SCROLL_DELAY) / SCROLL_DURATION)
      const destination = target.getBoundingClientRect().top + scrollY
      window.scrollTo({ top: startScroll + (destination - startScroll) * easeDive(progress), behavior: 'instant' })
    }

    const cameraTravel = scrollY - startScroll
    const fade = 1 - smooth(2, DURATION / 1000, elapsed)
    layer.style.opacity = `${fade}`
    for (const { element, parallax } of fields.values()) {
      element.style.transform = `translate3d(0, ${-cameraTravel * parallax}px, 0)`
    }

    if (now - started >= DURATION) stop(true)
    else frame = requestAnimationFrame(render)
  }

  window.addEventListener('resize', () => {
    if (innerWidth !== width) stop(true)
  }, { signal: controller.signal })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(true)
  }, { signal: controller.signal })
  window.addEventListener('wheel', () => stop(), { passive: true, signal: controller.signal })
  window.addEventListener('pointerdown', event => {
    if (!link.contains(event.target)) stop()
  }, { passive: true, signal: controller.signal })
  window.addEventListener('touchstart', () => stop(), { passive: true, signal: controller.signal })
  window.addEventListener('keydown', event => {
    if (['Escape', 'Tab', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) stop()
  }, { signal: controller.signal })
  frame = requestAnimationFrame(render)
  return { stop }
}
