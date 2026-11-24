import './process-abyss-atmosphere.css'

const seed = index => { const value = Math.sin(index * 127.1 + 73.7) * 43758.5453; return value - Math.floor(value) }

/** A single background current accompanies the seven existing archive pages. */
export function initProcessAbyssAtmosphere(chapter) {
  const stage = chapter?.querySelector(':scope > .project-details__stage')
  if (!stage || !Element.prototype.animate || !('IntersectionObserver' in window)) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const document = stage.ownerDocument
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const mobile = matchMedia('(max-width: 899px)')
  const menu = document.querySelector('#portfolio-menu')
  const layer = document.createElement('div')
  layer.className = 'process-abyss-atmosphere'
  layer.setAttribute('aria-hidden', 'true')
  const light = document.createElement('div')
  light.className = 'process-abyss-atmosphere__light'
  layer.append(light)
  stage.prepend(layer)

  const glow = light.animate([
    { transform: 'translate3d(-1.5%, 1%, 0)', opacity: .3 },
    { transform: 'translate3d(1.2%, -1.2%, 0)', opacity: .52, offset: .52 },
    { transform: 'translate3d(-1.5%, 1%, 0)', opacity: .3 },
  ], { duration: 22000, iterations: Infinity, easing: 'ease-in-out' })
  glow.pause()
  glow.currentTime = 3800

  const motes = Array.from({ length: 20 }, (_, index) => {
    const element = document.createElement('span')
    element.className = 'process-abyss-atmosphere__mote'
    const size = .6 + seed(index + 11) * .9
    Object.assign(element.style, {
      left: `${4 + seed(index + 31) * 92}%`,
      width: `${size}px`, height: `${size}px`,
    })
    layer.append(element)
    const duration = 20000 + seed(index + 51) * 18000
    const animation = element.animate([], { duration, iterations: Infinity, easing: 'linear' })
    animation.pause()
    animation.currentTime = duration * seed(index + 71)
    return {
      element, animation,
      drift: (seed(index + 91) * 2 - 1) * 22,
      opacity: .12 + seed(index + 111) * .23,
    }
  })
  let disposed = false
  const bounds = stage.getBoundingClientRect()
  let visible = bounds.height > 0 && bounds.width > 0 && bounds.bottom > 0 && bounds.top < innerHeight

  function setRunning(animation, running) {
    if (running && animation.playState !== 'running') animation.play()
    else if (!running && animation.playState !== 'paused') animation.pause()
  }

  function sync() {
    if (disposed) return
    const running = visible && chapter.classList.contains('is-project-paged')
      && chapter.classList.contains('has-process-exhibition') && !chapter.hidden
      && !chapter.closest('[inert]') && !reduced.matches && !document.hidden
      && !menu?.open && !document.body.classList.contains('has-menu-open')
    const count = mobile.matches ? 12 : motes.length
    layer.dataset.motionState = running ? 'running' : reduced.matches ? 'reduced' : 'paused'
    layer.dataset.moteCount = String(count)
    setRunning(glow, running)
    motes.forEach(({ animation }, index) => setRunning(animation, running && index < count))
  }

  function resize() {
    if (disposed) return
    // The stage remains measurable when reduced motion hides the new layer.
    const rise = Math.max(1, stage.clientHeight)
    for (const { animation, drift, opacity } of motes) {
      const currentTime = animation.currentTime
      animation.effect.setKeyframes([
        { transform: 'translate3d(0,0,0)', opacity: 0 },
        { transform: `translate3d(${drift * .12}px,${-rise * .12}px,0)`, opacity, offset: .12 },
        { transform: `translate3d(${drift * .76}px,${-rise * .76}px,0)`, opacity: opacity * .84, offset: .76 },
        { transform: `translate3d(${drift}px,${-rise}px,0)`, opacity: 0 },
      ])
      animation.currentTime = currentTime
    }
    sync()
  }

  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    sync()
  })
  intersection.observe(stage)
  const dimensions = new ResizeObserver(resize)
  dimensions.observe(stage)
  const state = new MutationObserver(sync)
  state.observe(chapter, { attributes: true, attributeFilter: ['class', 'hidden', 'inert'] })
  state.observe(document.body, { attributes: true, attributeFilter: ['class', 'inert'] })
  if (menu) state.observe(menu, { attributes: true, attributeFilter: ['open'] })
  reduced.addEventListener('change', resize, { signal })
  mobile.addEventListener('change', resize, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  resize()

  return () => {
    if (disposed) return
    disposed = true
    controller.abort()
    intersection.disconnect()
    dimensions.disconnect()
    state.disconnect()
    glow.cancel()
    motes.forEach(({ animation }) => animation.cancel())
    layer.remove()
  }
}
