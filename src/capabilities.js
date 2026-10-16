export function initCapabilities(section) {
  if (!section) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const elements = [...section.querySelectorAll('[data-capabilities-reveal]')]
  const image = section.querySelector('.capabilities__arch')
  const artwork = section.querySelector('.capabilities__artwork')
  function hideFailedArtwork() {
    if (artwork) artwork.hidden = true
  }
  image?.addEventListener('error', hideFailedArtwork, { signal })
  if (image?.complete && !image.naturalWidth) hideFailedArtwork()

  if (!('IntersectionObserver' in window)) return () => controller.abort()

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const desktopPointer = matchMedia('(min-width: 992px) and (hover: hover) and (pointer: fine)')
  let frame = 0
  let inView = false
  let revealObserver

  function updateParallax() {
    frame = 0
    if (!image || !inView || reducedMotion.matches || !desktopPointer.matches) return
    const rect = section.getBoundingClientRect()
    const progress = (innerHeight / 2 - (rect.top + rect.height / 2)) / (innerHeight + rect.height)
    // At most 12px in either direction. No scale, rotation, or continuous loop.
    image.style.setProperty('--arch-offset', `${Math.max(-12, Math.min(12, progress * 24)).toFixed(2)}px`)
  }

  function requestUpdate() {
    if (!frame && inView && !reducedMotion.matches && desktopPointer.matches) frame = requestAnimationFrame(updateParallax)
  }

  function configure() {
    revealObserver?.disconnect()
    cancelAnimationFrame(frame)
    frame = 0
    image?.style.removeProperty('--arch-offset')
    if (reducedMotion.matches) {
      section.classList.remove('is-motion-ready')
      elements.forEach(element => element.classList.add('is-revealed'))
      return
    }
    section.classList.add('is-motion-ready')
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        revealObserver.unobserve(entry.target)
      })
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0 })
    elements.filter(element => !element.classList.contains('is-revealed')).forEach(element => revealObserver.observe(element))
    requestUpdate()
  }

  const visibilityObserver = new IntersectionObserver(entries => {
    inView = entries.some(entry => entry.isIntersecting)
    if (inView) requestUpdate()
    else {
      cancelAnimationFrame(frame)
      frame = 0
    }
  })
  visibilityObserver.observe(section)
  window.addEventListener('scroll', requestUpdate, { passive: true, signal })
  window.addEventListener('resize', requestUpdate, { passive: true, signal })
  reducedMotion.addEventListener('change', configure, { signal })
  desktopPointer.addEventListener('change', configure, { signal })
  configure()

  return () => {
    controller.abort()
    cancelAnimationFrame(frame)
    revealObserver?.disconnect()
    visibilityObserver.disconnect()
    image?.style.removeProperty('--arch-offset')
    section.classList.remove('is-motion-ready')
    elements.forEach(element => element.classList.remove('is-revealed'))
  }
}
