import { initInsightOceanZoom } from './insight-ocean-zoom.js'

export function initInsightReveal(section) {
  if (!section || !('IntersectionObserver' in window)) return () => {}

  const heading = section.querySelector('.insight-section__title')
  const currentLetter = heading.querySelector('[data-current-letter]')
  const scene = section.closest('#app')
  const currentPlane = scene?.querySelector('.ocean-transition')
  const typeMeasure = document.createElement('canvas').getContext('2d')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  let observer
  let revealed = false
  let alignFrame

  function alignCurrent() {
    if (!currentLetter || !currentPlane || !typeMeasure || controller.signal.aborted) return
    const style = getComputedStyle(currentLetter)
    typeMeasure.font = `${style.fontWeight} ${style.fontSize} ${style.fontFamily}`
    const ink = typeMeasure.measureText('D')
    const range = document.createRange()
    range.selectNodeContents(currentLetter)
    const letterBox = range.getBoundingClientRect()
    const headingBox = heading.getBoundingClientRect()
    const planeBox = currentPlane.getBoundingClientRect()
    // A font's DOM box includes leading and side bearings. Align the actual
    // painted D, so neither a gap nor a sideways kink appears at the join.
    const ascent = ink.fontBoundingBoxAscent ?? parseFloat(style.fontSize) * .928
    const capTop = letterBox.top + ascent - ink.actualBoundingBoxAscent
    const stemLeft = letterBox.left - ink.actualBoundingBoxLeft
    scene.style.setProperty('--post-hero-type-offset', `${(capTop - headingBox.top).toFixed(3)}px`)
    scene.style.setProperty('--post-hero-shift-x', `${(stemLeft - planeBox.left - planeBox.width * 605 / 2011).toFixed(3)}px`)
  }

  function queueAlignment() {
    cancelAnimationFrame(alignFrame)
    alignFrame = requestAnimationFrame(alignCurrent)
  }

  const typeObserver = new ResizeObserver(queueAlignment)
  typeObserver.observe(heading)
  document.fonts.ready.then(queueAlignment)
  document.fonts.addEventListener('loadingdone', queueAlignment, { signal: controller.signal })
  queueAlignment()

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
  window.addEventListener('resize', () => {
    queueAlignment()
    observe()
  }, { signal: controller.signal })
  observe()

  const destroyOceanZoom = initInsightOceanZoom(section)

  return () => {
    destroyOceanZoom()
    observer?.disconnect()
    typeObserver.disconnect()
    cancelAnimationFrame(alignFrame)
    controller.abort()
    section.classList.remove('is-motion-ready', 'is-revealed')
    scene?.style.removeProperty('--post-hero-type-offset')
    scene?.style.removeProperty('--post-hero-shift-x')
  }
}
