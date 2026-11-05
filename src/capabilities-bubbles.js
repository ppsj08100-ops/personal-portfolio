import './capabilities-bubbles.css'

// Fixed circles follow long, repeatable paths; no scroll or frame noise alters them.
const PROFILES = [
  { x: -5, size: 4, duration: 34000, phase: .11, drift: -3, opacity: .46 },
  { x: 104, size: 6, duration: 38000, phase: .46, drift: 4, opacity: .50 },
  { x: 4, size: 8, duration: 36000, phase: .72, drift: -6, opacity: .44 },
  { x: 96, size: 11, duration: 42000, phase: .28, drift: 5, opacity: .45 },
  { x: -1, size: 5, duration: 40000, phase: .38, drift: -4, opacity: .48 },
  { x: 108, size: 9, duration: 32000, phase: .82, drift: -5, opacity: .42 },
  { x: 8, size: 3, duration: 30000, phase: .55, drift: -7, opacity: .52 },
  { x: 101, size: 12, duration: 44000, phase: .63, drift: 6, opacity: .42 },
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
    Object.assign(element.style, { left: `${profile.x}%`, width: `${profile.size}px`, height: `${profile.size}px` })
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
    const height = artwork.clientHeight
    if (!height) return sync()
    bubbles.forEach(record => {
      const { element, profile } = record
      const keyframes = [0, .12, .5, .86, 1].map((progress, index) => ({
        offset: progress,
        transform: `translate3d(${profile.drift * Math.sin(progress * Math.PI / 2)}px, ${height * (.90 - progress * .62)}px, 0)`,
        opacity: index === 0 || index === 4 ? 0 : profile.opacity,
      }))
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
