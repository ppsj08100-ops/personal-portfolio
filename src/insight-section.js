export function initInsightReveal(section) {
  if (!section || !('IntersectionObserver' in window)) return () => {}

  const heading = section.querySelector('.insight-section__title')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  let observer
  let revealed = false

  function reveal() {
    revealed = true
    section.classList.add('is-revealed')
    observer?.disconnect()
  }

  function observe() {
    observer?.disconnect()
    if (revealed) return
    if (reducedMotion.matches) {
      reveal()
      return
    }
    section.classList.add('is-motion-ready')
    // Match the reference's "top 85%" trigger with a one-time word reveal.
    observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) reveal()
    }, { rootMargin: `0px 0px -${innerHeight * 0.15}px 0px`, threshold: 0 })
    observer.observe(heading)
  }

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) {
      section.classList.remove('is-motion-ready')
      reveal()
    }
  }, { signal: controller.signal })
  window.addEventListener('resize', observe, { signal: controller.signal })
  observe()

  return () => {
    observer?.disconnect()
    controller.abort()
    section.classList.remove('is-motion-ready', 'is-revealed')
  }
}
