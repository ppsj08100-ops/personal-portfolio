const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value))
const smooth = value => { const x = clamp(value); return x * x * (3 - 2 * x) }
const DURATION = 2600

/** Scroll sends a shallow shoreline wave sideways, then lets it recede. */
export function createApproachWaveEdge(section) {
  if (!section) return () => {}
  const edges = [...section.querySelectorAll('.design-process__wave')]
  if (!edges.length) return () => {}
  const journey = section.querySelector('[data-approach-journey]') || section
  const stage = section.querySelector('[data-approach-stage]') || journey
  const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  const { signal } = controller
  const texture = new Image()
  const surfaces = edges.map(edge => {
    const canvas = document.createElement('canvas')
    canvas.className = 'design-process__wave-canvas'
    canvas.setAttribute('aria-hidden', 'true')
    edge.append(canvas)
    return { edge, scene: edge.closest('[data-approach-scene]'), canvas, context: canvas.getContext('2d'), width: 0, height: 0, dpr: 1 }
  })
  let destroyed = false
  let ready = false
  let frame = 0
  let pulses = []
  let lastPulse = -Infinity
  let previousY = window.scrollY
  let previousX = stage.scrollLeft
  let visible = false
  let geometryDirty = true

  function inViewport() {
    const rect = journey.getBoundingClientRect()
    return rect.bottom > 0 && rect.top < window.innerHeight
  }

  function measure() {
    if (!geometryDirty) return
    for (const surface of surfaces) {
      const rect = surface.edge.getBoundingClientRect()
      const width = Math.max(1, rect.width)
      const height = Math.max(1, rect.height)
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5, 1500 / height)
      if (width !== surface.width || height !== surface.height || dpr !== surface.dpr) {
        surface.width = width
        surface.height = height
        surface.dpr = dpr
        surface.canvas.width = Math.ceil(width * dpr)
        surface.canvas.height = Math.ceil(height * dpr)
      }
    }
    geometryDirty = false
  }

  function washAt(now) {
    // Smooth acceleration and a longer, slower recession. No vertical motion.
    let calm = 1
    for (const pulse of pulses) {
      const age = (now - pulse) / DURATION
      const envelope = age < .3 ? smooth(age / .3) : 1 - smooth((age - .3) / .7)
      calm *= 1 - envelope * .94
    }
    return 1 - calm
  }

  function paint(wash) {
    if (!ready || destroyed) return
    measure()
    for (const { edge, scene, canvas, context, width, height, dpr } of surfaces) {
      if (!context) continue
      if (wash > 0 && scene?.style.visibility === 'hidden') continue
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      context.clearRect(0, 0, width, height)
      // All scenes share the same wash, so a chapter crossfade never restarts it.
      const amount = Math.min(38, width * .18)
      const rows = Math.min(320, Math.ceil(height / 4))
      context.globalAlpha = .42 + wash * .45
      context.imageSmoothingEnabled = true
      for (let row = 0; row < rows; row++) {
        const position = row / rows
        // Align adjoining slices to physical pixels without painting alpha twice.
        const y = Math.floor(row * canvas.height / rows) / dpr
        const bottom = Math.floor((row + 1) * canvas.height / rows) / dpr
        const sourceY = y / (canvas.height / dpr) * texture.naturalHeight
        const sourceHeight = (bottom - y) / (canvas.height / dpr) * texture.naturalHeight
        // A broad, coherent bend lets foam at different heights arrive naturally.
        const reach = .88 + .12 * Math.sin(position * Math.PI * 2 - .6)
        const bend = Math.sin(position * Math.PI * 3 + wash * 1.1) * wash * Math.min(3, width * .018)
        const x = width * .1 - amount * wash * reach + bend
        context.drawImage(texture, 0, sourceY, texture.naturalWidth, sourceHeight,
          x, y, width * (.96 + .025 * wash), bottom - y)
      }
      context.globalAlpha = 1
      edge.classList.add('is-flow-ready')
    }
  }

  function stop() {
    cancelAnimationFrame(frame)
    frame = 0
    pulses = []
    lastPulse = -Infinity
  }

  function tick(now) {
    frame = 0
    if (destroyed || !ready || !visible || document.hidden || motion.matches) return
    pulses = pulses.filter(start => now - start < DURATION)
    paint(washAt(now))
    if (pulses.length) frame = requestAnimationFrame(tick)
  }

  function queue() {
    if (!frame && ready && visible && !document.hidden && !motion.matches) frame = requestAnimationFrame(tick)
  }

  function sendWave() {
    if (!ready || !visible || document.hidden || motion.matches) return
    const now = performance.now()
    // Coalesce wheel/touch events into broad waves, rather than jittering per event.
    if (now - lastPulse >= 700) {
      pulses.push(now)
      pulses = pulses.slice(-3)
      lastPulse = now
    }
    queue()
  }

  function onScroll() {
    const y = window.scrollY
    const x = stage.scrollLeft
    const moved = Math.abs(y - previousY) + Math.abs(x - previousX) > .5
    previousY = y
    previousX = x
    visible = inViewport()
    if (!visible) { stop(); return }
    if (moved) sendWave()
  }

  function resize() {
    geometryDirty = true
    visible = inViewport()
    if (ready) paint(motion.matches ? 0 : washAt(performance.now()))
    queue()
  }

  function onMotionChange() {
    stop()
    lastPulse = -Infinity
    if (ready) paint(0)
  }

  function onVisibilityChange() {
    stop()
    previousY = window.scrollY
    previousX = stage.scrollLeft
    if (!document.hidden && ready) { visible = inViewport(); paint(0) }
  }

  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver(entries => {
    if (destroyed) return
    const entry = entries.find(item => item.target === journey)
    if (!entry) return
    const entered = !visible && entry.isIntersecting
    visible = entry.isIntersecting
    if (!visible) { stop(); if (ready) paint(0) }
    else if (entered) sendWave()
  }) : null
  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null
  for (const edge of edges) resizeObserver?.observe(edge)
  observer?.observe(journey)
  window.addEventListener('scroll', onScroll, { signal, passive: true })
  stage.addEventListener('scroll', onScroll, { signal, passive: true })
  window.addEventListener('resize', resize, { signal, passive: true })
  document.addEventListener('visibilitychange', onVisibilityChange, { signal })
  motion.addEventListener('change', onMotionChange)
  texture.addEventListener('load', () => {
    if (destroyed) return
    ready = true
    visible = inViewport()
    paint(0)
  }, { signal, once: true })
  texture.src = '/images/approach-shore-wave.png'

  return () => {
    if (destroyed) return
    destroyed = true
    stop()
    controller.abort()
    observer?.disconnect()
    resizeObserver?.disconnect()
    motion.removeEventListener('change', onMotionChange)
    for (const { edge, canvas } of surfaces) {
      canvas.remove()
      edge.classList.remove('is-flow-ready')
    }
  }
}
