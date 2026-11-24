import { createUnderwaterBubbles } from './underwater-bubbles.js'
import './helm-bubble-current.css'

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (start, end, value) => {
  const t = clamp((value - start) / (end - start))
  return t * t * (3 - 2 * t)
}

/** Quiet air brushes the visible hero helm; turning adds a short pulse.
 * Its denser departing wake continues into the following deep water. */
export function initHelmBubbleCurrent(section) {
  const helm = section?.querySelector('[data-approach-helm]')
  const image = helm?.querySelector('img')
  if (!helm || !image) return () => {}
  const layer = document.createElement('div')
  layer.className = 'helm-bubble-current'
  layer.setAttribute('aria-hidden', 'true')
  layer.hidden = true
  document.body.append(layer)
  const air = createUnderwaterBubbles(layer, { maxParticles: 140, seed: 71 })
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const mobile = matchMedia('(max-width: 767px)')
  const menu = document.querySelector('#portfolio-menu')
  const controller = new AbortController()
  const { signal } = controller
  let frame = 0, updateFrame = 0, lastTime = 0
  let width = 0, height = 0, ratio = 1
  let disposed = false, active = false, burst = false
  let target = 0, strength = 0
  let exitTarget = 0, exitStrength = 0, motion = 0, lastRotation = null
  let lastScrollY = scrollY, lastScrollTime = performance.now()
  let center = { x: 0, y: 0, radius: 1, bottom: 0, width: 0 }

  function size() {
    const nextWidth = document.documentElement.clientWidth
    const nextHeight = innerHeight
    const nextRatio = Math.min(devicePixelRatio || 1, 1.5)
    if (width === nextWidth && height === nextHeight && ratio === nextRatio) return
    width = nextWidth; height = nextHeight; ratio = nextRatio
    air.resize(width, height)
  }

  function paint(now) {
    frame = 0
    if (disposed || !active) return
    const dt = lastTime ? Math.min(.04, (now - lastTime) / 1000) : 1 / 60
    lastTime = now
    strength += (target - strength) * (1 - Math.exp(-dt * 5))
    exitStrength += (exitTarget - exitStrength) * (1 - Math.exp(-dt * 5))
    motion *= Math.exp(-dt * 2.3)
    const rotation = parseFloat(section.style.getPropertyValue('--approach-wheel-turn')) || 0
    if (lastRotation !== null) {
      const change = Math.abs(rotation - lastRotation)
      motion = Math.max(motion, smooth(10, 190, change / dt))
    }
    lastRotation = rotation
    const ambientRate = mobile.matches ? 10 : 14
    const turningRate = mobile.matches ? 26 : 36
    const galleryRate = ambientRate + (turningRate - ambientRate) * motion
    const departingRate = mobile.matches ? 60 : 82
    const rate = (galleryRate + (departingRate - galleryRate) * exitStrength) * strength
    const lowerPlume = center.bottom <= height + 1 && exitStrength > .06
    const emitter = lowerPlume ? {
      x: center.x, y: center.y + center.radius + Math.min(22, center.width * .04),
      width: center.width * .8, height: Math.min(120, height * .13),
      shape: 'plume', rate, velocityY: -30, energy: .85,
    } : {
      x: center.x, y: center.y,
      width: center.radius * 2, height: center.radius * 2,
      shape: 'rim', rate, velocityY: -24, energy: .68,
    }
    air.setEmitter(emitter)
    air.setCurrent({ x: center.x, y: center.y,
      radius: center.radius + Math.min(5, center.width * .01),
      innerRadius: center.radius * .79,
      rotation: rotation * Math.PI / 180,
      strength: (46 + 22 * Math.max(motion, exitStrength)) * strength, mode: 'split' })
    if (!burst && exitTarget > .1 && exitStrength > .18) {
      burst = true
      air.burst({ ...emitter, count: mobile.matches ? 24 : 32 })
    }
    layer.dataset.currentStrength = strength.toFixed(3)
    layer.dataset.emissionRate = rate.toFixed(1)
    layer.dataset.emitterShape = emitter.shape
    layer.dataset.motionPulse = motion.toFixed(3)
    const settling = Math.abs(target - strength) > .002 || Math.abs(exitTarget - exitStrength) > .002 || motion > .005
    if (settling) frame = requestAnimationFrame(paint)
    else {
      lastTime = 0
      if (target < .001) { air.setEmitter({ rate: 0 }); air.setCurrent(null) }
    }
  }

  function update() {
    updateFrame = 0
    if (disposed) return
    size()
    const box = helm.getBoundingClientRect()
    const gallery = section.getBoundingClientRect()
    const pinned = section.classList.contains('is-pinned')
    const hidden = document.hidden || menu?.open || document.body.classList.contains('has-menu-open')
    const mirrorActive = Boolean(document.querySelector('.mirror-current:not([hidden])'))
    const enabled = !reduced.matches && !hidden && !mirrorActive
      && !section.classList.contains('is-helm-zoom-active')
    const leaving = pinned && gallery.bottom < height - .5
    const inRange = enabled && box.width > 0 && box.bottom > -24 && box.top < height + 24
      && (!pinned || gallery.top <= .5)
    const imageWidth = parseFloat(getComputedStyle(image).width) || box.width
    const centerY = box.top + box.height / 2
    const rimRadius = imageWidth * .35
    // The normal gallery shows the upper half. Emit along that visible rim;
    // wait for its lower edge to enter before using the denser departing plume.
    const visible = smooth(0, Math.min(60, height * .08), height - (centerY - rimRadius))
      * smooth(-24, Math.min(105, height * .13), box.bottom)
    target = inRange ? visible : 0
    exitTarget = inRange && leaving ? visible * smooth(0, Math.min(100, height * .13), height - box.bottom) : 0
    center = { x: box.left + box.width / 2, y: box.top + box.height / 2,
      radius: rimRadius, bottom: box.bottom, width: box.width }
    layer.dataset.currentPhase = leaving ? exitTarget > .01 ? 'exit' : 'rim-exit' : 'gallery'
    if (!leaving || box.bottom > height + 1 || reduced.matches) burst = false
    if (!inRange) {
      cancelAnimationFrame(frame); frame = 0; lastTime = 0
      strength = target = exitStrength = exitTarget = motion = 0
      lastRotation = null
      air.setEmitter({ rate: 0 }); air.setCurrent(null)
      air.setActive(false); air.clear()
      active = false
      layer.hidden = true
      return
    }
    active = true
    layer.hidden = false
    air.setActive(true)
    if (!frame && (target > .001 || strength > .004)) frame = requestAnimationFrame(paint)
  }
  function schedule() {
    if (!disposed && !updateFrame) updateFrame = requestAnimationFrame(update)
  }
  function scroll() {
    const now = performance.now()
    const elapsed = (now - lastScrollTime) / 1000
    if (elapsed > 0 && elapsed < .3) {
      const speed = Math.abs(scrollY - lastScrollY) / elapsed
      motion = Math.max(motion, smooth(30, 1200, speed) * .45)
    }
    lastScrollY = scrollY; lastScrollTime = now
    schedule()
  }
  const state = new MutationObserver(schedule)
  state.observe(section, { attributes: true, attributeFilter: ['class', 'data-active-step', 'style'] })
  state.observe(document.body, { attributes: true, attributeFilter: ['class'] })
  if (menu) state.observe(menu, { attributes: true, attributeFilter: ['open'] })
  window.addEventListener('scroll', scroll, { passive: true, signal })
  window.addEventListener('resize', schedule, { passive: true, signal })
  document.addEventListener('visibilitychange', schedule, { signal })
  reduced.addEventListener('change', schedule, { signal })
  mobile.addEventListener('change', schedule, { signal })
  schedule()

  return () => {
    disposed = true
    controller.abort()
    state.disconnect()
    cancelAnimationFrame(frame); cancelAnimationFrame(updateFrame)
    air.destroy()
    layer.remove()
  }
}
