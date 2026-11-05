import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createTidalSpatialField } from './tidal-spatial-field.js'
import { initWorkWaterAtmosphere } from './work-water-atmosphere.js'

gsap.registerPlugin(ScrollTrigger)

const clamp = gsap.utils.clamp(0, 1)
const smooth = value => value * value * (3 - 2 * value)

/** The complete title shares the same submerged passage as the other titles. */
export function initSkillsCurrentTitle(section) {
  if (!section) return () => {}
  const voyage = section.querySelector('[data-skills-voyage]')
  const stage = section.querySelector('[data-skills-stage]')
  const first = section.querySelector('[data-skills-first]')
  const final = section.querySelector('[data-skills-final]')
  const canvas = section.querySelector('[data-skills-wave]')
  const cue = section.querySelector('[data-skills-cue]')
  if (!voyage || !stage || !first || !final || !canvas) return () => {}

  const destroyAtmosphere = initWorkWaterAtmosphere(section, {
    opening: stage, variant: 'selected', depthLinked: false,
  })
  const media = gsap.matchMedia()
  let disposed = false
  let refreshFrame = 0
  function requestRefresh() {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0
      if (!disposed) ScrollTrigger.refresh()
    })
  }

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const controller = new AbortController()
    const { signal } = controller
    const savedCueStyle = cue?.getAttribute('style')
    const savedProgress = section.style.getPropertyValue('--skills-current-progress')
    const savedPriority = section.style.getPropertyPriority('--skills-current-progress')
    const hadCurrent = section.classList.contains('is-skills-current')
    const state = { progress: 0 }
    let active = true

    const field = createTidalSpatialField({
      stage, canvas,
      runs: [first, final.querySelector('[data-skills-amp]'), final.querySelector('[data-skills-tools]')],
    })
    section.classList.add('is-skills-current')

    function render() {
      if (!active) return
      const progress = clamp(state.progress)
      field.render(progress)
      section.style.setProperty('--skills-current-progress', progress.toFixed(4))
      if (cue) cue.style.opacity = (1 - smooth(clamp((progress - .25) / .2))).toFixed(4)
    }

    function measure() {
      if (!active) return
      field.measure()
      render()
    }

    measure()
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: 'skills-current-title', trigger: voyage, start: 'top top',
        end: () => `+=${Math.max(1, voyage.clientHeight - stage.clientHeight)}`,
        scrub: .6, invalidateOnRefresh: true,
        onRefreshInit: measure, onRefresh: render,
      },
    }).fromTo(state, { progress: 0 }, {
      progress: 1, duration: 1, ease: 'none', immediateRender: false, onUpdate: render,
    })

    field.ready.then(() => {
      if (active && !disposed) render()
    })
    window.addEventListener('resize', requestRefresh, { signal, passive: true })
    document.fonts?.addEventListener('loadingdone', requestRefresh, { signal })
    document.fonts?.ready.then(() => { if (active && !disposed) requestRefresh() })
    requestRefresh()

    return () => {
      active = false
      controller.abort()
      timeline.scrollTrigger?.kill()
      timeline.kill()
      field.destroy()
      if (cue) {
        if (savedCueStyle === null) cue.removeAttribute('style')
        else cue.setAttribute('style', savedCueStyle)
      }
      if (savedProgress) section.style.setProperty('--skills-current-progress', savedProgress, savedPriority)
      else section.style.removeProperty('--skills-current-progress')
      if (!hadCurrent) section.classList.remove('is-skills-current')
      if (!disposed) requestRefresh()
    }
  })

  return () => {
    disposed = true
    media.revert()
    destroyAtmosphere()
    cancelAnimationFrame(refreshFrame)
  }
}
