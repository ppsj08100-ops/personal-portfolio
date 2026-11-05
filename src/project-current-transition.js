import './project-current-transition.css'

// INTRO stays in place while an opaque 01 is revealed from the right.
// A plain vertical clip has the same x at every height, with no painted rim.
export function initProjectCurrentTransition(stage, pages) {
  if (!stage || pages.length < 2) return { render() {}, reset() {}, destroy() {} }
  const motion = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  let position = 0
  let active = false

  function reset() {
    if (!active) return
    active = false
    stage.classList.remove('is-project-current-active')
    for (const page of pages.slice(0, 2)) page.style.removeProperty('--current-page-x')
    pages[1].style.removeProperty('clip-path')
  }

  function render(value, pageWidth = stage.clientWidth) {
    position = value
    if (motion.matches || value <= .0001 || value >= .9999) {
      reset()
      return
    }
    active = true
    stage.classList.add('is-project-current-active')
    pages[0].style.setProperty('--current-page-x', `${value * pageWidth}px`)
    pages[1].style.setProperty('--current-page-x', `${(value - 1) * pageWidth}px`)
    const edge = (1.07 - value * 1.14) * 100
    pages[1].style.clipPath = `inset(0 0 0 ${edge.toFixed(6)}%)`
  }

  const resize = new ResizeObserver(() => { if (active) render(position, stage.clientWidth) })
  resize.observe(stage)
  motion.addEventListener('change', reset, { signal: controller.signal })

  return {
    render,
    reset,
    destroy() {
      reset()
      resize.disconnect()
      controller.abort()
    },
  }
}
