export function initIntroduction(section) {
  if (!section || !('IntersectionObserver' in window)) return () => {}

  const elements = [...section.querySelectorAll('[data-introduction-reveal]')]
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  let observer

  function revealAll() {
    observer?.disconnect()
    section.classList.remove('is-motion-ready')
    elements.forEach((element) => element.classList.add('is-revealed'))
  }

  function observe() {
    observer?.disconnect()
    if (reducedMotion.matches) {
      revealAll()
      return
    }

    const pending = elements.filter((element) => !element.classList.contains('is-revealed'))
    if (!pending.length) return
    section.classList.add('is-motion-ready')
    observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return
        entry.target.classList.add('is-revealed')
        observer.unobserve(entry.target)
      })
      if (elements.every((element) => element.classList.contains('is-revealed'))) observer.disconnect()
    }, { rootMargin: `0px 0px -${Math.round(innerHeight * .1)}px 0px`, threshold: 0 })
    pending.forEach((element) => observer.observe(element))
  }

  reducedMotion.addEventListener('change', observe, { signal: controller.signal })
  window.addEventListener('resize', observe, { signal: controller.signal })
  observe()

  return () => {
    observer?.disconnect()
    controller.abort()
    section.classList.remove('is-motion-ready')
    elements.forEach((element) => element.classList.remove('is-revealed'))
  }
}
