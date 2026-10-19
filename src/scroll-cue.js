import { startDiveFoam } from './dive-foam.js'
import { initDiveBubbles } from './dive-bubbles.js'

export function initScrollCue(root = document) {
  const controller = new AbortController()
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  let activeDive = null
  const destroyBubbles = []

  reducedMotion.addEventListener('change', () => {
    if (reducedMotion.matches) activeDive?.stop(true)
  }, { signal: controller.signal })

  root.querySelectorAll('[data-scroll-next]').forEach((link) => {
    destroyBubbles.push(initDiveBubbles(link))
    link.addEventListener('click', (event) => {
      // Retain native anchor behaviour for modified clicks and new tabs.
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
      const target = document.getElementById(link.hash.slice(1))
      if (!target) return

      event.preventDefault()
      if (activeDive) return
      if (!reducedMotion.matches) {
        activeDive = startDiveFoam(link, target, () => { activeDive = null })
        if (activeDive) return
      }
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
    activeDive?.stop()
    destroyBubbles.forEach(destroy => destroy())
  }
}
