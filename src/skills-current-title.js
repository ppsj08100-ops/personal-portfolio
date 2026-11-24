import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import './skills-title-type.css'

gsap.registerPlugin(ScrollTrigger)

const clamp = value => Math.max(0, Math.min(1, value))
const smooth = (start, end, value) => {
  const p = clamp((value - start) / (end - start))
  return p * p * (3 - 2 * p)
}

/** Hold one complete line for reading, then carry it left into the next scene. */
export function initSkillsCurrentTitle(section) {
  if (!section) return () => {}
  const voyage = section.querySelector('[data-skills-voyage]')
  const stage = section.querySelector('[data-skills-stage]')
  if (!voyage || !stage) return () => {}

  const media = gsap.matchMedia()
  const hadType = section.classList.contains('has-skills-typography')
  const originalVariant = stage.dataset.backgroundVariant
  const properties = ['--skills-current-progress', '--skills-type-copy-opacity',
    '--skills-type-copy-x', '--skills-type-cue-opacity']
  const originals = properties.map(name => [name, section.style.getPropertyValue(name), section.style.getPropertyPriority(name)])
  section.classList.add('has-skills-typography')
  stage.dataset.backgroundVariant = 'typography'
  let disposed = false, refreshFrame = 0
  function requestRefresh() {
    cancelAnimationFrame(refreshFrame)
    refreshFrame = requestAnimationFrame(() => {
      refreshFrame = 0
      if (!disposed) ScrollTrigger.refresh()
    })
  }

  media.add({ moving: '(prefers-reduced-motion: no-preference)', still: '(prefers-reduced-motion: reduce)' }, context => {
    const moving = context.conditions.moving
    const controller = new AbortController()
    const { signal } = controller
    const hadCurrent = section.classList.contains('is-skills-current')
    const state = { progress: 0 }
    let active = true
    section.classList.toggle('is-skills-current', moving)

    function render() {
      if (!active) return
      const p = clamp(state.progress)
      section.style.setProperty('--skills-current-progress', p.toFixed(4))
      section.style.setProperty('--skills-type-copy-opacity', String(moving ? 1 - smooth(.94, 1, p) : 1))
      section.style.setProperty('--skills-type-copy-x', `${moving ? -(stage.clientWidth + 24) * smooth(.15, 1, p) : 0}px`)
      section.style.setProperty('--skills-type-cue-opacity', String(moving ? 1 - smooth(.48, .75, p) : 1))
      stage.dataset.typographyProgress = p.toFixed(4)
    }
    const timeline = moving ? gsap.timeline({
      scrollTrigger: {
        id: 'skills-current-title', trigger: voyage, start: 'top top',
        end: () => `+=${Math.max(1, voyage.clientHeight - stage.clientHeight)}`,
        scrub: .5, invalidateOnRefresh: true,
        onRefresh: render,
      },
    }).to(state, { progress: 1, duration: 1, ease: 'none', onUpdate: render }) : null
    window.addEventListener('resize', requestRefresh, { signal, passive: true })
    document.fonts?.addEventListener('loadingdone', requestRefresh, { signal })
    document.fonts?.ready.then(() => { if (active && !disposed) requestRefresh() })
    render()
    requestRefresh()

    return () => {
      active = false
      controller.abort()
      timeline?.scrollTrigger?.kill()
      timeline?.kill()
      section.classList.toggle('is-skills-current', hadCurrent)
      if (!disposed) requestRefresh()
    }
  })

  return () => {
    disposed = true
    media.revert()
    cancelAnimationFrame(refreshFrame)
    if (!hadType) section.classList.remove('has-skills-typography')
    if (originalVariant === undefined) delete stage.dataset.backgroundVariant
    else stage.dataset.backgroundVariant = originalVariant
    delete stage.dataset.typographyProgress
    originals.forEach(([name, value, priority]) => {
      if (value) section.style.setProperty(name, value, priority)
      else section.style.removeProperty(name)
    })
  }
}
