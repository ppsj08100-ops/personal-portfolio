import { getDiveFoamSprites } from './dive-foam-sprites.js'

const NEAR_COUNT = 36
const REST_COUNT = 116
const EXTRA_COUNT = 18
const STILL_COUNT = 6
const seed = value => {
  const result = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return result - Math.floor(result)
}
const smooth = value => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

// A broad oval cloud with independent, gently spreading upward journeys.
// Animate static sprites on the compositor so fine rims are not redrawn
// at a different subpixel position on every JavaScript frame.
export function initDiveBubbles(link) {
  const dock = link.closest('.hero__scroll-dock')
  const label = link.querySelector('.hero__scroll-label')
  const sprites = getDiveFoamSprites()
  if (!dock || !label || !sprites) return () => {}

  const layer = document.createElement('div')
  layer.className = 'hero-dive-bubbles'
  layer.setAttribute('aria-hidden', 'true')
  const extraLayer = document.createElement('div')
  extraLayer.className = 'hero-dive-bubbles__extra'
  layer.append(extraLayer)
  dock.prepend(layer)

  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const spriteURL = sprites.restingBubble.toDataURL()
  const bubbles = Array.from({ length: REST_COUNT + EXTRA_COUNT }, (_, i) => {
    const extra = i >= REST_COUNT
    const near = i < NEAR_COUNT
    const count = extra ? EXTRA_COUNT : near ? NEAR_COUNT : REST_COUNT - NEAR_COUNT
    const index = extra ? i - REST_COUNT : near ? i : i - NEAR_COUNT
    const duration = near ? 7.2 + seed(i + 11) * 2.4 : 5.6 + seed(i + 11) * 2.8
    const rest = .35 + seed(i + 19) * .8
    const element = document.createElement('img')
    element.className = 'hero-dive-bubbles__particle'
    element.src = spriteURL
    element.alt = ''
    element.draggable = false
    const animation = element.animate([], { duration: (duration + rest) * 1000, iterations: Infinity })
    animation.pause()
    animation.currentTime = seed(i + 53) * (duration + rest) * 1000
    const parent = extra ? extraLayer : layer
    parent.append(element)
    return {
      element,
      animation,
      near,
      angle: (index + seed(i + 31) * .8) / count * Math.PI * 2,
      offset: seed(i + 67),
      radius: near ? 2.5 + seed(i + 73) * 1.5 : 1.6 + seed(i + 73) ** 1.2 * 3.5,
      duration,
      rest,
      rise: near ? 20 + seed(i + 83) * 10 : 40 + seed(i + 83) * 24,
      drift: near ? 3 + seed(i + 41) * 4 : 12 + seed(i + 41) * 16,
      aspect: .97 + seed(i + 101) * .06,
      opacity: near ? .38 + seed(i + 97) * .3 : .26 + seed(i + 97) * .42,
    }
  })
  let hovered = false
  let focused = false
  let visible = false
  let disposed = false

  function resize() {
    if (disposed) return
    const textBounds = label.getBoundingClientRect()
    const dockBounds = dock.getBoundingClientRect()
    const labelWidth = textBounds.width
    const labelHeight = textBounds.height
    layer.style.left = `${textBounds.left + labelWidth / 2 - dockBounds.left}px`
    layer.style.top = `${textBounds.top + labelHeight / 2 - dockBounds.top}px`
    const { width, height } = layer.getBoundingClientRect()
    const radiusX = Math.min(labelWidth / 2 + 110, width / 2 - 36)
    const radiusY = Math.min(labelHeight / 2 + 42, height / 2 - 40)
    const pixelRatio = devicePixelRatio || 1
    const align = value => Math.round(value * pixelRatio) / pixelRatio

    bubbles.forEach((bubble, i) => {
      const still = reduced.matches
      const angle = still ? i / STILL_COUNT * Math.PI * 2 : bubble.angle
      const band = bubble.near ? .92 + bubble.offset * .18 : .65 + bubble.offset * .4
      const orbitX = bubble.near ? labelWidth / 2 + 24 : radiusX
      const orbitY = bubble.near ? labelHeight / 2 + 20 : radiusY
      const x = orbitX * band * Math.cos(angle)
      let y = orbitY * band * Math.sin(angle)
      const size = bubble.radius * 2 * (32 / 26)
      const bubbleWidth = align(size * bubble.aspect)
      const bubbleHeight = align(size / bubble.aspect)
      let startY = bubble.rise / 2
      let endY = -bubble.rise / 2
      const drift = Math.cos(angle) < 0 ? -bubble.drift : bubble.drift
      const startX = -drift / 2
      const endX = drift / 2

      // Drift stays in one outward direction, with no wobble or size change.
      // Keep the complete diagonal lane clear of the lettering.
      const padding = bubble.near ? 5 : 10
      if (Math.max(0, Math.abs(x) - Math.abs(drift) / 2) < labelWidth / 2 + bubbleWidth / 2 + padding) {
        const clearance = labelHeight / 2 + bubbleHeight / 2 + padding
        if (bubble.near) {
          y = (y < 0 ? -1 : 1) * Math.max(Math.abs(y), clearance + bubble.rise / 2)
        } else if (y >= 0) endY = Math.max(endY, clearance - y)
        else startY = Math.min(startY, -clearance - y)
      }
      bubble.element.hidden = (still && i >= STILL_COUNT) || endY >= startY
      Object.assign(bubble.element.style, {
        left: `${align(width / 2 + x - bubbleWidth / 2)}px`,
        top: `${align(height / 2 + y - bubbleHeight / 2)}px`,
        width: `${bubbleWidth}px`,
        height: `${bubbleHeight}px`,
      })

      const active = bubble.duration / (bubble.duration + bubble.rest)
      const keyframes = Array.from({ length: 21 }, (_, step) => {
        const progress = step / 20
        const opacity = smooth(progress / .24) * (1 - smooth((progress - .65) / .35)) * bubble.opacity
        const translate = startY + (endY - startY) * progress
        const sideways = startX + (endX - startX) * progress
        return { offset: progress * active, opacity, transform: `translate3d(${sideways}px, ${translate}px, 0)` }
      })
      keyframes.push({ offset: 1, opacity: 0, transform: `translate3d(${endX}px, ${endY}px, 0)` })
      bubble.animation.effect.setKeyframes(keyframes)
      if (still) bubble.animation.currentTime = bubble.duration * 500
    })
  }

  function sync() {
    const paused = disposed || !visible || document.hidden || reduced.matches
    layer.classList.toggle('is-inviting', !reduced.matches && (hovered || focused))
    bubbles.forEach(({ animation }) => paused ? animation.pause() : animation.play())
  }
  function motionChanged() {
    if (!reduced.matches) {
      bubbles.forEach((bubble, i) => {
        bubble.animation.currentTime = seed(i + 53) * (bubble.duration + bubble.rest) * 1000
      })
    }
    resize()
    sync()
  }

  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(layer)
  sizeObserver.observe(label)
  sizeObserver.observe(link)
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    sync()
  })
  observer.observe(link)
  link.addEventListener('pointerenter', event => { hovered = event.pointerType !== 'touch'; sync() }, { signal })
  link.addEventListener('pointerleave', () => { hovered = false; sync() }, { signal })
  link.addEventListener('focus', () => { focused = true; sync() }, { signal })
  link.addEventListener('blur', () => { focused = false; sync() }, { signal })
  reduced.addEventListener('change', motionChanged, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  resize()
  sync()

  return () => {
    disposed = true
    controller.abort()
    observer.disconnect()
    sizeObserver.disconnect()
    bubbles.forEach(({ animation }) => animation.cancel())
    layer.remove()
  }
}
