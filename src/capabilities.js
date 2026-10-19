export function initCapabilities(section) {
  if (!section) return () => {}

  const controller = new AbortController()
  const { signal } = controller
  const elements = [...section.querySelectorAll('[data-capabilities-reveal]')]
  const image = section.querySelector('.capabilities__mirror-frame')
  const artwork = section.querySelector('.capabilities__artwork')
  function hideFailedArtwork() {
    if (artwork) artwork.hidden = true
  }
  image?.addEventListener('error', hideFailedArtwork, { signal })
  if (image?.complete && !image.naturalWidth) hideFailedArtwork()

  if (!('IntersectionObserver' in window)) return () => controller.abort()

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let revealObserver

  function configure() {
    revealObserver?.disconnect()
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
  }
  reducedMotion.addEventListener('change', configure, { signal })
  configure()

  return () => {
    controller.abort()
    revealObserver?.disconnect()
    section.classList.remove('is-motion-ready')
    elements.forEach(element => element.classList.remove('is-revealed'))
  }
}
