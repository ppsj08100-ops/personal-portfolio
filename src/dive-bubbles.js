import { getDiveFoamSprites } from './dive-foam-sprites.js'

const REST_COUNT = 44
const EXTRA_COUNT = 12
const seed = value => {
  const result = Math.sin(value * 127.1 + 311.7) * 43758.5453
  return result - Math.floor(result)
}
const smooth = value => {
  const t = Math.max(0, Math.min(1, value))
  return t * t * (3 - 2 * t)
}

// A continuous, softly staggered stream stays close to the invitation.
// Each bubble follows one slow curve with a stable shape, without wobbling.
export function initDiveBubbles(link) {
  const dock = link.closest('.hero__scroll-dock')
  const label = link.querySelector('.hero__scroll-label')
  const sprites = getDiveFoamSprites()
  if (!dock || !label || !sprites) return () => {}
  const canvas = document.createElement('canvas')
  let context
  try { context = canvas.getContext('2d', { alpha: true }) } catch { return () => {} }
  if (!context) return () => {}
  canvas.className = 'hero-dive-bubbles'
  canvas.setAttribute('aria-hidden', 'true')
  dock.prepend(canvas)

  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const bubbles = Array.from({ length: REST_COUNT + EXTRA_COUNT }, (_, i) => ({
    side: i % 3 === 0 ? 0 : i % 2 ? -1 : 1,
    offset: seed(i + 31),
    radius: 2.1 + seed(i + 73) * 2.4,
    duration: 4.2 + seed(i + 11) * 2,
    rest: .15 + seed(i + 19) * .45,
    phase: seed(i + 53),
    drift: (seed(i + 41) - .5) * 8,
    bend: (seed(i + 83) - .5) * 3,
    aspect: .97 + seed(i + 101) * .06,
    opacity: .52 + seed(i + 97) * .4,
    extra: i >= REST_COUNT,
  }))
  let width = 0
  let height = 0
  let labelWidth = 0
  let labelHeight = 0
  let frame = 0
  let lastTick = 0
  let elapsed = 0
  let invitationTime = 0
  let attention = 0
  let hovered = false
  let focused = false
  let visible = false
  let disposed = false

  function draw(time) {
    context.clearRect(0, 0, width, height)
    const cx = width / 2
    const cy = height / 2
    const still = reduced.matches
    const count = still ? 3 : bubbles.length

    for (let i = 0; i < count; i++) {
      const bubble = bubbles[i]
      const period = bubble.duration + bubble.rest
      const extraAge = invitationTime - (i - REST_COUNT) * .3
      if (bubble.extra && extraAge < 0) continue
      const age = bubble.extra ? extraAge % period : (time + bubble.phase * period) % period
      if (!still && age > bubble.duration) continue
      const progress = still ? [.25, .62, .44][i] : age / bubble.duration
      const envelope = still ? .75 : smooth(progress / .18) * (1 - smooth((progress - .72) / .28))
      const alpha = envelope * bubble.opacity * (bubble.extra ? attention : 1)
      if (alpha < .005) continue

      // The side bubbles can rise above the type. Center bubbles dissolve
      // below it, keeping the lettering clear and the activity close by.
      const side = bubble.side
      const originX = side
        ? side * (labelWidth / 2 + 12 + bubble.offset * 20)
        : (bubble.offset - .5) * labelWidth * .55
      const originY = labelHeight / 2 + 54 + bubble.offset * 12
      const rise = side ? 92 + bubble.offset * 18 : 38 + bubble.offset * 12
      const drift = bubble.drift * progress + bubble.bend * progress * (1 - progress)
      const x = cx + originX + drift
      const y = cy + originY - rise * (.88 * progress + .12 * progress * progress)
      const stretch = bubble.aspect
      const size = bubble.radius * 2 * (32 / 26)
      context.globalAlpha = alpha
      context.drawImage(sprites.bubble, x - size * stretch / 2, y - size / stretch / 2, size * stretch, size / stretch)
    }
    context.globalAlpha = 1
  }

  function render(now) {
    frame = 0
    if (disposed || !visible || document.hidden || reduced.matches) return
    const delta = lastTick ? Math.min(.1, (now - lastTick) / 1000) : 0
    lastTick = now
    elapsed += delta
    attention += ((hovered || focused ? 1 : 0) - attention) * (1 - Math.exp(-delta * 3))
    invitationTime = hovered || focused || attention > .01 ? invitationTime + delta : 0
    // Paint on every display frame. Throttling these small, slow highlights
    // made their subpixel movement visibly step between positions.
    draw(elapsed)
    frame = requestAnimationFrame(render)
  }
  function sync() {
    cancelAnimationFrame(frame)
    frame = 0
    lastTick = 0
    if (!disposed && reduced.matches) draw(0)
    if (!disposed && visible && !document.hidden && !reduced.matches) {
      frame = requestAnimationFrame(render)
    }
  }
  function resize() {
    const textBounds = label.getBoundingClientRect()
    const dockBounds = dock.getBoundingClientRect()
    labelWidth = textBounds.width
    labelHeight = textBounds.height
    canvas.style.left = `${textBounds.left + textBounds.width / 2 - dockBounds.left}px`
    canvas.style.top = `${textBounds.top + textBounds.height / 2 - dockBounds.top}px`
    const bounds = canvas.getBoundingClientRect()
    width = bounds.width
    height = bounds.height
    const ratio = Math.min(devicePixelRatio || 1, 2)
    canvas.width = Math.ceil(width * ratio)
    canvas.height = Math.ceil(height * ratio)
    context.setTransform(ratio, 0, 0, ratio, 0, 0)
    context.imageSmoothingQuality = 'high'
    draw(elapsed)
  }
  const sizeObserver = new ResizeObserver(resize)
  sizeObserver.observe(canvas)
  sizeObserver.observe(label)
  sizeObserver.observe(link)
  const observer = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    sync()
  })
  observer.observe(link)
  link.addEventListener('pointerenter', event => { hovered = event.pointerType !== 'touch' }, { signal })
  link.addEventListener('pointerleave', () => { hovered = false }, { signal })
  link.addEventListener('focus', () => { focused = true }, { signal })
  link.addEventListener('blur', () => { focused = false }, { signal })
  reduced.addEventListener('change', sync, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  resize()

  return () => {
    disposed = true
    controller.abort()
    observer.disconnect()
    sizeObserver.disconnect()
    cancelAnimationFrame(frame)
    canvas.remove()
  }
}
