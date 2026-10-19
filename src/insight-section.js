export function initInsightReveal(section) {
  if (!section || !('IntersectionObserver' in window)) return () => {}

  const heading = section.querySelector('.insight-section__title')
  const currentLetter = heading.querySelector('[data-current-letter]')
  const scene = section.closest('#app')
  const currentPlane = scene?.querySelector('.ocean-transition')
  const typeMeasure = document.createElement('canvas').getContext('2d')
  const clam = section.querySelector('.insight-clam')
  const clamTrigger = clam?.querySelector('.insight-clam__trigger')
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)')
  const controller = new AbortController()
  let observer
  let clamObserver
  let revealed = false
  let opened = false
  let textureReady = false
  let openFrame
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

  function openClam() {
    if (opened) return
    opened = true
    clamObserver?.disconnect()
    // Paint the closed pose before opening, including on direct anchor visits.
    openFrame = requestAnimationFrame(() => {
      openFrame = requestAnimationFrame(() => clam?.classList.add('is-open'))
    })
  }

  function observeClam() {
    clamObserver?.disconnect()
    if (!clamTrigger || opened || !textureReady) return
    if (reducedMotion.matches) {
      openClam()
      return
    }
    // Watch the closed shell's body, rather than the empty area above its lid.
    clamObserver = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting && entry.intersectionRatio >= .6)) openClam()
    }, { rootMargin: `0px 0px -${innerHeight * .08}px 0px`, threshold: .6 })
    clamObserver.observe(clamTrigger)
  }

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
      openClam()
    }
  }, { signal: controller.signal })
  window.addEventListener('resize', () => {
    queueAlignment()
    observe()
    observeClam()
  }, { signal: controller.signal })
  observe()

  if (clam) {
    if (reducedMotion.matches) {
      openClam()
    } else {
      clam.classList.add('is-motion-ready')
      const texturePaths = new Set(Array.from(clam.querySelectorAll('image'), image => image.getAttribute('href')))
      Promise.all(Array.from(texturePaths, path => {
        const texture = new Image()
        texture.src = path
        return texture.decode()
      })).then(() => {
        if (controller.signal.aborted) return
        textureReady = true
        observeClam()
      }).catch(() => {
        if (!controller.signal.aborted) openClam()
      })
    }
  }

  return () => {
    observer?.disconnect()
    clamObserver?.disconnect()
    typeObserver.disconnect()
    cancelAnimationFrame(alignFrame)
    cancelAnimationFrame(openFrame)
    controller.abort()
    clam?.classList.remove('is-motion-ready', 'is-open')
    section.classList.remove('is-motion-ready', 'is-revealed')
    scene?.style.removeProperty('--post-hero-type-offset')
    scene?.style.removeProperty('--post-hero-shift-x')
  }
}
