import { getDiveFoamSprites } from './dive-foam-sprites.js'

const DURATION = 1750
const SCROLL_DELAY = .22
const SCROLL_DURATION = 1.18
const TAU = Math.PI * 2
const random = (min, max) => min + Math.random() * (max - min)
const smooth = (start, end, value) => {
  const t = Math.max(0, Math.min(1, (value - start) / (end - start)))
  return t * t * (3 - 2 * t)
}
const gaussian = () => Math.sqrt(-2 * Math.log(Math.max(.00001, Math.random()))) * Math.cos(random(0, TAU))
const easeDive = value => value < .5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2

function makeBubbles(width, origin) {
  const particles = []
  const scale = Math.min(1, Math.max(.72, width / 700))
  const coreCount = width < 600 ? 160 : 210

  function addBubble(outer = false, anchor = false) {
    let dx = gaussian() * (outer ? 66 : 29) * scale
    let dy = gaussian() * (outer ? 26 : 15) * scale
    const limit = (outer ? 142 : 82) * scale
    const distance = Math.hypot(dx, dy)
    if (distance > limit) { dx *= limit / distance; dy *= limit / distance }
    const radius = anchor ? random(4, 6.5) : Math.random() < .16 ? random(2.8, 4.7) : random(.7, 2.6)
    const drift = random(-2, 3)
    particles.push({
      x: origin.x + dx,
      y: origin.y + dy,
      delay: anchor ? random(0, .055) : random(.015, .28),
      life: random(1.12, 1.58),
      rise: (20 + radius * 5.3) * scale,
      drift,
      bend: (drift < 0 ? -1 : 1) * random(.08, .26),
      aspect: random(.96, 1.04),
      radius: Math.max(1.1, radius * scale),
      opacity: anchor ? random(.65, .82) : outer ? random(.16, .3) : random(.3, .58),
    })
  }

  // The dense center is attached to the cue. Only a few softer bubbles occupy
  // the surrounding water; nothing is emitted across the viewport edges.
  for (let i = 0; i < coreCount; i++) addBubble()
  for (let i = 0; i < 18; i++) addBubble(true)
  for (let i = 0; i < 12; i++) addBubble(false, true)
  return particles
}

export function startDiveFoam(link, target, onComplete) {
  const sprites = getDiveFoamSprites()
  if (!sprites) return null
  const canvas = document.createElement('canvas')
  let context
  try {
    context = canvas.getContext('2d', { alpha: true })
  } catch {
    return null
  }
  if (!context) return null

  const width = innerWidth
  const height = innerHeight
  const ratio = Math.min(devicePixelRatio || 1, 2)
  const startScroll = scrollY
  const bounds = (link.querySelector('.hero__scroll-label') ?? link).getBoundingClientRect()
  const origin = { x: bounds.left + bounds.width / 2, y: bounds.bottom + startScroll + 10 }
  const bubbles = makeBubbles(width, origin)
  const controller = new AbortController()
  canvas.className = 'hero-dive-foam'
  canvas.setAttribute('aria-hidden', 'true')
  canvas.width = Math.ceil(width * ratio)
  canvas.height = Math.ceil(height * ratio)
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.imageSmoothingQuality = 'high'
  document.body.append(canvas)
  link.classList.add('is-diving')

  const started = performance.now()
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
    canvas.remove()
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

    context.clearRect(0, 0, width, height)
    const camera = scrollY
    const fade = 1 - smooth(1.28, DURATION / 1000, elapsed)
    for (const bubble of bubbles) {
      const age = elapsed - bubble.delay
      if (age < 0 || age > bubble.life) continue
      const alpha = smooth(0, .16, age) * (1 - smooth(bubble.life * .58, bubble.life, age)) * bubble.opacity * fade
      if (alpha < .005) continue
      // A slight, one-way bend carries each bubble with the current. Keep its
      // size and aspect fixed so the fine rim does not shimmer as it rises.
      const x = bubble.x + bubble.drift * age + bubble.bend * age * age
      // World-space particles travel with the button as the camera descends.
      const y = bubble.y - camera - bubble.rise * age
      const size = bubble.radius * 2 * (32 / 26)
      if (y < -size || y > height + size) continue
      const stretch = bubble.aspect
      context.globalAlpha = alpha
      context.drawImage(sprites.bubble, x - size * stretch / 2, y - size / stretch / 2, size * stretch, size / stretch)
    }

    context.globalAlpha = 1
    if (now - started >= DURATION) stop(true)
    else frame = requestAnimationFrame(render)
  }

  window.addEventListener('resize', () => {
    if (innerWidth !== width) stop(true)
  }, { signal: controller.signal })
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop(true)
  }, { signal: controller.signal })
  canvas.addEventListener('contextlost', () => stop(true), { signal: controller.signal })
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
