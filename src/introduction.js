export function initIntroduction(section) {
  const content = section?.querySelector('[data-introduction-reveal]')
  if (!content || !('IntersectionObserver' in window)) return () => {}

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  let observer
  let revealed = false

  function reveal() {
    revealed = true
    content.classList.add('is-revealed')
    observer?.disconnect()
  }

  function observe() {
    observer?.disconnect()
    if (reducedMotion.matches || revealed) {
      reveal()
      return
    }
    section.classList.add('is-motion-ready')
    observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) reveal()
    }, { rootMargin: '0px 0px -24px 0px', threshold: .15 })
    observer.observe(content)
  }

  reducedMotion.addEventListener('change', observe, { signal: controller.signal })
  observe()

  return () => {
    observer?.disconnect()
    controller.abort()
    section.classList.remove('is-motion-ready')
    content.classList.remove('is-revealed')
  }
}
