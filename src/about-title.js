import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { createTidalSpatialField } from './tidal-spatial-field.js'
import { initWorkWaterAtmosphere } from './work-water-atmosphere.js'

gsap.registerPlugin(ScrollTrigger)

const clamp = gsap.utils.clamp(0, 1)
const smooth = value => value * value * (3 - 2 * value)

/** Keep the original voyage clock while the complete title passes through water. */
export function initAboutTitle(section) {
  if (!section) return () => {}
  const voyage = section.querySelector('[data-about-voyage]')
  const stage = section.querySelector('[data-about-stage]')
  const first = section.querySelector('[data-about-first]')
  const final = section.querySelector('[data-about-final]')
  const canvas = section.querySelector('[data-about-wave]')
  const cue = section.querySelector('.about-title__cue')
  const cardsViewport = document.querySelector('#capability-cards')?.closest('.capability-scene__viewport')
  if (!voyage || !stage || !first || !final || !canvas) return () => {}

  const destroyAtmosphere = initWorkWaterAtmosphere(section, {
    opening: stage, variant: 'selected', depthLinked: false,
  })
  const media = gsap.matchMedia()
  let disposed = false
  let refreshFrame = 0
  function refreshLayout() {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0
      if (!disposed) ScrollTrigger.refresh()
    })
  }

  media.add('(prefers-reduced-motion: no-preference)', () => {
    const controller = new AbortController()
    const { signal } = controller
    const hadVoyage = section.classList.contains('is-voyage')
    const cueStyle = cue?.getAttribute('style')
    const originalProgress = section.style.getPropertyValue('--about-wave-progress')
    const originalPriority = section.style.getPropertyPriority('--about-wave-progress')
    const hadHandoff = cardsViewport?.classList.contains('has-about-wave-handoff')
    const originalFeather = cardsViewport?.style.getPropertyValue('--about-handoff-feather')
    const originalFeatherPriority = cardsViewport?.style.getPropertyPriority('--about-handoff-feather')
    const state = { progress: 0 }
    let active = true

    section.classList.add('is-voyage')
    cardsViewport?.classList.add('has-about-wave-handoff')
    const field = createTidalSpatialField({ stage, canvas, runs: [first, final] })

    function paintHandoff() {
      if (!active || !cardsViewport) return
      // Fade only the incoming top edge. As its own card viewport reaches the
      // top and pins, the feather becomes zero, leaving every later header and
      // control fully visible throughout the existing four-card sequence.
      const distance = Math.max(0, cardsViewport.getBoundingClientRect().top)
      const feather = Math.min(stage.clientHeight * .18, distance * .32)
      cardsViewport.style.setProperty('--about-handoff-feather', `${feather.toFixed(2)}px`)
    }
    function render() {
      if (!active) return
      const progress = clamp(state.progress)
      field.render(progress)
      section.style.setProperty('--about-wave-progress', progress.toFixed(4))
      if (cue) cue.style.opacity = (1 - smooth(clamp((progress - .25) / .2))).toFixed(4)
      paintHandoff()
    }
    function measure() {
      if (!active) return
      field.measure()
      render()
    }

    measure()
    const timeline = gsap.timeline({
      scrollTrigger: {
        id: 'about-title', trigger: voyage, start: 'top top',
        end: () => `+=${Math.max(1, voyage.clientHeight - stage.clientHeight)}`,
        scrub: .6, invalidateOnRefresh: true,
        onRefreshInit: measure, onRefresh: render,
      },
    }).fromTo(state, { progress: 0 }, {
      progress: 1, duration: 1, ease: 'none', immediateRender: false, onUpdate: render,
    })
    const handoff = cardsViewport && ScrollTrigger.create({
      id: 'about-card-handoff', trigger: cardsViewport,
      start: 'top bottom', end: 'top top', refreshPriority: -40,
      onUpdate: paintHandoff, onRefresh: paintHandoff,
    })

    field.ready.then(() => { if (active && !disposed) measure() })
    window.addEventListener('resize', refreshLayout, { signal, passive: true })
    document.fonts?.addEventListener('loadingdone', refreshLayout, { signal })
    document.fonts?.ready.then(() => { if (active && !disposed) refreshLayout() })
    refreshLayout()

    return () => {
      active = false
      controller.abort()
      timeline.scrollTrigger?.kill()
      timeline.kill()
      handoff?.kill()
      field.destroy()
      if (!hadVoyage) section.classList.remove('is-voyage')
      if (cue) {
        if (cueStyle === null) cue.removeAttribute('style')
        else cue.setAttribute('style', cueStyle)
      }
      if (originalProgress) section.style.setProperty('--about-wave-progress', originalProgress, originalPriority)
      else section.style.removeProperty('--about-wave-progress')
      if (cardsViewport) {
        if (!hadHandoff) cardsViewport.classList.remove('has-about-wave-handoff')
        if (originalFeather) cardsViewport.style.setProperty('--about-handoff-feather', originalFeather, originalFeatherPriority)
        else cardsViewport.style.removeProperty('--about-handoff-feather')
      }
      if (!disposed) refreshLayout()
    }
  })

  return () => {
    disposed = true
    media.revert()
    destroyAtmosphere()
    cancelAnimationFrame(refreshFrame)
  }
}
