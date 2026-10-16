function initCueLighting(link, reducedMotion, signal) {
  const arrow = link.querySelector('.hero__scroll-arrow-light')
  const masks = [...link.querySelectorAll('.hero__scroll-arrow-tail, .hero__scroll-arrow-tint, .hero__scroll-arrow-core')]
  if (!arrow || masks.length !== 3 || !arrow.animate) return () => {}

  const hoverPointer = matchMedia('(hover: hover) and (pointer: fine)')
  let animations = []
  let revision = 0
  let pointerInside = false
  let active = false

  function reset() {
    revision += 1
    animations.forEach(animation => animation.cancel())
    animations = []
    arrow.style.removeProperty('opacity')
    masks.forEach(mask => mask.style.removeProperty('mask-position'))
  }

  function start(restart = false) {
    if (active && !restart) return
    reset()
    active = true
    arrow.style.opacity = '1'
    if (reducedMotion.matches) {
      masks.forEach(mask => { mask.style.maskPosition = '50% 25%' })
      return
    }
    // Blue shoulders, a white reflection and a soft blue tail share one moving band.
    // Both ends are transparent, so the loop resets outside the visible stroke.
    animations = masks.map(mask => mask.animate([
      { maskPosition: '50% 50%' }, { maskPosition: '50% -12.5%' },
    ], { duration: 2800, iterations: Infinity, easing: 'linear' }))
  }

  function stop() {
    if (!active) return
    active = false
    const currentRevision = ++revision
    // Freeze the current light and fade its wrapper without changing the base line.
    animations.forEach(animation => animation.pause())
    if (reducedMotion.matches) {
      reset()
      return
    }
    const fade = arrow.animate([
      { opacity: getComputedStyle(arrow).opacity }, { opacity: 0 },
    ], { duration: 300, easing: 'ease-out', fill: 'forwards' })
    animations.push(fade)
    fade.finished.then(() => {
      if (revision === currentRevision && !active) reset()
    }).catch(() => {}) // Re-entry/HMR cancels the old fade; it must not reset a new sequence.
  }

  function update(restart = false) {
    const wantsLight = (pointerInside && hoverPointer.matches) || link.matches(':focus-visible')
    if (wantsLight) start(restart)
    else if (reducedMotion.matches) { active = false; reset() }
    else stop()
  }
  link.classList.add('is-scroll-motion-ready')
  link.addEventListener('pointerenter', event => {
    pointerInside = event.pointerType !== 'touch'
    update()
  }, { signal })
  link.addEventListener('pointerleave', () => { pointerInside = false; update() }, { signal })
  link.addEventListener('pointercancel', () => { pointerInside = false; update() }, { signal })
  link.addEventListener('focus', () => update(), { signal })
  link.addEventListener('blur', () => update(), { signal })
  hoverPointer.addEventListener('change', () => update(), { signal })
  reducedMotion.addEventListener('change', () => update(true), { signal })
  pointerInside = hoverPointer.matches && link.matches(':hover')
  update()

  return () => {
    reset()
    link.classList.remove('is-scroll-motion-ready')
  }
}

export function initScrollCue(root = document) {
  const controller = new AbortController()
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const lightingCleanups = []

  root.querySelectorAll('[data-scroll-next]').forEach((link) => {
    lightingCleanups.push(initCueLighting(link, reducedMotion, controller.signal))
    link.addEventListener('click', (event) => {
      // Retain native anchor behaviour for modified clicks and new tabs.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = document.getElementById(link.hash.slice(1))
      if (!target) return

      event.preventDefault()
      // Move keyboard focus without jumping before the smooth scroll starts.
      target.focus({ preventScroll: true })
      target.scrollIntoView({
        behavior: reducedMotion.matches ? 'instant' : 'smooth',
        block: 'start',
      })
    }, { signal: controller.signal })
  })

  return () => {
    controller.abort()
    lightingCleanups.forEach(cleanup => cleanup())
  }
}
