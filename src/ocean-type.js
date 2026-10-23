import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createOceanEntrySurface } from './ocean-entry-surface.js'

gsap.registerPlugin(ScrollTrigger)

// The surface is a quiet pause before immersion. Its own swells keep the sky
// steady; the following descent owns camera movement and the entry runway.
export function initOceanType(section) {
  const stage = section?.querySelector('.ocean-type__stage')
  const heading = section?.querySelector('.ocean-type__text')
  if (!stage || !heading) return () => {}

  const media = gsap.matchMedia()
  let destroyed = false
  let refreshLayout = () => {}

  media.add('(prefers-reduced-motion: no-preference) and (min-height: 700px)', () => {
    section.classList.add('is-tidal')
    const destroySurface = createOceanEntrySurface(section.querySelector('.ocean-entry__scene'))
    let disposed = false
    let frame = 0
    let observedSize = ''

    function measure() {
      const height = stage.clientHeight
      const phone = stage.clientWidth < 768
      section.style.setProperty('--ocean-type-runway', `${Math.round(height * (phone ? .5 : .65))}px`)
      observedSize = `${stage.clientWidth}:${height}`
    }

    function render(trigger) {
      section.dataset.entryProgress = trigger.progress.toFixed(4)
    }

    measure()
    const scroll = ScrollTrigger.create({
      id: 'work-tidal-type',
      trigger: section,
      refreshPriority: -10,
      start: 'top top',
      end: () => `+=${parseFloat(section.style.getPropertyValue('--ocean-type-runway')) || 0}`,
      invalidateOnRefresh: true,
      onRefreshInit: measure,
      onRefresh: render,
      onUpdate: render,
    })
    render(scroll)

    refreshLayout = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        frame = 0
        if (!disposed) ScrollTrigger.refresh(true)
      })
    }
    const dimensions = new ResizeObserver(() => {
      const size = `${stage.clientWidth}:${stage.clientHeight}`
      if (size !== observedSize) refreshLayout()
    })
    dimensions.observe(stage)

    return () => {
      disposed = true
      dimensions.disconnect()
      cancelAnimationFrame(frame)
      refreshLayout = () => {}
      scroll.kill()
      destroySurface()
      section.classList.remove('is-tidal')
      section.style.removeProperty('--ocean-type-runway')
      delete section.dataset.entryProgress
    }
  })

  document.fonts.ready.then(() => { if (!destroyed) refreshLayout() })
  return () => {
    destroyed = true
    media.revert()
  }
}
