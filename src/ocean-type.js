import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './selected-title-type.css'
import { createPearlTitleMaterial } from './pearl-title-material.js'

gsap.registerPlugin(ScrollTrigger)
const clamp = gsap.utils.clamp(0, 1)
const smooth = value => { const t = clamp(value); return t * t * (3 - 2 * t) }

// Preserve the first project's clock while the complete title travels left.
export function initOceanType(section) {
  const opening = section?.querySelector('.ocean-type__opening')
  const stage = section?.querySelector('.ocean-type__title-stage')
  const runs = [...section?.querySelectorAll('[data-work-title-run]') || []]
  const title = stage?.querySelector('.ocean-type__text')
  const caption = stage?.querySelector('.ocean-entry__caption')
  if (!opening || !stage || !title || !runs.length) return () => {}

  const hadEditorial = section.classList.contains('is-editorial-type')
  section.classList.add('is-editorial-type')
  const material = createPearlTitleMaterial({ stage, runs })
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
    if (!context.conditions.motion) { stage.dataset.typeMotion = 'static'; return }
    const controller = new AbortController()
    const { signal } = controller
    const tall = context.conditions.tall
    const mode = tall ? 'is-tidal' : 'is-native-wave'
    const hadMode = section.classList.contains(mode)
    const originalRunway = section.style.getPropertyValue('--ocean-type-runway')
    const originalPriority = section.style.getPropertyPriority('--ocean-type-runway')
    const originalProgress = section.dataset.entryProgress
    const styles = [title, caption, ...runs].filter(Boolean).map(element => [element, element.getAttribute('style')])
    const state = { progress: 0 }
    let active = true, observedSize = '', travelDistance = 0
    section.classList.add(mode)

    function render() {
      if (!active) return
      const p = clamp(state.progress)
      const travel = smooth((p - .15) / .85)
      section.dataset.entryProgress = p.toFixed(4)
      stage.dataset.typeProgress = p.toFixed(4)
      stage.dataset.typeMotion = 'scroll'
      title.style.translate = `${-travelDistance * travel}px 0px`
      title.style.opacity = String(1 - smooth((p - .94) / .06))
      if (caption) caption.style.opacity = String(1 - smooth((p - .5) / .35))
      material.render(p)
    }
    function measure() {
      if (!active) return
      if (tall) section.style.setProperty('--ocean-type-runway', `${Math.round(stage.clientHeight * 1.2)}px`)
      // Refresh against the centered title, never its current travelling box.
      title.style.translate = '0px 0px'
      const titleBox = title.getBoundingClientRect()
      const stageBox = stage.getBoundingClientRect()
      travelDistance = Math.max(0, titleBox.right - stageBox.left + stageBox.width * .09)
      observedSize = `${stage.clientWidth}:${stage.clientHeight}`
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
    document.fonts?.addEventListener('loadingdone', requestRefresh, { signal })
    document.fonts?.ready.then(() => { if (active && !destroyed) requestRefresh() })
    requestRefresh()

    return () => {
      active = false
      controller.abort()
      dimensions.disconnect()
      animation.scrollTrigger?.kill()
      animation.kill()
      if (!hadMode) section.classList.remove(mode)
      if (originalRunway) section.style.setProperty('--ocean-type-runway', originalRunway, originalPriority)
      else section.style.removeProperty('--ocean-type-runway')
      if (originalProgress === undefined) delete section.dataset.entryProgress
      else section.dataset.entryProgress = originalProgress
      for (const [element, style] of styles) {
        if (style === null) element.removeAttribute('style')
        else element.setAttribute('style', style)
      }
      if (!destroyed) requestRefresh()
    }
  })

  return () => {
    destroyed = true
    media.revert()
    material.destroy()
    if (!hadEditorial) section.classList.remove('is-editorial-type')
    delete stage.dataset.typeProgress
    delete stage.dataset.typeMotion
    cancelAnimationFrame(refreshFrame)
  }
}
