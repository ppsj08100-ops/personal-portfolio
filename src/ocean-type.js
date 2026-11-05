import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createTidalSpatialField } from './tidal-spatial-field.js'
import { initWorkWaterAtmosphere } from './work-water-atmosphere.js'

gsap.registerPlugin(ScrollTrigger)

const clamp = gsap.utils.clamp(0, 1)
const smooth = value => value * value * (3 - 2 * value)

// Keep the introduction's existing clock: the first project's descent chains
// from work-tidal-type.end. Only the title/water field owns the glyph motion.
export function initOceanType(section) {
  const opening = section?.querySelector('.ocean-type__opening')
  const stage = section?.querySelector('.ocean-type__title-stage')
  const canvas = stage?.querySelector('[data-work-title-wave]')
  const runs = [...section?.querySelectorAll('[data-work-title-run]') || []]
  const caption = stage?.querySelector('.ocean-entry__caption')
  if (!opening || !stage || !canvas || !runs.length) return () => {}

  const destroyAtmosphere = initWorkWaterAtmosphere(section, { opening: stage, variant: 'selected' })

  const media = gsap.matchMedia()
  let destroyed = false
  let refreshFrame = 0
  function requestRefresh() {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0
      if (!destroyed) ScrollTrigger.refresh()
    })
  }

  media.add({ motion: '(prefers-reduced-motion: no-preference)', tall: '(min-height: 700px)' }, context => {
    if (!context.conditions.motion) return
    const controller = new AbortController()
    const { signal } = controller
    const tall = context.conditions.tall
    const mode = tall ? 'is-tidal' : 'is-native-wave'
    const hadMode = section.classList.contains(mode)
    const originalRunway = section.style.getPropertyValue('--ocean-type-runway')
    const originalPriority = section.style.getPropertyPriority('--ocean-type-runway')
    const originalProgress = section.dataset.entryProgress
    const captionStyle = caption?.getAttribute('style')
    const state = { progress: 0 }
    let active = true
    let observedSize = ''
    section.classList.add(mode)
    const field = createTidalSpatialField({ stage, canvas, runs })

    function render() {
      if (!active) return
      const progress = clamp(state.progress)
      section.dataset.entryProgress = progress.toFixed(4)
      field.render(progress)
      if (caption) caption.style.opacity = (1 - smooth(clamp((progress - .25) / .2))).toFixed(4)
    }
    function measure() {
      if (!active) return
      if (tall) section.style.setProperty('--ocean-type-runway', `${Math.round(stage.clientHeight * 1.2)}px`)
      observedSize = `${stage.clientWidth}:${stage.clientHeight}`
      field.measure()
      render()
    }
    measure()
    const animation = gsap.timeline({
      scrollTrigger: {
        id: tall ? 'work-tidal-type' : 'work-tidal-native',
        trigger: tall ? section : opening, refreshPriority: -10,
        start: 'top top',
        end: tall ? () => `+=${parseFloat(section.style.getPropertyValue('--ocean-type-runway')) || 1}` : 'bottom bottom',
        scrub: .6, invalidateOnRefresh: true,
        onRefreshInit: measure, onRefresh: render,
      },
    }).fromTo(state, { progress: 0 }, {
      progress: 1, duration: 1, ease: 'none', immediateRender: false, onUpdate: render,
    })
    const dimensions = new ResizeObserver(() => {
      if (`${stage.clientWidth}:${stage.clientHeight}` !== observedSize) requestRefresh()
    })
    dimensions.observe(stage)
    field.ready.then(() => { if (active && !destroyed) measure() })
    document.fonts?.addEventListener('loadingdone', requestRefresh, { signal })
    document.fonts?.ready.then(() => { if (active && !destroyed) requestRefresh() })
    requestRefresh()

    return () => {
      active = false
      controller.abort()
      dimensions.disconnect()
      animation.scrollTrigger?.kill()
      animation.kill()
      field.destroy()
      if (!hadMode) section.classList.remove(mode)
      if (originalRunway) section.style.setProperty('--ocean-type-runway', originalRunway, originalPriority)
      else section.style.removeProperty('--ocean-type-runway')
      if (originalProgress === undefined) delete section.dataset.entryProgress
      else section.dataset.entryProgress = originalProgress
      if (caption) {
        if (captionStyle === null) caption.removeAttribute('style')
        else caption.setAttribute('style', captionStyle)
      }
      if (!destroyed) requestRefresh()
    }
  })

  return () => {
    destroyed = true
    media.revert()
    destroyAtmosphere()
    cancelAnimationFrame(refreshFrame)
  }
}
