import './capabilities-bubbles.css'

// Three close releases share each frame joint; the other two are isolated air.
// Only the emission points rotate with the mirror. Buoyancy stays screen-up.
const PROFILES = [
  { angle: 135, size: 4, duration: 9100, phase: .00, drift: -18, opacity: .52 },
  { angle: 134, size: 6.5, duration: 9100, phase: .05, drift: -26, opacity: .63 },
  { angle: 136, size: 4.5, duration: 9100, phase: .10, drift: -14, opacity: .48 },
  { angle: -25, size: 7.5, duration: 11200, phase: .52, drift: 19, opacity: .58 },
  { angle: -26, size: 4, duration: 11200, phase: .57, drift: 28, opacity: .44 },
  { angle: -24, size: 5.5, duration: 11200, phase: .62, drift: 13, opacity: .60 },
  { angle: 82, size: 10.5, duration: 10300, phase: .34, drift: 23, opacity: .46 },
  { angle: 153, size: 4, duration: 7800, phase: .76, drift: -29, opacity: .50 },
]

export function initCapabilitiesBubbles(section) {
  const artwork = section?.querySelector('.capabilities__artwork')
  const image = artwork?.querySelector('.capabilities__mirror-frame')
  if (!artwork || !image || !Element.prototype.animate) return () => {}
  const controller = new AbortController()
  const { signal } = controller
  const reduced = matchMedia('(prefers-reduced-motion: reduce)')
  const mobile = matchMedia('(max-width: 599px)')
  const menu = document.querySelector('#portfolio-menu')
  const layer = document.createElement('div')
  layer.className = 'capabilities__bubbles'
  layer.setAttribute('aria-hidden', 'true')
  artwork.append(layer)
  const bubbles = PROFILES.map(profile => {
    const element = document.createElement('span')
    element.className = 'capabilities__bubble'
    element.dataset.size = String(profile.size)
    Object.assign(element.style, { width: `${profile.size}px`, height: `${profile.size}px` })
    layer.append(element)
    return { element, profile, animation: null }
  })
  let destroyed = false
  const bounds = artwork.getBoundingClientRect()
  let visible = bounds.bottom > 0 && bounds.top < innerHeight

  function canRun() {
    return !destroyed && visible && !reduced.matches && !document.hidden && !artwork.hidden
      && artwork.clientHeight > 0 && image.complete && image.naturalWidth > 0
      && !menu?.open && !document.body.classList.contains('has-menu-open') && !section.closest('[inert]')
      && (!section.classList.contains('is-current-linked') || section.classList.contains('is-current-landed'))
  }

  function sync() {
    if (destroyed) return
    const running = canRun()
    const count = mobile.matches ? 4 : bubbles.length
    layer.dataset.motionState = running ? 'running' : reduced.matches ? 'reduced' : 'paused'
    layer.dataset.bubbleCount = String(count)
    bubbles.forEach(({ animation }, index) => {
      if (!animation) return
      if (running && index < count) animation.play()
      else animation.pause()
    })
  }

  function resize() {
    if (destroyed) return
    const width = artwork.clientWidth
    const height = artwork.clientHeight
    if (!width || !height) return sync()
    const bounds = artwork.getBoundingClientRect()
    const degrees = Number.parseFloat(getComputedStyle(section).getPropertyValue('--mirror-rest-angle'))
    const rotation = (Number.isFinite(degrees) ? degrees : 0) * Math.PI / 180
    const cos = Math.cos(rotation)
    const sin = Math.sin(rotation)
    bubbles.forEach(record => {
      const { element, profile } = record
      const angle = profile.angle * Math.PI / 180
      const localX = width * .38 * Math.cos(angle)
      const localY = height * .40 * Math.sin(angle)
      const anchorX = width / 2 + localX * cos - localY * sin
      const anchorY = height / 2 + localX * sin + localY * cos
      element.style.left = `${anchorX - profile.size / 2}px`
      element.style.top = `${anchorY - profile.size / 2}px`
      const room = profile.drift < 0
        ? bounds.left + anchorX - profile.size / 2 - 10
        : innerWidth - 10 - (bounds.left + anchorX + profile.size / 2)
      const drift = Math.sign(profile.drift) * Math.min(Math.abs(profile.drift), Math.max(0, room))
      const rise = Math.min(height * (profile.angle < 0 ? .32 : .46), 410)
      const keyframes = [
        { offset: 0, transform: 'translate3d(0,0,0)', opacity: 0 },
        { offset: .035, transform: `translate3d(${drift * .035}px,${-rise * .05}px,0)`, opacity: profile.opacity * .7 },
        { offset: .13, transform: `translate3d(${drift * .23}px,${-rise * .23}px,0)`, opacity: profile.opacity },
        { offset: .40, transform: `translate3d(${drift * .76}px,${-rise * .77}px,0)`, opacity: profile.opacity * .76 },
        { offset: .58, transform: `translate3d(${drift}px,${-rise}px,0)`, opacity: 0 },
        { offset: 1, transform: `translate3d(${drift}px,${-rise}px,0)`, opacity: 0 },
      ]
      if (record.animation) {
        const time = record.animation.currentTime
        record.animation.effect.setKeyframes(keyframes)
        record.animation.currentTime = time
      } else {
        record.animation = element.animate(keyframes, { duration: profile.duration, iterations: Infinity, easing: 'linear', fill: 'both' })
        record.animation.pause()
        record.animation.currentTime = profile.duration * profile.phase
      }
    })
    sync()
  }

  const intersection = new IntersectionObserver(entries => {
    visible = entries.some(entry => entry.isIntersecting)
    sync()
  }, { threshold: [0, .01] })
  intersection.observe(artwork)
  const resizeObserver = new ResizeObserver(resize)
  resizeObserver.observe(artwork)
  const mutation = new MutationObserver(sync)
  mutation.observe(section, { attributes: true, attributeFilter: ['class', 'inert', 'hidden'] })
  mutation.observe(artwork, { attributes: true, attributeFilter: ['class', 'hidden'] })
  for (let ancestor = section.parentElement; ancestor; ancestor = ancestor.parentElement) {
    mutation.observe(ancestor, { attributes: true,
      attributeFilter: ancestor === document.body ? ['class', 'inert', 'hidden'] : ['inert', 'hidden'] })
  }
  if (menu) mutation.observe(menu, { attributes: true, attributeFilter: ['open'] })
  reduced.addEventListener('change', sync, { signal })
  mobile.addEventListener('change', resize, { signal })
  document.addEventListener('visibilitychange', sync, { signal })
  image.addEventListener('load', resize, { signal })
  image.addEventListener('error', sync, { signal })
  resize()

  return () => {
    destroyed = true
    controller.abort()
    intersection.disconnect()
    resizeObserver.disconnect()
    mutation.disconnect()
    bubbles.forEach(({ animation }) => animation?.cancel())
    layer.remove()
  }
}
